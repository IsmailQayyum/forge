import { Router } from "express";
import { agentRegistry } from "../agents/registry.js";

export const registryRouter = Router();

// List all agents (global + project)
registryRouter.get("/", (req, res) => {
  const projectDir = req.query.projectDir || null;
  const agents = agentRegistry.getAll(projectDir);
  res.json({ agents });
});

// Get global agents only
registryRouter.get("/global", (req, res) => {
  res.json({ agents: agentRegistry.getGlobal() });
});

// Get project agents only
registryRouter.get("/project", (req, res) => {
  const projectDir = req.query.projectDir;
  if (!projectDir) return res.status(400).json({ error: "projectDir required" });
  res.json({ agents: agentRegistry.getProject(projectDir) });
});

// Get presets
registryRouter.get("/presets", (req, res) => {
  res.json({ presets: agentRegistry.getPresets() });
});

// Get single agent
registryRouter.get("/:id", (req, res) => {
  const agent = agentRegistry.getById(req.params.id, req.query.projectDir);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

// Create or update agent
registryRouter.post("/", (req, res) => {
  const agent = req.body;
  res.json(agentRegistry.save(agent));
});

// Duplicate agent
registryRouter.post("/:id/duplicate", (req, res) => {
  const copy = agentRegistry.duplicate(req.params.id, req.query.projectDir);
  if (!copy) return res.status(404).json({ error: "Agent not found" });
  res.json(copy);
});

// Delete agent
registryRouter.delete("/:id", (req, res) => {
  const ok = agentRegistry.delete(req.params.id, req.query.projectDir);
  res.json({ ok });
});

// Export agent as JSON
registryRouter.get("/:id/export", (req, res) => {
  const agent = agentRegistry.export(req.params.id, req.query.projectDir);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

// Import agent from JSON
registryRouter.post("/import", (req, res) => {
  const { agent, scope, projectPath } = req.body;
  if (!agent) return res.status(400).json({ error: "agent data required" });
  const imported = agentRegistry.import(agent, scope || "global", projectPath);
  res.json(imported);
});
