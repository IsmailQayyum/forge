import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";

export const settingsRouter = Router();

const FORGE_DIR = path.join(os.homedir(), ".claude", "forge");

function countJsonFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Array.isArray(data)) return data.length;
    if (typeof data === "object") return Object.keys(data).length;
    return 0;
  } catch {
    return 0;
  }
}

settingsRouter.get("/storage", (_, res) => {
  const info = {
    architectures: countJsonFile(path.join(FORGE_DIR, "architectures.json")),
    costs: countJsonFile(path.join(FORGE_DIR, "cost-history.json")),
    prompts: countJsonFile(path.join(FORGE_DIR, "prompts.json")),
    agents: countJsonFile(path.join(FORGE_DIR, "registry.json")),
    notifications: countJsonFile(path.join(FORGE_DIR, "notifications.json")),
  };
  res.json(info);
});

settingsRouter.post("/clear/:type", (req, res) => {
  const fileMap = {
    architectures: "architectures.json",
    costs: "cost-history.json",
    prompts: "prompts.json",
    agents: "registry.json",
    notifications: "notifications.json",
  };

  const filename = fileMap[req.params.type];
  if (!filename) return res.status(400).json({ error: "Unknown data type" });

  const filePath = path.join(FORGE_DIR, filename);
  try {
    fs.writeFileSync(filePath, "[]", "utf8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
