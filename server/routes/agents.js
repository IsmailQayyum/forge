import { Router } from "express";
import fs from "fs";
import path from "path";
import { agentStore } from "../agents/store.js";
import { generateClaudeMd, CAPABILITY_DESCRIPTIONS } from "../agents/claudemd.js";
import { runManager } from "../agents/runner.js";

export const agentsRouter = Router();

agentsRouter.get("/", (req, res) => {
  res.json(agentStore.getAll());
});

agentsRouter.post("/", (req, res) => {
  const arch = req.body;
  if (!arch.id) arch.id = `arch-${Date.now()}`;
  res.json(agentStore.saveArchitecture(arch));
});

agentsRouter.get("/:id", (req, res) => {
  const arch = agentStore.getById(req.params.id);
  if (!arch) return res.status(404).json({ error: "Architecture not found" });
  res.json(arch);
});

agentsRouter.post("/:id/run", (req, res) => {
  const arch = agentStore.getById(req.params.id);
  if (!arch) return res.status(404).json({ error: "Architecture not found" });

  const { targetDir, autoApprove } = req.body || {};
  const nodes = arch.nodes || [];

  const agents = nodes.map((node) => {
    const { label, role, systemPrompt, capabilities = [], fileRestrictions = [] } = node.data;

    const promptLines = [];
    promptLines.push(`# Agent: ${label}`);
    promptLines.push("");
    promptLines.push(`**Role**: ${role}`);
    promptLines.push("");

    if (capabilities.length > 0) {
      promptLines.push("**Capabilities**:");
      for (const cap of capabilities) {
        promptLines.push(`- ${CAPABILITY_DESCRIPTIONS[cap] || cap}`);
      }
      promptLines.push("");
    }

    if (fileRestrictions.length > 0) {
      const patterns = fileRestrictions.map((p) => `\`${p}\``).join(", ");
      promptLines.push(`**File access**: Only touch files matching: ${patterns}`);
      promptLines.push("");
    }

    if (systemPrompt) {
      promptLines.push("**System Prompt**:");
      promptLines.push(systemPrompt);
      promptLines.push("");
    }

    if (targetDir) {
      promptLines.push(`**Working directory**: ${targetDir}`);
      promptLines.push("");
    }

    if (autoApprove) {
      promptLines.push("**Auto-approve**: enabled — proceed without confirmation prompts.");
      promptLines.push("");
    }

    return {
      nodeId: node.id,
      label,
      role,
      prompt: promptLines.join("\n"),
    };
  });

  res.json({ agents });
});

// ── Execute architecture (run engine) ──
agentsRouter.post("/:id/execute", (req, res) => {
  const arch = agentStore.getById(req.params.id);
  if (!arch) return res.status(404).json({ error: "Architecture not found" });
  const { targetDir, autoApprove } = req.body || {};
  if (!targetDir) return res.status(400).json({ error: "targetDir is required" });
  const runId = runManager.startRun(arch, targetDir, autoApprove);
  res.json({ runId });
});

// ── Run management ──
agentsRouter.get("/runs/list", (req, res) => {
  res.json({ runs: runManager.getAllRuns() });
});

agentsRouter.get("/runs/:runId", (req, res) => {
  const run = runManager.getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json({
    id: run.id,
    archName: run.archName,
    status: run.status,
    agents: Object.fromEntries(
      Object.entries(run.agents).map(([k, v]) => [k, {
        nodeId: v.nodeId, label: v.label, role: v.role,
        status: v.status, terminalId: v.terminalId,
      }])
    ),
    startedAt: run.startedAt,
  });
});

agentsRouter.post("/runs/:runId/agents/:nodeId/complete", (req, res) => {
  const ok = runManager.completeAgent(req.params.runId, req.params.nodeId);
  res.json({ ok });
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
