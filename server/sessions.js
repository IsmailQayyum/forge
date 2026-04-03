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
  const projectHash = parts[projectIdx + 1];
  // Try to resolve the project hash to a real path
  const metaPath = path.join(CLAUDE_PROJECTS_DIR, projectHash, "metadata.json");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      return meta.name || meta.path?.split("/").pop() || projectHash.slice(0, 8);
    } catch {}
  }
  return projectHash.slice(0, 8);
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

function watchFile(filePath, broadcast) {
  const sessionId = getSessionId(filePath);
  const projectName = getProjectName(filePath);

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
        depth: 4,
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
