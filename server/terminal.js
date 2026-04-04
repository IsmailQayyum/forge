import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import pty from "node-pty";

// Active terminal sessions
const terminals = new Map();

// Resolve claude binary path at startup
let CLAUDE_PATH = "claude";
try {
  CLAUDE_PATH = execSync("which claude", { encoding: "utf8" }).trim();
} catch {
  // Try common locations
  const candidates = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    path.join(os.homedir(), ".npm-global/bin/claude"),
    path.join(os.homedir(), ".claude/local/claude"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { CLAUDE_PATH = c; break; }
  }
}

/**
 * Spawn a new Claude Code session in a PTY.
 */
export function spawnTerminal({ cwd, args = [], terminalId, shell }) {
  const id = terminalId || `term-${Date.now()}`;

  // Clone env and remove Claude Code nesting protection vars
  const env = { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE;
  delete env.CLAUDE_SESSION_ID;
  delete env.CLAUDE_HOOK_TYPE;

  // Allow spawning claude (default) or any other shell
  const bin = shell || CLAUDE_PATH;
  const finalArgs = args.length > 0 ? args : [];

  const ptyProcess = pty.spawn(bin, finalArgs, {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: cwd || os.homedir(),
    env,
  });

  const termEntry = {
    id,
    pty: ptyProcess,
    clients: new Set(),
    cwd: cwd || os.homedir(),
    createdAt: Date.now(),
    pid: ptyProcess.pid,
    outputBuffer: [],      // stores last N lines for agent output capture
    maxBuffer: 500,
    onExitCallbacks: [],   // callbacks when terminal exits
  };

  terminals.set(id, termEntry);

  ptyProcess.onData((data) => {
    // Buffer output for agent capture
    termEntry.outputBuffer.push(data);
    if (termEntry.outputBuffer.length > termEntry.maxBuffer) {
      termEntry.outputBuffer.shift();
    }
    // Fire data callbacks (used by run engine for activity tracking)
    if (termEntry.onDataCallbacks) {
      for (const cb of termEntry.onDataCallbacks) {
        try { cb(id, data); } catch {}
      }
    }
    for (const ws of termEntry.clients) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "TERMINAL_OUTPUT", terminalId: id, data }));
      }
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    // Fire exit callbacks (used by run engine)
    for (const cb of termEntry.onExitCallbacks) {
      try { cb(id, exitCode, termEntry.outputBuffer.join("")); } catch {}
    }
    for (const ws of termEntry.clients) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "TERMINAL_EXIT", terminalId: id, exitCode }));
      }
    }
    terminals.delete(id);
  });

  return { terminalId: id, pid: ptyProcess.pid };
}

export function writeToTerminal(terminalId, data) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  entry.pty.write(data);
  return true;
}

export function resizeTerminal(terminalId, cols, rows) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  entry.pty.resize(cols, rows);
  return true;
}

export function attachClient(terminalId, ws) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  entry.clients.add(ws);
  return true;
}

export function detachClient(terminalId, ws) {
  const entry = terminals.get(terminalId);
  if (!entry) return;
  entry.clients.delete(ws);
}

export function killTerminal(terminalId) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  entry.pty.kill();
  terminals.delete(terminalId);
  return true;
}

export function getTerminals() {
  return Array.from(terminals.entries()).map(([id, entry]) => ({
    id,
    cwd: entry.cwd,
    pid: entry.pid,
    createdAt: entry.createdAt,
    clients: entry.clients.size,
  }));
}

export function detachClientFromAll(ws) {
  for (const entry of terminals.values()) {
    entry.clients.delete(ws);
  }
}

export function getTerminalBuffer(terminalId) {
  const entry = terminals.get(terminalId);
  if (!entry) return "";
  return entry.outputBuffer.join("");
}

export function onTerminalExit(terminalId, callback) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  entry.onExitCallbacks.push(callback);
  return true;
}

export function onTerminalData(terminalId, callback) {
  const entry = terminals.get(terminalId);
  if (!entry) return false;
  if (!entry.onDataCallbacks) entry.onDataCallbacks = [];
  entry.onDataCallbacks.push(callback);
  return true;
}
