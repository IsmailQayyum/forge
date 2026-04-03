import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { sessionWatcher } from "../sessions.js";
import { costStore } from "../stores/costs.js";

const NAMES_FILE = path.join(os.homedir(), ".claude", "forge", "session-names.json");

function loadNames() {
  try {
    if (fs.existsSync(NAMES_FILE)) return JSON.parse(fs.readFileSync(NAMES_FILE, "utf8"));
  } catch {}
  return {};
}

function saveNames(names) {
  fs.mkdirSync(path.dirname(NAMES_FILE), { recursive: true });
  fs.writeFileSync(NAMES_FILE, JSON.stringify(names, null, 2));
}

export const sessionsRouter = Router();

sessionsRouter.get("/", (req, res) => {
  const names = loadNames();
  const sessions = sessionWatcher.getSessions().map((s) => ({
    ...s,
    displayName: names[s.id] || s.project,
  }));

  // Record costs for all sessions with token usage
  for (const s of sessions) {
    if (s.tokenUsage && (s.tokenUsage.input > 0 || s.tokenUsage.output > 0)) {
      costStore.record(s.id, s.project, s.tokenUsage, s.startedAt);
    }
  }

  res.json(sessions);
});

// Search sessions by query
sessionsRouter.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  if (!q) return res.json([]);

  const names = loadNames();
  const sessions = sessionWatcher.getSessions();

  const results = sessions.filter((s) => {
    const name = (names[s.id] || s.project || "").toLowerCase();
    if (name.includes(q)) return true;

    // Search messages
    for (const msg of s.messages || []) {
      if (msg.text?.toLowerCase().includes(q)) return true;
    }

    // Search tool calls
    for (const tc of s.toolCalls || []) {
      if (tc.name?.toLowerCase().includes(q)) return true;
      const inputStr = JSON.stringify(tc.input || {}).toLowerCase();
      if (inputStr.includes(q)) return true;
    }

    return false;
  });

  res.json(results.map((s) => ({
    ...s,
    displayName: names[s.id] || s.project,
  })));
});

// Export session as markdown
sessionsRouter.get("/:id/export", (req, res) => {
  const sessions = sessionWatcher.getSessions();
  const session = sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const names = loadNames();
  const name = names[session.id] || session.project || session.id;

  let md = `# Session: ${name}\n\n`;
  md += `- **ID**: ${session.id}\n`;
  md += `- **Project**: ${session.project}\n`;
  md += `- **Status**: ${session.status}\n`;
  md += `- **Started**: ${new Date(session.startedAt).toISOString()}\n`;

  if (session.tokenUsage) {
    const u = session.tokenUsage;
    md += `- **Tokens**: ${u.input + u.output} (in: ${u.input}, out: ${u.output}, cache: ${u.cacheRead})\n`;
  }

  md += `\n---\n\n## Conversation\n\n`;

  // Interleave messages and tool calls by timestamp
  const events = [];
  for (const msg of session.messages || []) {
    events.push({ type: "message", ...msg });
  }
  for (const tc of session.toolCalls || []) {
    events.push({ type: "tool", ...tc });
  }
  events.sort((a, b) => a.ts - b.ts);

  for (const e of events) {
    if (e.type === "message") {
      const role = e.role === "assistant" ? "**Claude**" : "**You**";
      md += `### ${role}\n\n${e.text}\n\n`;
    } else if (e.type === "tool") {
      const input = typeof e.input === "object"
        ? Object.values(e.input)[0]
        : JSON.stringify(e.input);
      const preview = typeof input === "string" ? input.slice(0, 200) : String(input).slice(0, 200);
      md += `> **Tool: ${e.name}** — \`${preview}\`\n\n`;
    }
  }

  if (session.subAgents?.length > 0) {
    md += `\n## Sub-agents\n\n`;
    for (const sa of session.subAgents) {
      md += `- ${sa.description} (${sa.status})\n`;
    }
  }

  res.json({ markdown: md, name });
});

sessionsRouter.patch("/:id/rename", (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  const names = loadNames();
  names[req.params.id] = name.trim();
  saveNames(names);
  res.json({ ok: true, id: req.params.id, name: name.trim() });
});

sessionsRouter.post("/:id/input", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sessionWatcher.sendInput(req.params.id, text);
  res.json({ ok: true });
});
