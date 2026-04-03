import fs from "fs";
import path from "path";
import os from "os";
import chokidar from "chokidar";

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const FORGE_INPUT_DIR = path.join(os.homedir(), ".claude", "forge", "inputs");

// In-memory session state
const sessions = new Map();

function getSessionId(filePath) {
  // ~/.claude/projects/<project-hash>/sessions/<session-id>.jsonl
  return path.basename(filePath, ".jsonl");
}

function getProjectName(filePath) {
  const parts = filePath.split(path.sep);
  const projectIdx = parts.indexOf("projects");
  if (projectIdx === -1) return "unknown";
  const encodedName = parts[projectIdx + 1];
  // Decode: folder name is the path with '/' replaced by '-'
  // e.g. -Users-ismailqayyum-Documents-work-build → build
  const decoded = encodedName.replace(/^-/, "/").replace(/-/g, "/");
  return path.basename(decoded) || encodedName.split("-").pop() || "unknown";
}

function isRootSessionFile(filePath) {
  // Only watch JSONL files directly inside a project folder
  // Structure: ~/.claude/projects/<project>/<session-id>.jsonl
  // NOT: ~/.claude/projects/<project>/<session-id>/subagents/agent-xxx.jsonl
  const parts = filePath.split(path.sep);
  const projectIdx = parts.indexOf("projects");
  if (projectIdx === -1) return false;
  // Root session files are exactly 2 levels deep after 'projects'
  // projects/<project>/<session>.jsonl → depth = 2
  return parts.length === projectIdx + 3;
}

function loadSubAgents(sessionId, projectFolder) {
  const subagentsDir = path.join(projectFolder, sessionId, "subagents");
  if (!fs.existsSync(subagentsDir)) return [];
  return fs.readdirSync(subagentsDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => {
      const agentId = f.replace(".jsonl", "");
      return {
        id: agentId,
        description: agentId.replace("agent-", "").slice(0, 20),
        status: "done",
        ts: fs.statSync(path.join(subagentsDir, f)).mtimeMs,
      };
    });
}

function parseEntry(line) {
  try {
    return JSON.parse(line.trim());
  } catch {
    return null;
  }
}

function processEntry(sessionId, projectName, entry, broadcast) {
  if (!entry || !entry.type) return;

  const session = sessions.get(sessionId) || {
    id: sessionId,
    project: projectName,
    status: "active",
    startedAt: Date.now(),
    messages: [],
    toolCalls: [],
    subAgents: [],
    tokenUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    waitingForInput: false,
  };

  switch (entry.type) {
    case "assistant": {
      const content = entry.message?.content || [];
      for (const block of content) {
        if (block.type === "text") {
          session.messages.push({
            id: `${sessionId}-${Date.now()}`,
            role: "assistant",
            text: block.text,
            ts: entry.timestamp || Date.now(),
          });
          broadcast("SESSION_MESSAGE", { sessionId, message: session.messages.at(-1) });

          // Detect if agent is asking a question (waiting for input)
          if (block.text.includes("?") || /should i|do you want|which|please (confirm|specify|provide)/i.test(block.text)) {
            session.waitingForInput = true;
            broadcast("SESSION_WAITING", { sessionId, message: block.text, project: projectName });
          }
        }

        if (block.type === "tool_use") {
          const toolCall = {
            id: block.id,
            name: block.name,
            input: block.input,
            ts: entry.timestamp || Date.now(),
            status: "running",
          };
          session.toolCalls.push(toolCall);
          session.status = "active";
          session.waitingForInput = false;
          broadcast("TOOL_CALL", { sessionId, toolCall, project: projectName });

          // Detect sub-agent spawn
          if (block.name === "Task" || block.name === "Agent") {
            const subAgent = {
              id: block.id,
              description: block.input?.description || block.input?.prompt?.slice(0, 60) || "Sub-agent",
              status: "running",
              ts: Date.now(),
            };
            session.subAgents.push(subAgent);
            broadcast("SUBAGENT_SPAWNED", { sessionId, subAgent, project: projectName });
          }
        }
      }

      // Token usage
      if (entry.message?.usage) {
        const u = entry.message.usage;
        session.tokenUsage.input += u.input_tokens || 0;
        session.tokenUsage.output += u.output_tokens || 0;
        session.tokenUsage.cacheRead += u.cache_read_input_tokens || 0;
        session.tokenUsage.cacheWrite += u.cache_creation_input_tokens || 0;
        broadcast("TOKEN_USAGE", { sessionId, usage: session.tokenUsage });
      }
      break;
    }

    case "user": {
      const content = entry.message?.content || [];
      for (const block of content) {
        if (block.type === "tool_result") {
          // Mark tool call as complete
          const tc = session.toolCalls.find((t) => t.id === block.tool_use_id);
          if (tc) {
            tc.status = "done";
            broadcast("TOOL_CALL_DONE", { sessionId, toolCallId: block.tool_use_id });
          }
        }
        if (block.type === "text" && block.text) {
          session.messages.push({
            id: `${sessionId}-user-${Date.now()}`,
            role: "user",
            text: block.text,
            ts: entry.timestamp || Date.now(),
          });
          session.waitingForInput = false;
        }
      }
      break;
    }

    case "result": {
      session.status = entry.subtype === "error" ? "error" : "done";
      broadcast("SESSION_STATUS", { sessionId, status: session.status, project: projectName });
      break;
    }
  }

  sessions.set(sessionId, session);
  broadcast("SESSION_UPDATE", { sessionId, session });
}

// How recently a file must have been modified to be considered "active"
const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function getSessionStatus(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const age = Date.now() - stat.mtimeMs;
    if (age < ACTIVE_THRESHOLD_MS) return "active";
    return "done";
  } catch {
    return "done";
  }
}

function watchFile(filePath, broadcast) {
  if (!isRootSessionFile(filePath)) return; // skip sub-agent files

  const sessionId = getSessionId(filePath);
  const projectName = getProjectName(filePath);
  const projectFolder = path.dirname(filePath);
  const initialStatus = getSessionStatus(filePath);

  // Read existing content
  let offset = 0;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    for (const line of lines) {
      const entry = parseEntry(line);
      processEntry(sessionId, projectName, entry, () => {}); // silent init
    }
    offset = content.length;

    // Set accurate initial status based on file mtime
    const session = sessions.get(sessionId);
    if (session) {
      session.status = initialStatus;

      // Check if last entry was a "result" type (session completed)
      const lastLine = lines.at(-1);
      if (lastLine) {
        const lastEntry = parseEntry(lastLine);
        if (lastEntry?.type === "result") {
          session.status = "done";
        }
      }

      // Load sub-agents from subagents/ directory
      const subAgents = loadSubAgents(sessionId, projectFolder);
      if (subAgents.length > 0) {
        session.subAgents = subAgents;
      }

      sessions.set(sessionId, session);
    }
    broadcast("SESSION_DISCOVERED", { sessionId, session: sessions.get(sessionId) });
  } catch {}

  // Watch for new lines
  const watcher = fs.watchFile(filePath, { interval: 300 }, () => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const newContent = content.slice(offset);
      if (!newContent.trim()) return;
      offset = content.length;

      const lines = newContent.split("\n").filter(Boolean);
      for (const line of lines) {
        const entry = parseEntry(line);
        processEntry(sessionId, projectName, entry, broadcast);
      }
    } catch {}
  });
}

export const sessionWatcher = {
  start(broadcast) {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
      console.log("No Claude projects directory found — waiting for sessions...");
      return;
    }

    fs.mkdirSync(FORGE_INPUT_DIR, { recursive: true });

    // Watch for new session files
    chokidar
      .watch(path.join(CLAUDE_PROJECTS_DIR, "**/*.jsonl"), {
        ignoreInitial: false,
        depth: 2, // only: projects/<project>/<session>.jsonl
        ignored: /subagents|tool-results/, // never recurse into sub-agent dirs
      })
      .on("add", (filePath) => watchFile(filePath, broadcast))
      .on("error", (err) => console.error("Session watcher error:", err));
  },

  getSessions() {
    return Array.from(sessions.values());
  },

  sendInput(sessionId, text) {
    // Write to a known input file that a Claude Code hook reads
    const inputFile = path.join(FORGE_INPUT_DIR, `${sessionId}.txt`);
    fs.writeFileSync(inputFile, text);
  },
};
