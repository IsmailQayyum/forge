import { Router } from "express";
import fs from "fs";
import path from "path";

export const claudemdRouter = Router();

// Read CLAUDE.md from a directory
claudemdRouter.get("/", (req, res) => {
  const cwd = req.query.cwd;
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  const filePath = path.join(cwd, "CLAUDE.md");
  if (!fs.existsSync(filePath)) {
    return res.json({ exists: false, content: "", path: filePath });
  }

  const content = fs.readFileSync(filePath, "utf8");
  res.json({ exists: true, content, path: filePath });
});

// Write CLAUDE.md to a directory
claudemdRouter.put("/", (req, res) => {
  const { cwd, content } = req.body;
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  const filePath = path.join(cwd, "CLAUDE.md");
  fs.writeFileSync(filePath, content);
  res.json({ ok: true, path: filePath });
});

// List all CLAUDE.md files in common locations
claudemdRouter.get("/list", (req, res) => {
  const home = process.env.HOME || process.env.USERPROFILE;
  const locations = [];

  // Check global
  const globalPath = path.join(home, ".claude", "CLAUDE.md");
  if (fs.existsSync(globalPath)) {
    locations.push({ path: globalPath, scope: "global", content: fs.readFileSync(globalPath, "utf8").slice(0, 200) });
  }

  // Check cwd if provided
  const cwd = req.query.cwd;
  if (cwd) {
    const localPath = path.join(cwd, "CLAUDE.md");
    if (fs.existsSync(localPath)) {
      locations.push({ path: localPath, scope: "project", content: fs.readFileSync(localPath, "utf8").slice(0, 200) });
    }
  }

  res.json(locations);
});
