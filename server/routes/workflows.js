import { Router } from "express";
import { workflowDaemon } from "../agents/workflows.js";

export const workflowsRouter = Router();

// Get all enabled workflows
workflowsRouter.get("/", (req, res) => {
  res.json({ workflows: workflowDaemon.getEnabled() });
});

// Enable a workflow
workflowsRouter.post("/:archId/enable", (req, res) => {
  const { targetDir, autoApprove } = req.body || {};
  const ok = workflowDaemon.enable(req.params.archId, { targetDir, autoApprove });
  if (!ok) return res.status(404).json({ error: "Architecture not found" });
  res.json({ ok: true, enabled: true });
});

// Disable a workflow
workflowsRouter.post("/:archId/disable", (req, res) => {
  workflowDaemon.disable(req.params.archId);
  res.json({ ok: true, enabled: false });
});

// Check if a workflow is enabled
workflowsRouter.get("/:archId/status", (req, res) => {
  const enabled = workflowDaemon.isEnabled(req.params.archId);
  res.json({ enabled });
});

// Manually trigger a workflow
workflowsRouter.post("/:archId/trigger", (req, res) => {
  const { targetDir, autoApprove } = req.body || {};
  const runId = workflowDaemon.trigger(req.params.archId, { targetDir, autoApprove });
  if (!runId) return res.status(404).json({ error: "Workflow not found" });
  res.json({ runId });
});

// Get registered webhooks
workflowsRouter.get("/webhooks", (req, res) => {
  res.json({ webhooks: workflowDaemon.getWebhooks() });
});

// Catch-all webhook endpoint — matches /api/workflows/hooks/*
workflowsRouter.post("/hooks/*", (req, res) => {
  // Extract the path after /hooks
  const hookPath = "/" + req.params[0];
  const fullPath = "/hooks/" + req.params[0];

  // Try both path formats
  let runs = workflowDaemon.handleWebhook(fullPath, req.body);
  if (runs.length === 0) {
    runs = workflowDaemon.handleWebhook(hookPath, req.body);
  }

  if (runs.length === 0) {
    return res.status(404).json({ error: "No workflows registered for this webhook path" });
  }

  res.json({ triggered: runs.length, runs });
});
