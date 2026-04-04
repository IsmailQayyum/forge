/**
 * Workflow Daemon — watches for triggers and auto-executes workflows.
 *
 * Supports:
 * - Webhook triggers (incoming HTTP requests)
 * - Manual triggers (from Forge UI)
 * - Cron triggers (time-based, using setInterval checks)
 * - GitHub PR triggers (polls via gh CLI or webhook)
 *
 * When a trigger fires, the daemon finds all enabled workflows that
 * match the trigger and starts them via the RunManager.
 */

import { agentStore } from "./store.js";
import { runManager } from "./runner.js";

class WorkflowDaemon {
  constructor() {
    this.enabled = new Map();      // archId -> { arch, targetDir, autoApprove }
    this.cronIntervals = new Map(); // archId -> intervalId
    this.webhookHandlers = new Map(); // path -> [archId]
    this.broadcast = null;
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  /**
   * Enable a workflow for automatic execution
   */
  enable(archId, config = {}) {
    const arch = agentStore.getById(archId);
    if (!arch) return false;

    const { targetDir, autoApprove = false } = config;
    this.enabled.set(archId, { arch, targetDir, autoApprove });

    // Register triggers from the architecture
    const triggers = (arch.nodes || []).filter((n) => n.type === "triggerNode");
    for (const trigger of triggers) {
      this._registerTrigger(archId, trigger);
    }

    this._broadcast("WORKFLOW_ENABLED", { archId, name: arch.name });
    return true;
  }

  /**
   * Disable a workflow
   */
  disable(archId) {
    this.enabled.delete(archId);

    // Clean up cron intervals
    if (this.cronIntervals.has(archId)) {
      clearInterval(this.cronIntervals.get(archId));
      this.cronIntervals.delete(archId);
    }

    // Clean up webhook handlers
    for (const [path, archIds] of this.webhookHandlers) {
      const filtered = archIds.filter((id) => id !== archId);
      if (filtered.length === 0) {
        this.webhookHandlers.delete(path);
      } else {
        this.webhookHandlers.set(path, filtered);
      }
    }

    this._broadcast("WORKFLOW_DISABLED", { archId });
    return true;
  }

  /**
   * Check if a workflow is enabled
   */
  isEnabled(archId) {
    return this.enabled.has(archId);
  }

  /**
   * Get all enabled workflows
   */
  getEnabled() {
    return Array.from(this.enabled.entries()).map(([id, cfg]) => ({
      archId: id,
      name: cfg.arch.name,
      targetDir: cfg.targetDir,
      autoApprove: cfg.autoApprove,
      triggers: (cfg.arch.nodes || [])
        .filter((n) => n.type === "triggerNode")
        .map((n) => ({ type: n.data.triggerType, config: n.data.config })),
    }));
  }

  /**
   * Handle incoming webhook
   */
  handleWebhook(path, body) {
    const archIds = this.webhookHandlers.get(path);
    if (!archIds || archIds.length === 0) return [];

    const runs = [];
    for (const archId of archIds) {
      const cfg = this.enabled.get(archId);
      if (!cfg) continue;
      const runId = this._executeWorkflow(archId, { webhookBody: body });
      if (runId) runs.push({ archId, runId });
    }
    return runs;
  }

  /**
   * Manually trigger a workflow
   */
  trigger(archId, context = {}) {
    const cfg = this.enabled.get(archId);
    if (!cfg) {
      // Even non-enabled workflows can be triggered manually
      const arch = agentStore.getById(archId);
      if (!arch) return null;
      const runId = runManager.startRun(arch, context.targetDir || "", context.autoApprove || false);
      return runId;
    }
    return this._executeWorkflow(archId, context);
  }

  /**
   * Get registered webhook paths
   */
  getWebhooks() {
    return Array.from(this.webhookHandlers.entries()).map(([path, archIds]) => ({
      path,
      workflows: archIds.map((id) => {
        const cfg = this.enabled.get(id);
        return { archId: id, name: cfg?.arch?.name };
      }),
    }));
  }

  // ── Internal ──

  _registerTrigger(archId, triggerNode) {
    const { triggerType, config } = triggerNode.data;

    switch (triggerType) {
      case "webhook": {
        const hookPath = config?.path || `/hooks/${archId}`;
        if (!this.webhookHandlers.has(hookPath)) {
          this.webhookHandlers.set(hookPath, []);
        }
        this.webhookHandlers.get(hookPath).push(archId);
        break;
      }

      case "cron": {
        if (!config?.schedule) break;
        // Simple cron — parse "interval in minutes" from schedule string
        // For MVP, support simple minute intervals: "*/5" = every 5 min
        const match = config.schedule.match(/^\*\/(\d+)/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const intervalId = setInterval(() => {
            this._executeWorkflow(archId, { cronFired: true });
          }, minutes * 60 * 1000);
          this.cronIntervals.set(archId, intervalId);
        }
        break;
      }

      // github_pr and manual don't need registration — they fire from external events
    }
  }

  _executeWorkflow(archId, context = {}) {
    const cfg = this.enabled.get(archId);
    if (!cfg) return null;

    // Reload latest architecture
    const arch = agentStore.getById(archId);
    if (!arch) return null;

    const runId = runManager.startRun(arch, cfg.targetDir, cfg.autoApprove);

    this._broadcast("WORKFLOW_TRIGGERED", {
      archId,
      runId,
      name: arch.name,
      trigger: context,
    });

    return runId;
  }

  _broadcast(type, payload) {
    if (this.broadcast) {
      this.broadcast(type, payload);
    }
  }
}

export const workflowDaemon = new WorkflowDaemon();
