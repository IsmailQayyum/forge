import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { notificationStore } from "../stores/notifications.js";

const FORGE_INPUT_DIR = path.join(os.homedir(), ".claude", "forge", "inputs");

// Store for pending messages (session -> message)
const pendingMessages = new Map();

// Permission queue: permissionId -> { sessionId, tool, input, decision, decidedAt }
const permissionQueue = new Map();

// Store a reference to the broadcast function
let broadcastFn = null;

export function setHooksBroadcast(fn) {
  broadcastFn = fn;
}

export const hooksRouter = Router();

// Receive events from Claude Code hooks
hooksRouter.post("/", (req, res) => {
  const { type, sessionId, project, data } = req.body;

  if (broadcastFn) {
    switch (type) {
      case "TOOL_COMPLETE":
        broadcastFn("HOOK_TOOL_COMPLETE", { sessionId, project, ...data });
        break;

      case "NOTIFICATION":
        broadcastFn("HOOK_NOTIFICATION", {
          sessionId,
          project,
          message: data.message,
        });
        broadcastFn("SESSION_WAITING", {
          sessionId,
          project,
          message: data.message,
        });
        break;

      case "SESSION_END":
        broadcastFn("SESSION_STATUS", {
          sessionId,
          status: "done",
          project,
        });
        // Fire webhook notification (fire-and-forget)
        notificationStore.notify({
          type: "session_end",
          title: "Session Completed",
          message: `Claude Code session finished in ${project}`,
          project,
          sessionId,
        }).catch(() => {});
        break;
    }
  }

  res.json({ ok: true });
});

// ─── Permission Flow ───────────────────────────────────────────────

// Hook submits a permission request (PreToolUse)
hooksRouter.post("/permission", (req, res) => {
  const { sessionId, project, tool, input, permissionId } = req.body;

  permissionQueue.set(permissionId, {
    sessionId,
    project,
    tool,
    input,
    decision: null,
    decidedAt: null,
    createdAt: Date.now(),
  });

  // Broadcast to UI
  if (broadcastFn) {
    broadcastFn("PERMISSION_REQUEST", {
      permissionId,
      sessionId,
      project,
      tool,
      input,
      ts: Date.now(),
    });
  }

  // Fire webhook (fire-and-forget)
  notificationStore.notify({
    type: "permission_needed",
    title: "Permission Required",
    message: `${tool} needs approval in ${project}`,
    project,
    sessionId,
  }).catch(() => {});

  res.json({ ok: true, permissionId });
});

// Hook polls for a decision
hooksRouter.get("/permission/:permissionId", (req, res) => {
  const entry = permissionQueue.get(req.params.permissionId);
  if (!entry) return res.json({ decided: false });

  if (entry.decision !== null) {
    // Clean up after delivering decision
    permissionQueue.delete(req.params.permissionId);
    return res.json({
      decided: true,
      decision: entry.decision, // "allow" or "deny"
      reason: entry.reason || null,
    });
  }

  res.json({ decided: false });
});

// UI submits a decision (approve/deny)
hooksRouter.post("/permission/:permissionId/decide", (req, res) => {
  const { decision, reason } = req.body; // decision: "allow" | "deny"
  const entry = permissionQueue.get(req.params.permissionId);

  if (!entry) return res.status(404).json({ error: "Permission request not found" });

  entry.decision = decision;
  entry.reason = reason || null;
  entry.decidedAt = Date.now();

  // Broadcast decision to UI
  if (broadcastFn) {
    broadcastFn("PERMISSION_DECIDED", {
      permissionId: req.params.permissionId,
      sessionId: entry.sessionId,
      decision,
      reason: entry.reason,
      tool: entry.tool,
    });
  }

  res.json({ ok: true });
});

// Get all pending permissions for a session
hooksRouter.get("/permissions/:sessionId", (req, res) => {
  const pending = [];
  for (const [id, entry] of permissionQueue) {
    if (entry.sessionId === req.params.sessionId && entry.decision === null) {
      pending.push({ permissionId: id, ...entry });
    }
  }
  res.json({ permissions: pending });
});

// ─── Message Flow ──────────────────────────────────────────────────

// Check for pending Forge messages (called by hook from Claude Code)
hooksRouter.get("/pending/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  // Check input file
  const inputFile = path.join(FORGE_INPUT_DIR, `${sessionId}.txt`);
  if (fs.existsSync(inputFile)) {
    try {
      const message = fs.readFileSync(inputFile, "utf8").trim();
      if (message) {
        fs.unlinkSync(inputFile);
        return res.json({ hasPending: true, message });
      }
    } catch {}
  }

  // Check in-memory pending messages
  if (pendingMessages.has(sessionId)) {
    const message = pendingMessages.get(sessionId);
    pendingMessages.delete(sessionId);
    return res.json({ hasPending: true, message });
  }

  res.json({ hasPending: false });
});

// Queue a message for a session (called from Forge UI)
hooksRouter.post("/send/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: "text required" });

  fs.mkdirSync(FORGE_INPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(FORGE_INPUT_DIR, `${sessionId}.txt`), text.trim());
  pendingMessages.set(sessionId, text.trim());

  if (broadcastFn) {
    broadcastFn("MESSAGE_QUEUED", { sessionId, text: text.trim() });
  }

  res.json({ ok: true, queued: true });
});
