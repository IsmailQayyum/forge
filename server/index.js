import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sessionWatcher } from "./sessions.js";
import { agentStore } from "./agents/store.js";
import { contextRouter } from "./routes/context.js";
import { integrationsRouter } from "./routes/integrations.js";
import { agentsRouter } from "./routes/agents.js";
import { sessionsRouter } from "./routes/sessions.js";
import { hooksRouter, setHooksBroadcast } from "./routes/hooks.js";
import { promptsRouter } from "./routes/prompts.js";
import { costsRouter } from "./routes/costs.js";
import { gitRouter } from "./routes/git.js";
import { claudemdRouter } from "./routes/claudemd.js";
import { registryRouter } from "./routes/registry.js";
import { workflowsRouter } from "./routes/workflows.js";
import { settingsRouter } from "./routes/settings.js";
import { integrationStore } from "./stores/integrations.js";
import { getQuickActions } from "./stores/quick-actions.js";
import { notificationsRouter } from "./routes/notifications.js";
import { notificationStore } from "./stores/notifications.js";
import {
  spawnTerminal, writeToTerminal, resizeTerminal,
  attachClient, detachClient, detachClientFromAll,
  killTerminal, getTerminals,
} from "./terminal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.FORGE_PORT || 3333;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// API routes (must come before static catch-all)
app.use("/api/context", contextRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/hooks", hooksRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api/costs", costsRouter);
app.use("/api/git", gitRouter);
app.use("/api/claudemd", claudemdRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/registry", registryRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/settings", settingsRouter);
app.get("/api/quick-actions", (_, res) => res.json(getQuickActions()));
app.get("/api/health", (_, res) => {
  const sessions = sessionWatcher.getSessions();
  const activeSessions = sessions.filter(s => s.status === "active").length;
  res.json({
    ok: true,
    version: "1.0.0",
    uptime: Math.floor(process.uptime()),
    sessions: { total: sessions.length, active: activeSessions },
    terminals: getTerminals().length,
    pid: process.pid,
  });
});

// Filesystem browse API
import fs from "fs";
import os from "os";
app.get("/api/fs/browse", (req, res) => {
  const dir = req.query.path || os.homedir();
  try {
    const resolved = path.resolve(dir.replace(/^~/, os.homedir()));
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith("."))
      .map(e => ({ name: e.name, path: path.join(resolved, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ current: resolved, parent: path.dirname(resolved), dirs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Recent projects (directories that have .git or CLAUDE.md)
app.get("/api/fs/projects", (req, res) => {
  const searchDirs = [
    os.homedir(),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Projects"),
    path.join(os.homedir(), "Developer"),
    path.join(os.homedir(), "Code"),
    path.join(os.homedir(), "code"),
    path.join(os.homedir(), "work"),
    path.join(os.homedir(), "Documents", "work"),
  ];
  const projects = [];
  for (const dir of searchDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const full = path.join(dir, e.name);
        const hasGit = fs.existsSync(path.join(full, ".git"));
        const hasClaude = fs.existsSync(path.join(full, "CLAUDE.md"));
        if (hasGit || hasClaude) {
          projects.push({ name: e.name, path: full, hasGit, hasClaude });
        }
      }
    } catch {}
  }
  // Deduplicate by path
  const seen = new Set();
  const unique = projects.filter(p => { if (seen.has(p.path)) return false; seen.add(p.path); return true; });
  res.json(unique.slice(0, 50));
});

// Terminal API
app.post("/api/terminal/spawn", (req, res) => {
  const { cwd, args, shell, initialPrompt, label } = req.body;
  try {
    const result = spawnTerminal({ cwd, args, shell });
    // Broadcast so all connected UIs (Messenger) pick up the new terminal
    broadcast("TERMINAL_SPAWNED", {
      terminalId: result.terminalId,
      pid: result.pid,
      cwd: cwd || os.homedir(),
      label: label || cwd?.split("/").pop() || "Session",
    });
    // If an initial prompt is provided, send it after Claude boots up
    if (initialPrompt && result.terminalId) {
      setTimeout(() => {
        writeToTerminal(result.terminalId, initialPrompt + "\n");
      }, 2500);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/terminal/list", (_, res) => {
  res.json({ terminals: getTerminals() });
});

app.post("/api/terminal/:id/kill", (req, res) => {
  killTerminal(req.params.id);
  res.json({ ok: true });
});

// Serve built frontend in production (catch-all last)
if (process.argv.includes("--serve")) {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_, res) => res.sendFile(path.join(distPath, "index.html")));
}

// WebSocket broadcast
export function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// WebSocket connection
wss.on("connection", (ws) => {
  // Send current state on connect
  const initPayload = {
    sessions: sessionWatcher.getSessions(),
    agents: agentStore.getAll(),
    terminals: getTerminals(),
  };

  // Add integration status from persisted tokens
  try {
    initPayload.integrations = integrationStore.getAll();
  } catch {}

  ws.send(JSON.stringify({
    type: "INIT",
    payload: initPayload,
    ts: Date.now(),
  }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(msg, ws);
    } catch {
      // ignore malformed messages
    }
  });

  ws.on("close", () => {
    detachClientFromAll(ws);
  });
});

function handleClientMessage(msg, ws) {
  switch (msg.type) {
    case "SESSION_INPUT":
      sessionWatcher.sendInput(msg.payload.sessionId, msg.payload.text);
      break;

    case "PING":
      ws.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
      break;

    // ── Terminal I/O ──
    case "TERMINAL_INPUT":
      writeToTerminal(msg.payload.terminalId, msg.payload.data);
      break;

    case "TERMINAL_RESIZE":
      resizeTerminal(msg.payload.terminalId, msg.payload.cols, msg.payload.rows);
      break;

    case "TERMINAL_ATTACH":
      attachClient(msg.payload.terminalId, ws);
      break;

    case "TERMINAL_DETACH":
      detachClient(msg.payload.terminalId, ws);
      break;
  }
}

// Wire broadcast to hooks, runner, and start session watcher
import { runManager } from "./agents/runner.js";
import { workflowDaemon } from "./agents/workflows.js";
import { costStore } from "./stores/costs.js";

// Wrap broadcast to auto-record costs on token usage events
function instrumentedBroadcast(type, payload) {
  broadcast(type, payload);

  // Auto-record costs when token usage is reported
  if (type === "TOKEN_USAGE" && payload?.sessionId && payload?.usage) {
    try {
      const session = sessionWatcher.getSessions().find(s => s.id === payload.sessionId);
      costStore.record(payload.sessionId, session?.project || "unknown", payload.usage);
    } catch {}
  }
}

setHooksBroadcast(instrumentedBroadcast);
runManager.setBroadcast(instrumentedBroadcast);
workflowDaemon.setBroadcast(instrumentedBroadcast);
sessionWatcher.start(instrumentedBroadcast);

server.listen(PORT, () => {
  console.log(`Forge server running on http://localhost:${PORT}`);
});
