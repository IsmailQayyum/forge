import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useForgeStore } from "../../store/index.js";
import { AgentNode } from "./AgentNode.jsx";
import { TriggerNode } from "./TriggerNode.jsx";
import { ActionNode } from "./ActionNode.jsx";
import { CapabilitiesPanel } from "./CapabilitiesPanel.jsx";
import { TriggerPanel } from "./TriggerPanel.jsx";
import { ActionPanel } from "./ActionPanel.jsx";
import { XTerminal } from "../Messenger/XTerminal.jsx";
import { RunSummary } from "./RunSummary.jsx";
import {
  GitBranch, Plus, Save, Trash2, FileDown, Play, Upload, Download,
  ChevronDown, FolderOpen, Layers, Zap, Shield, Code, Bug, BookOpen,
  X, Check, MoreHorizontal, Square, Clock, CheckCircle2, Loader2,
  Terminal as TerminalIcon, GitPullRequest, Bell, Webhook, Bot,
} from "lucide-react";
import clsx from "clsx";

const NODE_TYPES = { agentNode: AgentNode, triggerNode: TriggerNode, actionNode: ActionNode };

// ── Pre-built workflow templates ──
const TEMPLATES = [
  {
    id: "fullstack-sprint",
    name: "Full-Stack Sprint",
    description: "Supervisor coordinates frontend, backend, and test agents working in parallel",
    icon: Layers,
    color: "text-forge-accent",
    nodes: [
      { id: "supervisor", type: "agentNode", position: { x: 300, y: 50 }, data: { label: "Tech Lead", role: "supervisor", capabilities: ["read_files", "run_commands", "spawn_agents"], systemPrompt: "You are the tech lead coordinating a full-stack sprint. Review work from all agents before considering the task complete. Ensure frontend and backend changes are compatible." } },
      { id: "frontend", type: "agentNode", position: { x: 100, y: 220 }, data: { label: "Frontend Agent", role: "worker", capabilities: ["read_files", "write_files", "run_commands"], fileRestrictions: ["src/components/**", "src/pages/**", "src/styles/**", "*.css", "*.tsx", "*.jsx"], systemPrompt: "You are a frontend specialist. Build UI components, handle styling, and ensure responsive design. Run the dev server to verify your changes." } },
      { id: "backend", type: "agentNode", position: { x: 350, y: 220 }, data: { label: "Backend Agent", role: "worker", capabilities: ["read_files", "write_files", "run_commands"], fileRestrictions: ["server/**", "api/**", "src/routes/**", "*.sql"], systemPrompt: "You are a backend specialist. Build API endpoints, handle database queries, and ensure proper error handling. Test endpoints with curl." } },
      { id: "tester", type: "agentNode", position: { x: 600, y: 220 }, data: { label: "Test Agent", role: "tester", capabilities: ["read_files", "write_files", "run_commands"], fileRestrictions: ["tests/**", "**/*.test.*", "**/*.spec.*"], systemPrompt: "You are a QA engineer. Write and run tests for both frontend components and backend endpoints. Ensure >80% coverage on changed code." } },
    ],
    edges: [
      { id: "e1", source: "supervisor", target: "frontend", animated: true, style: { stroke: "#f97316" } },
      { id: "e2", source: "supervisor", target: "backend", animated: true, style: { stroke: "#f97316" } },
      { id: "e3", source: "supervisor", target: "tester", animated: true, style: { stroke: "#f97316" } },
    ],
  },
  {
    id: "pr-review",
    name: "PR Review Pipeline",
    description: "Triggered by GitHub PR — security, code quality, and tests run in parallel, then auto-comment results",
    icon: Shield,
    color: "text-forge-green",
    nodes: [
      { id: "trigger-pr", type: "triggerNode", position: { x: 300, y: 0 }, data: { label: "PR Opened", triggerType: "github_pr", config: { repo: "", events: ["opened", "synchronize"] } } },
      { id: "lead", type: "agentNode", position: { x: 300, y: 120 }, data: { label: "Review Lead", role: "supervisor", capabilities: ["read_files", "run_commands", "spawn_agents", "github_read", "github_pr"], systemPrompt: "You coordinate PR reviews. Gather findings from security, code quality, and test agents, then write a consolidated review comment." } },
      { id: "security", type: "agentNode", position: { x: 60, y: 280 }, data: { label: "Security Reviewer", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Audit the code for OWASP Top 10 vulnerabilities, injection risks, auth issues, and secret leaks. Report findings with severity levels." } },
      { id: "quality", type: "agentNode", position: { x: 310, y: 280 }, data: { label: "Code Quality", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Review code for maintainability, naming conventions, error handling, and adherence to project patterns. Suggest improvements." } },
      { id: "tests", type: "agentNode", position: { x: 560, y: 280 }, data: { label: "Test Validator", role: "tester", capabilities: ["read_files", "run_commands"], systemPrompt: "Run the existing test suite, check for regressions, and verify that new code has adequate test coverage." } },
      { id: "action-comment", type: "actionNode", position: { x: 200, y: 440 }, data: { label: "Post Review", actionType: "github_comment", config: { template: "## Forge Review\n\n{{output}}" } } },
      { id: "action-slack", type: "actionNode", position: { x: 450, y: 440 }, data: { label: "Notify Team", actionType: "slack_message", config: { channel: "#code-reviews", template: "PR review complete for {{workflow}}" } } },
    ],
    edges: [
      { id: "e0", source: "trigger-pr", target: "lead", animated: true, style: { stroke: "#a855f7" } },
      { id: "e1", source: "lead", target: "security", animated: true, style: { stroke: "#f97316" } },
      { id: "e2", source: "lead", target: "quality", animated: true, style: { stroke: "#f97316" } },
      { id: "e3", source: "lead", target: "tests", animated: true, style: { stroke: "#f97316" } },
      { id: "e4", source: "security", target: "action-comment", animated: true, style: { stroke: "#22c55e" } },
      { id: "e5", source: "quality", target: "action-comment", animated: true, style: { stroke: "#22c55e" } },
      { id: "e6", source: "tests", target: "action-comment", animated: true, style: { stroke: "#22c55e" } },
      { id: "e7", source: "security", target: "action-slack", animated: true, style: { stroke: "#22c55e" } },
    ],
  },
  {
    id: "bug-hunt",
    name: "Bug Hunt",
    description: "Planner analyzes the bug, reproducer confirms it, fixer implements the solution",
    icon: Bug,
    color: "text-forge-red",
    nodes: [
      { id: "planner", type: "agentNode", position: { x: 300, y: 50 }, data: { label: "Bug Analyst", role: "planner", capabilities: ["read_files", "run_commands", "spawn_agents"], systemPrompt: "Analyze the reported bug. Read logs, trace the code path, identify root cause. Then coordinate the reproducer and fixer agents." } },
      { id: "reproducer", type: "agentNode", position: { x: 150, y: 220 }, data: { label: "Reproducer", role: "tester", capabilities: ["read_files", "run_commands"], systemPrompt: "Write a minimal reproduction case for the bug. Create a test that fails with the current code, proving the bug exists." } },
      { id: "fixer", type: "agentNode", position: { x: 450, y: 220 }, data: { label: "Bug Fixer", role: "worker", capabilities: ["read_files", "write_files", "run_commands"], systemPrompt: "Implement the fix for the bug. Make the minimal change needed. Ensure the reproducer test passes after your fix." } },
    ],
    edges: [
      { id: "e1", source: "planner", target: "reproducer", animated: true, style: { stroke: "#f97316" } },
      { id: "e2", source: "planner", target: "fixer", animated: true, style: { stroke: "#f97316" } },
    ],
  },
  {
    id: "deploy-pipeline",
    name: "Deploy Pipeline",
    description: "Webhook triggers lint, test, security scan, then auto-creates PR and notifies Slack",
    icon: Zap,
    color: "text-yellow-400",
    nodes: [
      { id: "trigger-webhook", type: "triggerNode", position: { x: 300, y: 0 }, data: { label: "Deploy Webhook", triggerType: "webhook", config: { path: "/hooks/deploy" } } },
      { id: "linter", type: "agentNode", position: { x: 100, y: 140 }, data: { label: "Lint Agent", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Run the project linter. Fix all auto-fixable issues. Report remaining issues with file locations." } },
      { id: "tester", type: "agentNode", position: { x: 350, y: 140 }, data: { label: "Test Agent", role: "tester", capabilities: ["read_files", "run_commands"], systemPrompt: "Run the full test suite. Report any failures with stack traces. Ensure all tests pass before proceeding." } },
      { id: "scanner", type: "agentNode", position: { x: 600, y: 140 }, data: { label: "Security Scan", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Run security scanners (npm audit, dependency check). Flag any critical or high severity vulnerabilities." } },
      { id: "action-pr", type: "actionNode", position: { x: 200, y: 300 }, data: { label: "Create PR", actionType: "create_pr", config: { title: "[Forge] Automated deploy check", branch: "forge/deploy-{{timestamp}}" } } },
      { id: "action-notify", type: "actionNode", position: { x: 500, y: 300 }, data: { label: "Slack Notify", actionType: "slack_message", config: { channel: "#deploys", template: "Deploy pipeline complete. All checks passed." } } },
    ],
    edges: [
      { id: "e0", source: "trigger-webhook", target: "linter", animated: true, style: { stroke: "#a855f7" } },
      { id: "e1", source: "trigger-webhook", target: "tester", animated: true, style: { stroke: "#a855f7" } },
      { id: "e2", source: "trigger-webhook", target: "scanner", animated: true, style: { stroke: "#a855f7" } },
      { id: "e3", source: "linter", target: "action-pr", animated: true, style: { stroke: "#22c55e" } },
      { id: "e4", source: "tester", target: "action-pr", animated: true, style: { stroke: "#22c55e" } },
      { id: "e5", source: "scanner", target: "action-notify", animated: true, style: { stroke: "#22c55e" } },
    ],
  },
  {
    id: "onboarding",
    name: "Codebase Onboarding",
    description: "Generates documentation, architecture maps, and a getting-started guide for a new codebase",
    icon: BookOpen,
    color: "text-purple-400",
    nodes: [
      { id: "lead", type: "agentNode", position: { x: 300, y: 50 }, data: { label: "Documentation Lead", role: "supervisor", capabilities: ["read_files", "run_commands", "spawn_agents", "write_files"], systemPrompt: "Coordinate documentation generation for this codebase. Compile outputs from all agents into a comprehensive onboarding guide." } },
      { id: "arch", type: "agentNode", position: { x: 100, y: 220 }, data: { label: "Architecture Mapper", role: "planner", capabilities: ["read_files", "run_commands"], systemPrompt: "Map the project architecture: folder structure, key modules, data flow, and dependencies. Output a clear architecture overview." } },
      { id: "api", type: "agentNode", position: { x: 350, y: 220 }, data: { label: "API Documenter", role: "worker", capabilities: ["read_files", "run_commands"], systemPrompt: "Document all API endpoints, their parameters, response formats, and authentication requirements. Include example requests." } },
      { id: "setup", type: "agentNode", position: { x: 600, y: 220 }, data: { label: "Setup Guide Writer", role: "worker", capabilities: ["read_files", "run_commands"], systemPrompt: "Create a step-by-step getting-started guide: prerequisites, installation, configuration, running locally, and running tests." } },
    ],
    edges: [
      { id: "e1", source: "lead", target: "arch", animated: true, style: { stroke: "#f97316" } },
      { id: "e2", source: "lead", target: "api", animated: true, style: { stroke: "#f97316" } },
      { id: "e3", source: "lead", target: "setup", animated: true, style: { stroke: "#f97316" } },
    ],
  },
];

const EMPTY_ARCH = {
  id: null,
  name: "New Architecture",
  nodes: [
    {
      id: "supervisor",
      type: "agentNode",
      position: { x: 300, y: 80 },
      data: { label: "Supervisor Agent", role: "supervisor", capabilities: ["read_files", "run_commands", "spawn_agents"] },
    },
  ],
  edges: [],
};


export function AgentArchitect() {
  // ── Architecture list state ──
  const [archList, setArchList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showList, setShowList] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Current architecture state ──
  const [nodes, setNodes, onNodesChange] = useNodesState(EMPTY_ARCH.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [archName, setArchName] = useState("New Architecture");
  const [savedArchId, setSavedArchId] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const fileInputRef = useRef(null);

  // ── Run state ──
  // Use a ref for the actual run data (mutated directly to avoid React batching issues)
  // and a counter state to trigger re-renders when run data changes
  const activeRunRef = useRef(null);
  const [runTick, setRunTick] = useState(0);
  const activeRun = activeRunRef.current;
  const bumpRun = () => setRunTick((n) => n + 1);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [completedRun, setCompletedRun] = useState(null); // shown as RunSummary overlay
  const [focusedAgent, setFocusedAgent] = useState(null); // nodeId of agent whose terminal to show
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [showRegistryPicker, setShowRegistryPicker] = useState(false);
  const [registryAgents, setRegistryAgents] = useState([]);
  const [panelWidth, setPanelWidth] = useState(40); // percentage
  const wsRef = useRef(null);
  const dragRef = useRef(null);

  const saveArchitecture = useForgeStore((s) => s.saveArchitecture);

  const currentRunIdRef = useRef(null);

  // ── WebSocket listener — polls for WS and attaches message handler ──
  useEffect(() => {
    let currentWs = null;
    let handler = null;

    function handleWs(event) {
      try {
        const msg = JSON.parse(event.data);
        const run = activeRunRef.current;

        if (msg.type === "RUN_STARTED" && msg.payload) {
          const { runId, agents } = msg.payload;
          // Only accept if this matches our current run (or no filter set)
          if (currentRunIdRef.current && currentRunIdRef.current !== runId) return;
          const agentMap = {};
          for (const a of agents) {
            agentMap[a.nodeId] = { ...a };
          }
          activeRunRef.current = { runId, agents: agentMap, status: "running" };
          bumpRun();
        }

        if (msg.type === "AGENT_STATUS" && msg.payload) {
          const { runId, nodeId, status, terminalId, label } = msg.payload;
          if (run && run.runId === runId && run.agents[nodeId]) {
            // Mutate the ref directly — no batching issues
            run.agents[nodeId] = { ...run.agents[nodeId], status, terminalId, label };
            bumpRun();
          }
          // Update node visual
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, runStatus: status } } : n
            )
          );
          // Auto-focus first running agent
          if (status === "running") {
            setFocusedAgent((prev) => prev || nodeId);
          }
        }

        if (msg.type === "AGENT_ACTIVITY" && msg.payload) {
          const { runId, nodeId, activity } = msg.payload;
          // Update node bubble with live activity
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, runActivity: activity } } : n
            )
          );
          // Update bottom bar
          if (run && run.runId === runId && run.agents[nodeId]) {
            run.agents[nodeId].lastActivity = activity;
            bumpRun();
          }
        }

        if (msg.type === "RUN_COMPLETED" && msg.payload) {
          if (run && run.runId === msg.payload.runId) {
            run.status = "completed";
            run.duration = msg.payload.duration;
            run.gitBefore = msg.payload.gitBefore;
            run.gitAfter = msg.payload.gitAfter;
            bumpRun();
            // Show run summary overlay
            setCompletedRun({
              ...msg.payload,
              agents: run.agents,
            });
          }
          // Clear activity bubbles but keep runStatus on nodes
          setNodes((nds) =>
            nds.map((n) => ({ ...n, data: { ...n.data, runActivity: undefined } }))
          );
        }
      } catch (err) {
        console.error("[Forge WS handler]", err);
      }
    }

    function attach() {
      const ws = window.__forgeWs;
      if (ws && ws.readyState === 1 && ws !== currentWs) {
        if (currentWs && handler) {
          currentWs.removeEventListener("message", handler);
        }
        currentWs = ws;
        wsRef.current = ws;
        handler = handleWs;
        ws.addEventListener("message", handleWs);
      }
    }

    attach();
    const interval = setInterval(attach, 500);
    return () => {
      clearInterval(interval);
      if (currentWs && handler) {
        currentWs.removeEventListener("message", handler);
      }
    };
  }, []);

  // ── Load saved architectures on mount ──
  useEffect(() => {
    fetchArchitectures();
  }, []);

  async function fetchArchitectures() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setArchList(data.architectures || []);
    } catch {}
    setLoadingList(false);
  }

  // ── Canvas callbacks ──
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#f97316" } }, eds)),
    []
  );

  // ── Architecture CRUD ──
  function loadArchitecture(arch) {
    setNodes(arch.nodes || EMPTY_ARCH.nodes);
    setEdges(arch.edges || []);
    setArchName(arch.name);
    setSavedArchId(arch.id);
    setSelectedNode(null);
    setShowList(false);
    setShowTemplates(false);
    currentRunIdRef.current = null;
    activeRunRef.current = null;
    bumpRun();
    setFocusedAgent(null);
    // Check workflow status
    if (arch.id) {
      fetch(`/api/workflows/${arch.id}/status`)
        .then((r) => r.json())
        .then((d) => setWorkflowEnabled(d.enabled || false))
        .catch(() => setWorkflowEnabled(false));
    }
  }

  function loadTemplate(template) {
    setNodes(template.nodes);
    setEdges(template.edges);
    setArchName(template.name);
    setSavedArchId(null);
    setSelectedNode(null);
    setShowList(false);
    setShowTemplates(false);
    activeRunRef.current = null;
    bumpRun();
    setFocusedAgent(null);
  }

  function newArchitecture() {
    setNodes(EMPTY_ARCH.nodes);
    setEdges([]);
    setArchName("New Architecture");
    setSavedArchId(null);
    setSelectedNode(null);
    setShowList(false);
    activeRunRef.current = null;
    bumpRun();
    setFocusedAgent(null);
  }

  function addAgent() {
    const id = `agent-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "agentNode",
        position: { x: 100 + Math.random() * 400, y: 250 + Math.random() * 150 },
        data: { label: "New Agent", role: "worker", capabilities: ["read_files"] },
      },
    ]);
  }

  function addFromRegistry(registryAgent) {
    const id = `agent-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "agentNode",
        position: { x: 100 + Math.random() * 400, y: 200 + Math.random() * 150 },
        data: {
          label: registryAgent.name,
          role: registryAgent.role || "worker",
          capabilities: registryAgent.capabilities || ["read_files"],
          systemPrompt: registryAgent.systemPrompt || "",
          fileRestrictions: registryAgent.fileRestrictions || [],
          registryId: registryAgent.id, // link back to registry
        },
      },
    ]);
    setShowRegistryPicker(false);
  }

  async function openRegistryPicker() {
    try {
      const res = await fetch("/api/registry");
      const data = await res.json();
      // Also fetch presets
      const presetsRes = await fetch("/api/registry/presets");
      const presetsData = await presetsRes.json();
      setRegistryAgents([...(data.agents || []), ...(presetsData.presets || [])]);
    } catch {
      setRegistryAgents([]);
    }
    setShowRegistryPicker(true);
  }

  function addTrigger() {
    const id = `trigger-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "triggerNode",
        position: { x: 200 + Math.random() * 200, y: 20 },
        data: { label: "New Trigger", triggerType: "manual", config: {} },
      },
    ]);
  }

  function addAction() {
    const id = `action-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "actionNode",
        position: { x: 200 + Math.random() * 200, y: 400 + Math.random() * 100 },
        data: { label: "New Action", actionType: "notification", config: {} },
      },
    ]);
  }

  function updateNodeData(nodeId, data) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }

  function deleteSelected() {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }

  async function save() {
    const id = savedArchId || `arch-${Date.now()}`;
    const arch = { id, name: archName, nodes, edges, updatedAt: Date.now() };
    saveArchitecture(arch);
    setSavedArchId(id);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arch),
    });
    setSaveStatus("Saved!");
    setTimeout(() => setSaveStatus(null), 2000);
    fetchArchitectures();
  }

  async function deleteArchitecture(archId) {
    await fetch(`/api/agents/${archId}`, { method: "DELETE" });
    setArchList((prev) => prev.filter((a) => a.id !== archId));
    if (savedArchId === archId) newArchitecture();
  }

  async function exportClaudeMd() {
    const id = savedArchId || `arch-${Date.now()}`;
    const arch = { id, name: archName, nodes, edges, updatedAt: Date.now() };
    setSavedArchId(id);
    saveArchitecture(arch);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arch),
    });
    const res = await fetch(`/api/agents/${id}/claudemd`);
    const { markdown } = await res.json();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus("Downloaded!");
    setTimeout(() => setExportStatus(null), 2000);
  }

  function exportJson() {
    const arch = { name: archName, nodes, edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(arch, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${archName.replace(/\s+/g, "-").toLowerCase()}.forge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
          setArchName(data.name || "Imported Architecture");
          setSavedArchId(null);
          setShowList(false);
        }
      } catch (err) {
        console.error("Invalid JSON:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Execute architecture ──
  async function executeArchitecture(targetDir, autoApprove = false) {
    setShowRunDialog(false);

    // ── HARD RESET — wipe all previous run state ──
    activeRunRef.current = null;
    bumpRun();
    setFocusedAgent(null);
    setCompletedRun(null);
    currentRunIdRef.current = null;

    // Force-clear all node run visuals immediately
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        runStatus: "pending",
        runActivity: undefined,
      },
    })));

    // Save first
    const id = savedArchId || `arch-${Date.now()}`;
    const arch = { id, name: archName, nodes, edges, updatedAt: Date.now() };
    setSavedArchId(id);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arch),
    });

    try {
      const res = await fetch(`/api/agents/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDir, autoApprove }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Execute error:", data.error);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined, runActivity: undefined } })));
        return;
      }
      // Track this run ID so we ignore stale events from old runs
      if (data.runId) {
        currentRunIdRef.current = data.runId;
      }
    } catch (err) {
      console.error("Failed to execute:", err);
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined, runActivity: undefined } })));
    }
  }

  function stopRun() {
    currentRunIdRef.current = null;
    activeRunRef.current = null;
    bumpRun();
    setFocusedAgent(null);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined, runActivity: undefined } })));
  }

  async function markAgentDone(nodeId) {
    if (!activeRun) return;
    await fetch(`/api/agents/runs/${activeRun.runId}/agents/${nodeId}/complete`, { method: "POST" });
  }

  // Click node — during run, focus the agent's terminal/output. Otherwise, select for config.
  function handleNodeClick(_, node) {
    // Only agent nodes have terminals/output — trigger/action nodes go to config
    if (activeRun && activeRun.agents[node.id] && node.type === "agentNode") {
      setFocusedAgent(node.id);
      setSelectedNode(null);
      // If completed, fetch output
      const agent = activeRun.agents[node.id];
      if (agent.status === "completed" && !agent.outputFetched) {
        fetchAgentOutput(node.id);
      }
    } else {
      setSelectedNode(node);
      setFocusedAgent(null);
    }
  }

  async function fetchAgentOutput(nodeId) {
    const run = activeRunRef.current;
    if (!run) return;
    try {
      const res = await fetch(`/api/agents/runs/${run.runId}/agents/${nodeId}/output`);
      const data = await res.json();
      if (run.agents[nodeId]) {
        run.agents[nodeId].output = data.output;
        run.agents[nodeId].outputFetched = true;
        bumpRun();
      }
    } catch {}
  }

  // ── Derived state ──
  const isRunning = activeRun && activeRun.status !== "completed";
  const runAgents = activeRun ? Object.values(activeRun.agents) : [];
  const completedCount = runAgents.filter((a) => a.status === "completed").length;
  const runningCount = runAgents.filter((a) => a.status === "running").length;
  const focusedAgentData = focusedAgent && activeRun?.agents[focusedAgent];
  const focusedTerminalId = focusedAgentData?.status === "running" ? focusedAgentData?.terminalId : null;
  const focusedOutput = focusedAgentData?.status === "completed" ? focusedAgentData?.output : null;
  const showRightPanel = focusedAgent && activeRun && (focusedTerminalId || focusedAgentData?.status === "completed");
  const hasTriggers = nodes.some((n) => n.type === "triggerNode");

  // ── Architecture list view ──
  if (showList) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
            <GitBranch size={16} className="text-forge-accent" />
            <h2 className="text-sm font-semibold text-forge-text">Agent Architectures</h2>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
                  showTemplates
                    ? "bg-forge-accent text-white"
                    : "bg-forge-surface border border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-muted"
                )}
              >
                <Zap size={12} />
                Templates
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors"
              >
                <Upload size={12} />
                Import
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={importJson} className="hidden" />
              <button
                onClick={newArchitecture}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
              >
                <Plus size={12} />
                New
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {showTemplates && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-3">Workflow Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => loadTemplate(t)}
                        className="flex items-start gap-3 p-4 rounded-xl bg-forge-surface border border-forge-border hover:border-forge-muted transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-forge-bg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon size={16} className={t.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-forge-text mb-0.5">{t.name}</p>
                          <p className="text-[10px] text-forge-muted leading-relaxed">{t.description}</p>
                          <p className="text-[9px] text-forge-muted mt-1.5">{t.nodes.length} agents</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-3">
              {archList.length > 0 ? "Saved Architectures" : "No Saved Architectures"}
            </h3>

            {loadingList ? (
              <div className="flex items-center justify-center py-12 text-forge-muted text-xs">Loading...</div>
            ) : archList.length === 0 && !showTemplates ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-forge-muted">
                <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
                  <GitBranch size={28} className="text-forge-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-forge-text mb-1">Design your first agent workflow</p>
                  <p className="text-xs text-forge-muted max-w-xs">
                    Create multi-agent architectures visually. Define roles, capabilities, and restrictions. Export as CLAUDE.md or run directly.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-muted hover:text-forge-text transition-colors"
                  >
                    <Zap size={12} /> Start from template
                  </button>
                  <button
                    onClick={newArchitecture}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
                  >
                    <Plus size={12} /> Build from scratch
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {archList.map((arch) => (
                  <div
                    key={arch.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-forge-surface border border-forge-border hover:border-forge-muted transition-colors group cursor-pointer"
                    onClick={() => loadArchitecture(arch)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-forge-bg flex items-center justify-center shrink-0">
                      <GitBranch size={14} className="text-forge-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-forge-text">{arch.name}</p>
                      <p className="text-[10px] text-forge-muted">
                        {arch.nodes?.length || 0} agents · Updated {new Date(arch.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteArchitecture(arch.id); }}
                        className="p-1.5 rounded-md text-forge-muted hover:text-forge-red hover:bg-forge-red/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Canvas + execution view ──
  return (
    <div className="flex h-full">
      {/* Left: Canvas */}
      <div className={clsx("flex flex-col min-w-0", showRightPanel ? "flex-1" : "flex-1")} style={showRightPanel ? { width: `${100 - panelWidth}%` } : undefined}>
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-forge-border flex items-center gap-2">
          <button
            onClick={() => { setShowList(true); fetchArchitectures(); stopRun(); }}
            className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors"
            title="Back to list"
          >
            <ChevronDown size={14} className="rotate-90" />
          </button>
          <GitBranch size={14} className="text-forge-accent" />
          <input
            value={archName}
            onChange={(e) => setArchName(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none text-forge-text w-40"
            readOnly={!!isRunning}
          />

          {/* Run status bar */}
          {activeRun && (
            <div className="flex items-center gap-2 ml-2 px-2.5 py-1 rounded-lg bg-forge-surface border border-forge-border">
              {isRunning ? (
                <Loader2 size={11} className="text-forge-accent animate-spin" />
              ) : (
                <CheckCircle2 size={11} className="text-forge-green" />
              )}
              <span className="text-[10px] text-forge-muted">
                {completedCount}/{runAgents.length} agents done
              </span>
              {runningCount > 0 && (
                <span className="text-[10px] text-forge-accent">{runningCount} running</span>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {saveStatus && <span className="text-[10px] text-forge-green font-medium">{saveStatus}</span>}

            {!isRunning && (
              <>
                {selectedNode && (
                  <button onClick={deleteSelected} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-[11px] text-forge-red hover:border-forge-red transition-colors">
                    <Trash2 size={11} /> Delete
                  </button>
                )}
                <button onClick={addTrigger} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-surface border border-purple-500/30 text-[11px] text-purple-400 hover:border-purple-400 transition-colors">
                  <Webhook size={11} /> Trigger
                </button>
                <button onClick={addAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-l-lg bg-forge-surface border border-forge-border text-[11px] text-forge-text hover:border-forge-muted transition-colors">
                  <Plus size={11} /> Agent
                </button>
                <button
                  onClick={openRegistryPicker}
                  className="flex items-center gap-1 px-1.5 py-1.5 rounded-r-lg bg-forge-surface border border-l-0 border-forge-border text-[11px] text-forge-muted hover:text-forge-accent hover:border-forge-muted transition-colors"
                  title="Add from Registry"
                >
                  <ChevronDown size={11} />
                </button>
                <button onClick={addAction} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-surface border border-green-500/30 text-[11px] text-green-400 hover:border-green-400 transition-colors">
                  <Bell size={11} /> Action
                </button>
                <div className="flex items-center gap-0.5 pl-1.5 border-l border-forge-border">
                  <button onClick={exportJson} className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors" title="Export JSON">
                    <Download size={12} />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors" title="Import JSON">
                    <Upload size={12} />
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={importJson} className="hidden" />
                </div>
                <button onClick={save} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-accent text-[11px] text-white hover:bg-orange-500 transition-colors">
                  <Save size={11} /> {saveStatus || "Save"}
                </button>
                <button onClick={exportClaudeMd} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-surface border border-forge-green text-[11px] text-forge-green hover:bg-forge-green/10 transition-colors">
                  <FileDown size={11} /> {exportStatus || "CLAUDE.md"}
                </button>
              </>
            )}

            {/* Workflow toggle — Enable / Disable */}
            {savedArchId && hasTriggers && !isRunning && (
              workflowEnabled ? (
                <button
                  onClick={async () => {
                    await fetch(`/api/workflows/${savedArchId}/disable`, { method: "POST" });
                    setWorkflowEnabled(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border bg-purple-500/20 border-purple-400/40 text-purple-400 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-400 transition-colors group"
                >
                  <Zap size={11} />
                  <span className="group-hover:hidden">Workflow Active</span>
                  <span className="hidden group-hover:inline">Disable Workflow</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await save();
                    setShowRunDialog("workflow");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border bg-forge-surface border-forge-border text-forge-muted hover:text-purple-400 hover:border-purple-400 transition-colors"
                >
                  <Zap size={11} /> Enable Workflow
                </button>
              )
            )}

            {isRunning ? (
              <button onClick={stopRun} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-red/20 border border-forge-red/40 text-[11px] text-forge-red hover:bg-forge-red/30 transition-colors">
                <Square size={11} /> Stop
              </button>
            ) : (
              <button onClick={() => setShowRunDialog(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forge-green text-[11px] text-white font-semibold hover:bg-green-500 transition-colors">
                <Play size={11} /> Run
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" style={{ background: "#0e0e10" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isRunning ? undefined : onNodesChange}
            onEdgesChange={isRunning ? undefined : onEdgesChange}
            onConnect={isRunning ? undefined : onConnect}
            nodeTypes={NODE_TYPES}
            onNodeClick={handleNodeClick}
            onPaneClick={() => { setSelectedNode(null); }}
            nodesDraggable={!isRunning}
            nodesConnectable={!isRunning}
            elementsSelectable={true}
            fitView
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="!bg-forge-surface !border-forge-border" />
            <MiniMap
              nodeColor={(n) => {
                const status = n.data?.runStatus;
                if (status === "running") return "#f97316";
                if (status === "completed") return "#22c55e";
                if (status === "failed") return "#ef4444";
                if (n.type === "triggerNode") return "#a855f7";
                if (n.type === "actionNode") return "#22c55e";
                return "#f97316";
              }}
              maskColor="rgba(14,14,16,0.8)"
              style={{ background: "#18181b", border: "1px solid #27272a" }}
            />
          </ReactFlow>

          {/* Registry picker overlay */}
          {showRegistryPicker && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 w-96 max-h-[400px] bg-forge-surface border border-forge-border rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
                <p className="text-xs font-semibold text-forge-text">Add Agent from Registry</p>
                <button onClick={() => setShowRegistryPicker(false)} className="text-forge-muted hover:text-forge-text">
                  <X size={14} />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[340px] p-2">
                {registryAgents.length === 0 ? (
                  <p className="text-xs text-forge-muted text-center py-6">No agents in registry. Create one in the Agents tab.</p>
                ) : (
                  registryAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => addFromRegistry(agent)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-forge-bg/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-forge-bg flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={14} className="text-forge-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-forge-text">{agent.name}</p>
                          <span className="text-[9px] text-forge-muted capitalize bg-forge-border rounded px-1 py-0.5">{agent.role}</span>
                        </div>
                        {agent.description && (
                          <p className="text-[10px] text-forge-muted mt-0.5 truncate">{agent.description}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Run dialog overlay */}
          {showRunDialog && (
            <RunDialog
              archName={archName}
              agentCount={nodes.length}
              isWorkflowMode={showRunDialog === "workflow"}
              onRun={async (targetDir, autoApprove) => {
                if (showRunDialog === "workflow") {
                  // Enable workflow mode
                  await save();
                  await fetch(`/api/workflows/${savedArchId}/enable`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetDir, autoApprove }),
                  });
                  setWorkflowEnabled(true);
                  setShowRunDialog(false);
                } else {
                  executeArchitecture(targetDir, autoApprove);
                }
              }}
              onClose={() => setShowRunDialog(false)}
            />
          )}

          {/* Agent pipeline status — bottom overlay */}
          {activeRun && (
            <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-forge-surface/95 backdrop-blur-sm border border-forge-border shadow-lg overflow-hidden">
              <div className="flex items-center divide-x divide-forge-border">
                {runAgents.map((a) => (
                  <button
                    key={a.nodeId}
                    onClick={() => {
                      setFocusedAgent(a.nodeId);
                      if (a.status === "completed" && !a.outputFetched) {
                        fetchAgentOutput(a.nodeId);
                      }
                    }}
                    className={clsx(
                      "flex-1 flex flex-col items-start gap-0.5 px-3 py-2 transition-all min-w-0",
                      focusedAgent === a.nodeId
                        ? "bg-forge-accent/10"
                        : "hover:bg-forge-bg/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      {a.status === "running" && <Loader2 size={10} className="animate-spin text-forge-accent shrink-0" />}
                      {a.status === "completed" && <CheckCircle2 size={10} className="text-forge-green shrink-0" />}
                      {a.status === "pending" && <Clock size={10} className="text-forge-muted shrink-0" />}
                      <span className={clsx(
                        "text-[10px] font-semibold truncate",
                        a.status === "running" ? "text-forge-accent" :
                        a.status === "completed" ? "text-forge-green" :
                        "text-forge-muted"
                      )}>
                        {a.label}
                      </span>
                    </div>
                    {a.lastActivity && a.status === "running" && (
                      <p className="text-[8px] text-forge-muted font-mono truncate w-full">{a.lastActivity}</p>
                    )}
                    {a.status === "completed" && (
                      <p className="text-[8px] text-forge-green/70">Done</p>
                    )}
                    {a.status === "pending" && (
                      <p className="text-[8px] text-forge-muted/50">Waiting for upstream</p>
                    )}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              <div className="h-0.5 bg-forge-border">
                <div
                  className="h-full bg-forge-green transition-all duration-500"
                  style={{ width: `${(completedCount / runAgents.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Run summary — shown after run completes */}
          {completedRun && !activeRun?.status?.match?.(/running/) && (
            <RunSummary
              run={completedRun}
              onClose={() => setCompletedRun(null)}
              onViewDiff={() => {
                // Could open a diff viewer — for now just log
                console.log("View diff:", completedRun.gitBefore, "→", completedRun.gitAfter);
              }}
              onViewAgent={(nodeId) => {
                setFocusedAgent(nodeId);
                fetchAgentOutput(nodeId);
              }}
            />
          )}
        </div>
      </div>

      {/* Right panel — Agent terminal/output (during/after run) or Config panel */}
      {showRightPanel ? (
        <>
          {/* Resize handle */}
          <div
            className="w-1 cursor-col-resize bg-forge-border hover:bg-forge-accent/50 transition-colors shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = panelWidth;
              const container = e.target.parentElement;
              const totalWidth = container?.offsetWidth || window.innerWidth;
              function onMove(ev) {
                const delta = startX - ev.clientX;
                const newPct = startWidth + (delta / totalWidth) * 100;
                setPanelWidth(Math.min(70, Math.max(20, newPct)));
              }
              function onUp() {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              }
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
          />
          <div style={{ width: `${panelWidth}%` }} className="flex flex-col bg-forge-bg shrink-0">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-forge-border flex items-center gap-2 shrink-0 bg-forge-surface/50">
              <TerminalIcon size={12} className="text-forge-accent" />
              <span className="text-xs font-semibold text-forge-text">
                {focusedAgentData?.label || "Agent"}
              </span>
              <span className={clsx(
                "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                focusedAgentData?.status === "running"
                  ? "bg-forge-accent/20 text-forge-accent"
                  : focusedAgentData?.status === "completed"
                  ? "bg-forge-green/20 text-forge-green"
                  : "bg-forge-border text-forge-muted"
              )}>
                {focusedAgentData?.status}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {focusedAgentData?.status === "running" && (
                  <button
                    onClick={() => markAgentDone(focusedAgent)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-forge-green/20 border border-forge-green/40 text-forge-green hover:bg-forge-green/30 transition-colors"
                  >
                    <Check size={10} /> Mark Done
                  </button>
                )}
                <button
                  onClick={() => setFocusedAgent(null)}
                  className="p-1 rounded text-forge-muted hover:text-forge-text"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Content: live terminal or static output */}
            <div className="flex-1 min-h-0">
              {focusedTerminalId ? (
                <XTerminal
                  key={focusedTerminalId}
                  terminalId={focusedTerminalId}
                  wsRef={wsRef}
                />
              ) : focusedAgentData?.status === "completed" ? (
                <AgentOutputViewer
                  output={focusedOutput}
                  label={focusedAgentData?.label}
                  onFetch={() => fetchAgentOutput(focusedAgent)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-forge-muted">
                  Waiting for agent to start...
                </div>
              )}
            </div>
          </div>
        </>
      ) : selectedNode && !isRunning ? (
        selectedNode.type === "triggerNode" ? (
          <TriggerPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        ) : selectedNode.type === "actionNode" ? (
          <ActionPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        ) : (
          <CapabilitiesPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        )
      ) : null}
    </div>
  );
}


// ── Agent Output Viewer (for completed agents) ──
function AgentOutputViewer({ output, label, onFetch }) {
  const outputRef = useRef(null);

  useEffect(() => {
    if (!output && onFetch) onFetch();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!output && output !== "") {
    return (
      <div className="flex items-center justify-center h-full text-xs text-forge-muted">
        Loading output...
      </div>
    );
  }

  // Strip ANSI codes for display
  const clean = output
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\r/g, "");

  return (
    <div ref={outputRef} className="h-full overflow-y-auto p-4 font-mono text-[11px] text-forge-text leading-relaxed whitespace-pre-wrap bg-[#0e0e10]">
      {clean || <span className="text-forge-muted">No output captured</span>}
    </div>
  );
}


// ── Run Dialog ──
function RunDialog({ archName, agentCount, isWorkflowMode, onRun, onClose }) {
  const [targetDir, setTargetDir] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [projects, setProjects] = useState([]);
  const [browsePath, setBrowsePath] = useState(null); // null = not browsing, string = current browse dir
  const [browseDirs, setBrowseDirs] = useState([]);
  const [browseParent, setBrowseParent] = useState(null);

  useEffect(() => {
    fetch("/api/fs/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function openBrowser(dir) {
    const url = dir ? `/api/fs/browse?path=${encodeURIComponent(dir)}` : "/api/fs/browse";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setBrowsePath(data.current);
        setBrowseDirs(data.dirs || []);
        setBrowseParent(data.parent || null);
      })
      .catch(() => {});
  }

  return (
    <div className="absolute inset-0 z-20 bg-forge-bg/90 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-forge-surface border border-forge-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-forge-border flex items-center gap-3">
          {isWorkflowMode ? (
            <Zap size={14} className="text-purple-400" />
          ) : (
            <Play size={14} className="text-forge-green" />
          )}
          <div>
            <p className="text-sm font-semibold text-forge-text">
              {isWorkflowMode ? `Enable Workflow "${archName}"` : `Run "${archName}"`}
            </p>
            <p className="text-[10px] text-forge-muted">
              {isWorkflowMode
                ? "Workflow will auto-execute when triggers fire"
                : `${agentCount} agents · Root agents start first, children start when parents finish`}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded text-forge-muted hover:text-forge-text">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Target Directory</label>
            <div className="flex gap-1.5">
              <input
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="~/projects/my-app"
                className="flex-1 bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono placeholder:text-forge-muted outline-none focus:border-forge-muted"
              />
              <button
                onClick={() => openBrowser(targetDir || null)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-forge-bg border border-forge-border text-[11px] text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors shrink-0"
              >
                <FolderOpen size={12} /> Browse
              </button>
            </div>
          </div>

          {/* Folder browser */}
          {browsePath !== null && (
            <div className="bg-forge-bg border border-forge-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-forge-border flex items-center gap-2 bg-forge-surface/50">
                {browseParent && browseParent !== browsePath && (
                  <button
                    onClick={() => openBrowser(browseParent)}
                    className="p-1 rounded text-forge-muted hover:text-forge-text transition-colors"
                    title="Go up"
                  >
                    <ChevronDown size={12} className="rotate-90" />
                  </button>
                )}
                <p className="text-[10px] text-forge-muted font-mono truncate flex-1">{browsePath}</p>
                <button
                  onClick={() => { setTargetDir(browsePath); setBrowsePath(null); }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-forge-accent/20 text-forge-accent hover:bg-forge-accent/30 transition-colors shrink-0"
                >
                  <Check size={10} /> Select
                </button>
                <button
                  onClick={() => setBrowsePath(null)}
                  className="p-0.5 rounded text-forge-muted hover:text-forge-text"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {browseDirs.length === 0 ? (
                  <p className="text-[10px] text-forge-muted text-center py-4">No subdirectories</p>
                ) : (
                  browseDirs.map((d) => (
                    <button
                      key={d.path}
                      onClick={() => openBrowser(d.path)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-forge-surface/50 transition-colors"
                    >
                      <FolderOpen size={11} className="text-forge-accent shrink-0" />
                      <span className="text-[11px] text-forge-text truncate">{d.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Quick-pick projects */}
          {browsePath === null && projects.length > 0 && (
            <div>
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Projects</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {projects.slice(0, 12).map((p) => (
                  <button
                    key={p.path}
                    onClick={() => setTargetDir(p.path)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-[10px] border transition-colors",
                      targetDir === p.path
                        ? "bg-forge-accent/20 border-forge-accent text-forge-accent"
                        : "bg-forge-bg border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-muted"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setAutoApprove(!autoApprove)}
              className={clsx(
                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer",
                autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
              )}
            >
              {autoApprove && (
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span className="text-[10px] text-forge-muted">Auto-approve all tool calls</span>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-forge-border flex items-center gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-forge-muted hover:text-forge-text transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onRun(targetDir, autoApprove)}
            disabled={!targetDir}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forge-green text-xs text-white font-semibold hover:bg-green-500 disabled:opacity-40 transition-colors"
          >
            {isWorkflowMode ? <Zap size={12} /> : <Play size={12} />}
            {isWorkflowMode ? "Enable Workflow" : `Launch ${agentCount} Agents`}
          </button>
        </div>
      </div>
    </div>
  );
}
