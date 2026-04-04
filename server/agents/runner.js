/**
 * Agent Run Engine — executes architectures as autonomous agent pipelines.
 *
 * Like n8n for AI agents. Runs agents in topological order based on graph edges.
 * Root agents start first using `claude -p` (print mode = fully autonomous).
 * When an agent completes, its output is captured and passed to child agents.
 * Children start only after all their parents complete.
 *
 * Live activity is broadcast via WebSocket so the canvas shows what each agent
 * is doing in real-time.
 */

import { spawnTerminal, writeToTerminal, onTerminalExit, onTerminalData, getTerminalBuffer } from "../terminal.js";
import { CAPABILITY_DESCRIPTIONS } from "./claudemd.js";

// Strip ANSI escape codes
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\r/g, "");
}

// Extract a meaningful activity line from raw terminal output
function parseActivity(raw) {
  const clean = stripAnsi(raw).trim();
  if (!clean) return null;

  // Look for tool use patterns
  const toolMatch = clean.match(/(?:Read|Write|Edit|Bash|Grep|Glob|Agent|Search)\s*[:(]/i);
  if (toolMatch) return clean.slice(0, 80);

  // Look for file paths
  const fileMatch = clean.match(/[a-zA-Z0-9_\-/.]+\.[a-zA-Z]{1,6}/);
  if (fileMatch) return clean.slice(0, 80);

  // Skip very short or empty lines
  if (clean.length < 5) return null;

  // Return last meaningful chunk
  const lines = clean.split("\n").filter((l) => l.trim().length > 3);
  const last = lines[lines.length - 1];
  return last ? last.slice(0, 80) : null;
}

class RunManager {
  constructor() {
    this.runs = new Map();
    this.broadcast = null;
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  getRun(runId) {
    return this.runs.get(runId) || null;
  }

  getAllRuns() {
    return Array.from(this.runs.values()).map((r) => ({
      id: r.id,
      archName: r.archName,
      status: r.status,
      agents: Object.fromEntries(
        Object.entries(r.agents).map(([k, v]) => [k, {
          nodeId: v.nodeId,
          label: v.label,
          role: v.role,
          status: v.status,
          terminalId: v.terminalId,
          lastActivity: v.lastActivity,
        }])
      ),
      startedAt: r.startedAt,
    }));
  }

  startRun(architecture, targetDir, autoApprove) {
    const runId = `run-${Date.now()}`;
    const { nodes = [], edges = [] } = architecture;

    // Build graph
    const childMap = new Map();
    const parentMap = new Map();
    for (const edge of edges) {
      if (!childMap.has(edge.source)) childMap.set(edge.source, []);
      childMap.get(edge.source).push(edge.target);
      if (!parentMap.has(edge.target)) parentMap.set(edge.target, []);
      parentMap.get(edge.target).push(edge.source);
    }

    // Initialize agent states
    const agents = {};
    for (const node of nodes) {
      agents[node.id] = {
        nodeId: node.id,
        label: node.data.label,
        role: node.data.role,
        type: node.type, // agentNode, triggerNode, actionNode
        status: "pending",
        terminalId: null,
        output: "",
        lastActivity: "",
        data: node.data,
      };
    }

    const run = {
      id: runId,
      archId: architecture.id,
      archName: architecture.name,
      agents,
      childMap,
      parentMap,
      targetDir,
      autoApprove,
      status: "running",
      startedAt: Date.now(),
    };

    this.runs.set(runId, run);

    this._broadcast("RUN_STARTED", {
      runId,
      archName: architecture.name,
      agents: Object.values(agents).map((a) => ({
        nodeId: a.nodeId,
        label: a.label,
        role: a.role,
        status: a.status,
      })),
    });

    // Start root nodes (no parents)
    // Trigger/action nodes auto-complete immediately, only agentNodes spawn Claude
    const roots = nodes.filter((n) => !parentMap.has(n.id));
    for (const root of roots) {
      if (root.type === "triggerNode" || root.type === "actionNode") {
        this._autoComplete(runId, root.id);
      } else {
        this._startAgent(runId, root.id);
      }
    }

    return runId;
  }

  completeAgent(runId, nodeId) {
    const run = this.runs.get(runId);
    if (!run || !run.agents[nodeId]) return false;
    const agent = run.agents[nodeId];
    if (agent.status !== "running") return false;

    if (agent.terminalId) {
      agent.output = getTerminalBuffer(agent.terminalId);
    }
    agent.status = "completed";

    this._broadcast("AGENT_STATUS", {
      runId, nodeId, status: "completed", terminalId: agent.terminalId,
    });

    this._tryStartChildren(runId, nodeId);
    this._checkRunComplete(runId);
    return true;
  }

  // ── Internal ──

  _buildPrompt(run, nodeId) {
    const agent = run.agents[nodeId];

    // Collect parent outputs
    const parentIds = run.parentMap.get(nodeId) || [];
    const parentOutputs = parentIds
      .map((pid) => run.agents[pid])
      .filter((a) => a.output)
      .map((a) => {
        const clean = stripAnsi(a.output).slice(-3000);
        return `## Output from ${a.label} (${a.role}):\n${clean}`;
      });

    const parts = [];

    if (parentOutputs.length > 0) {
      parts.push("# Context from upstream agents:\n");
      parts.push(parentOutputs.join("\n\n"));
      parts.push("\n---\n");
    }

    parts.push(`You are "${agent.label}", a ${agent.role} agent.`);

    if (agent.data.systemPrompt) {
      parts.push(`\n${agent.data.systemPrompt}`);
    }

    if (agent.data.capabilities?.length > 0) {
      const capDesc = agent.data.capabilities
        .map((c) => CAPABILITY_DESCRIPTIONS[c] || c)
        .join(", ");
      parts.push(`\nYour capabilities: ${capDesc}`);
    }

    if (agent.data.fileRestrictions?.length > 0) {
      parts.push(`\nOnly touch files matching: ${agent.data.fileRestrictions.join(", ")}`);
    }

    const children = run.childMap.get(nodeId) || [];
    if (children.length > 0) {
      const childNames = children.map((cid) => run.agents[cid]?.label).filter(Boolean);
      parts.push(
        `\nYou are coordinating these agents who will run after you: ${childNames.join(", ")}. ` +
        `Provide thorough analysis and clear findings. Be comprehensive — your output will be their input.`
      );
    }

    parts.push(`\nWork autonomously. Do not ask for clarification — make your best judgment and execute.`);

    return parts.join("\n");
  }

  _startAgent(runId, nodeId) {
    const run = this.runs.get(runId);
    if (!run) return;

    const agent = run.agents[nodeId];
    const prompt = this._buildPrompt(run, nodeId);

    // Build CLI args — use -p (print mode) for fully autonomous execution
    // Claude runs, does tool use, completes the task, and exits on its own
    const args = ["-p"];
    if (run.autoApprove) {
      args.push("--dangerously-skip-permissions");
    }
    args.push(prompt);

    // Spawn terminal with prompt as CLI arg — no manual input needed
    const result = spawnTerminal({ cwd: run.targetDir, args });

    agent.terminalId = result.terminalId;
    agent.status = "running";
    agent.lastActivity = "Starting...";

    // Listen for terminal output → broadcast live activity
    let activityThrottle = 0;
    onTerminalData(result.terminalId, (termId, data) => {
      const now = Date.now();
      // Throttle activity broadcasts to every 500ms
      if (now - activityThrottle < 500) return;
      activityThrottle = now;

      const activity = parseActivity(data);
      if (activity) {
        agent.lastActivity = activity;
        this._broadcast("AGENT_ACTIVITY", {
          runId, nodeId, activity, label: agent.label,
        });
      }
    });

    // Listen for exit → agent completed
    onTerminalExit(result.terminalId, (termId, exitCode, buffer) => {
      this._onAgentExit(runId, nodeId, buffer);
    });

    this._broadcast("AGENT_STATUS", {
      runId, nodeId, status: "running", terminalId: result.terminalId, label: agent.label,
    });

    // Also broadcast TERMINAL_SPAWNED so Messenger picks it up
    if (this.broadcast) {
      this.broadcast("TERMINAL_SPAWNED", {
        terminalId: result.terminalId,
        pid: result.pid,
        cwd: run.targetDir,
        label: `${agent.label} [${run.archName}]`,
      });
    }
  }

  _onAgentExit(runId, nodeId, buffer) {
    const run = this.runs.get(runId);
    if (!run) return;

    const agent = run.agents[nodeId];
    if (agent.status === "completed") return;

    agent.output = buffer || "";
    agent.status = "completed";
    agent.lastActivity = "Done";

    this._broadcast("AGENT_STATUS", {
      runId, nodeId, status: "completed", terminalId: agent.terminalId,
    });

    this._tryStartChildren(runId, nodeId);
    this._checkRunComplete(runId);
  }

  /**
   * Auto-complete trigger/action nodes — they don't run Claude,
   * they just pass through and trigger their children.
   */
  _autoComplete(runId, nodeId) {
    const run = this.runs.get(runId);
    if (!run) return;

    const agent = run.agents[nodeId];
    agent.status = "completed";
    agent.lastActivity = "Done";
    agent.output = `[${agent.type || "node"}: ${agent.label}] — auto-completed`;

    this._broadcast("AGENT_STATUS", {
      runId, nodeId, status: "completed",
    });

    this._tryStartChildren(runId, nodeId);
    this._checkRunComplete(runId);
  }

  _tryStartChildren(runId, nodeId) {
    const run = this.runs.get(runId);
    if (!run) return;

    const children = run.childMap.get(nodeId) || [];
    for (const childId of children) {
      const childParents = run.parentMap.get(childId) || [];
      const allParentsDone = childParents.every(
        (pid) => run.agents[pid]?.status === "completed"
      );
      if (allParentsDone && run.agents[childId]?.status === "pending") {
        const child = run.agents[childId];
        if (child.type === "triggerNode" || child.type === "actionNode") {
          this._autoComplete(runId, childId);
        } else {
          this._startAgent(runId, childId);
        }
      }
    }
  }

  _checkRunComplete(runId) {
    const run = this.runs.get(runId);
    if (!run) return;

    const allDone = Object.values(run.agents).every(
      (a) => a.status === "completed" || a.status === "failed"
    );
    if (allDone) {
      run.status = "completed";
      this._broadcast("RUN_COMPLETED", { runId, archName: run.archName });
    }
  }

  _broadcast(type, payload) {
    if (this.broadcast) {
      this.broadcast(type, payload);
    }
  }
}

export const runManager = new RunManager();
