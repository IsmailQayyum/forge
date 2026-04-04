import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";

export const claudemdRouter = Router();

// Read CLAUDE.md from a directory
claudemdRouter.get("/", (req, res) => {
  const cwd = req.query.cwd;
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  try {
    const filePath = path.join(cwd, "CLAUDE.md");
    if (!fs.existsSync(filePath)) {
      return res.json({ exists: false, content: "", path: filePath });
    }
    const content = fs.readFileSync(filePath, "utf8");
    res.json({ exists: true, content, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write CLAUDE.md to a directory
claudemdRouter.put("/", (req, res) => {
  const { cwd, content } = req.body;
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  try {
    const filePath = path.join(cwd, "CLAUDE.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content || "");
    res.json({ ok: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all CLAUDE.md files in common locations
claudemdRouter.get("/list", (req, res) => {
  const home = os.homedir();
  const locations = [];

  try {
    const globalPath = path.join(home, ".claude", "CLAUDE.md");
    if (fs.existsSync(globalPath)) {
      locations.push({ path: globalPath, scope: "global", content: fs.readFileSync(globalPath, "utf8").slice(0, 200) });
    }
  } catch {}

  const cwd = req.query.cwd;
  if (cwd) {
    try {
      const localPath = path.join(cwd, "CLAUDE.md");
      if (fs.existsSync(localPath)) {
        locations.push({ path: localPath, scope: "project", content: fs.readFileSync(localPath, "utf8").slice(0, 200) });
      }
    } catch {}
  }

  res.json(locations);
});
