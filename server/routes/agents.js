import { Router } from "express";
import fs from "fs";
import path from "path";
import { agentStore } from "../agents/store.js";
import { generateClaudeMd } from "../agents/claudemd.js";

export const agentsRouter = Router();

agentsRouter.get("/", (req, res) => {
  res.json(agentStore.getAll());
});

agentsRouter.post("/", (req, res) => {
  const arch = req.body;
  if (!arch.id) arch.id = `arch-${Date.now()}`;
  res.json(agentStore.saveArchitecture(arch));
});

agentsRouter.delete("/:id", (req, res) => {
  agentStore.deleteArchitecture(req.params.id);
  res.json({ ok: true });
});

agentsRouter.post("/:id/activate", (req, res) => {
  agentStore.setActive(req.params.id);
  res.json({ ok: true });
});

// Generate CLAUDE.md from architecture
agentsRouter.get("/:id/claudemd", (req, res) => {
  const data = agentStore.getAll();
  const arch = data.architectures.find((a) => a.id === req.params.id);
  if (!arch) return res.status(404).json({ error: "Architecture not found" });
  const md = generateClaudeMd(arch);
  res.json({ markdown: md });
});

// Generate and write CLAUDE.md to a target directory
agentsRouter.post("/:id/claudemd", (req, res) => {
  const data = agentStore.getAll();
  const arch = data.architectures.find((a) => a.id === req.params.id);
  if (!arch) return res.status(404).json({ error: "Architecture not found" });

  const md = generateClaudeMd(arch);
  const targetDir = req.body.targetDir || process.cwd();
  const filePath = path.join(targetDir, "CLAUDE.md");

  try {
    // If CLAUDE.md exists, append under a separator
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf8");
      const separator = "\n\n---\n\n<!-- Forge Agent Architecture -->\n\n";
      // Replace existing Forge section if present
      const forgeMarker = "<!-- Forge Agent Architecture -->";
      if (existing.includes(forgeMarker)) {
        const before = existing.split(forgeMarker)[0].replace(/\n+---\n+$/, "");
        fs.writeFileSync(filePath, before + separator + md + "\n");
      } else {
        fs.writeFileSync(filePath, existing + separator + md + "\n");
      }
    } else {
      fs.writeFileSync(filePath, md + "\n");
    }
    res.json({ ok: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
