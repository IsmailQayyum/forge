import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { sessionWatcher } from "../sessions.js";

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
  res.json(sessions);
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
