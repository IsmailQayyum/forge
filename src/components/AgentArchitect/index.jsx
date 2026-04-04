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
import { CapabilitiesPanel } from "./CapabilitiesPanel.jsx";
import { XTerminal } from "../Messenger/XTerminal.jsx";
import {
  GitBranch, Plus, Save, Trash2, FileDown, Play, Upload, Download,
  ChevronDown, FolderOpen, Layers, Zap, Shield, Code, Bug, BookOpen,
  X, Check, MoreHorizontal, Square, Clock, CheckCircle2, Loader2,
  Terminal as TerminalIcon,
} from "lucide-react";
import clsx from "clsx";

const NODE_TYPES = { agentNode: AgentNode };

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
    description: "Security reviewer, code reviewer, and test validator analyze a pull request",
    icon: Shield,
    color: "text-forge-green",
    nodes: [
      { id: "lead", type: "agentNode", position: { x: 300, y: 50 }, data: { label: "Review Lead", role: "supervisor", capabilities: ["read_files", "run_commands", "spawn_agents", "github_read", "github_pr"], systemPrompt: "You coordinate PR reviews. Gather findings from security, code quality, and test agents, then write a consolidated review comment." } },
      { id: "security", type: "agentNode", position: { x: 80, y: 220 }, data: { label: "Security Reviewer", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Audit the code for OWASP Top 10 vulnerabilities, injection risks, auth issues, and secret leaks. Report findings with severity levels." } },
      { id: "quality", type: "agentNode", position: { x: 350, y: 220 }, data: { label: "Code Quality", role: "reviewer", capabilities: ["read_files", "run_commands"], systemPrompt: "Review code for maintainability, naming conventions, error handling, and adherence to project patterns. Suggest improvements." } },
      { id: "tests", type: "agentNode", position: { x: 620, y: 220 }, data: { label: "Test Validator", role: "tester", capabilities: ["read_files", "run_commands"], systemPrompt: "Run the existing test suite, check for regressions, and verify that new code has adequate test coverage." } },
    ],
    edges: [
      { id: "e1", source: "lead", target: "security", animated: true, style: { stroke: "#f97316" } },
      { id: "e2", source: "lead", target: "quality", animated: true, style: { stroke: "#f97316" } },
      { id: "e3", source: "lead", target: "tests", animated: true, style: { stroke: "#f97316" } },
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
  const [activeRun, setActiveRun] = useState(null); // { runId, agents: { nodeId: { status, terminalId, label } } }
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [focusedAgent, setFocusedAgent] = useState(null); // nodeId of agent whose terminal to show
  const wsRef = useRef(null);

  const saveArchitecture = useForgeStore((s) => s.saveArchitecture);

  // ── WebSocket ref ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__forgeWs && window.__forgeWs.readyState === 1) {
        wsRef.current = window.__forgeWs;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ── Listen for run events ──
  useEffect(() => {
    function handleWs(event) {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "RUN_STARTED" && msg.payload) {
          const { runId, agents } = msg.payload;
          const agentMap = {};
          for (const a of agents) {
            agentMap[a.nodeId] = { ...a };
          }
          setActiveRun({ runId, agents: agentMap });
        }

        if (msg.type === "AGENT_STATUS" && msg.payload) {
          const { runId, nodeId, status, terminalId, label } = msg.payload;
          setActiveRun((prev) => {
            if (!prev || prev.runId !== runId) return prev;
            return {
              ...prev,
              agents: {
                ...prev.agents,
                [nodeId]: { ...prev.agents[nodeId], status, terminalId, label },
              },
            };
          });
          // Update node data with run status for visual indicators
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
          const { nodeId, activity } = msg.payload;
          // Update node data with live activity text
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, runActivity: activity } } : n
            )
          );
          // Update run state for bottom bar
          setActiveRun((prev) => {
            if (!prev) return prev;
            const agent = prev.agents[nodeId];
            if (!agent) return prev;
            return {
              ...prev,
              agents: { ...prev.agents, [nodeId]: { ...agent, lastActivity: activity } },
            };
          });
        }

        if (msg.type === "RUN_COMPLETED" && msg.payload) {
          setActiveRun((prev) => {
            if (!prev || prev.runId !== msg.payload.runId) return prev;
            return { ...prev, status: "completed" };
          });
          // Clear run status from nodes
          setNodes((nds) =>
            nds.map((n) => ({ ...n, data: { ...n.data, runActivity: undefined } }))
          );
        }
      } catch {}
    }

    const ws = wsRef.current;
    if (ws) {
      ws.addEventListener("message", handleWs);
      return () => ws.removeEventListener("message", handleWs);
    }
  }, [wsRef.current]);

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
    setActiveRun(null);
    setFocusedAgent(null);
  }

  function loadTemplate(template) {
    setNodes(template.nodes);
    setEdges(template.edges);
    setArchName(template.name);
    setSavedArchId(null);
    setSelectedNode(null);
    setShowList(false);
    setShowTemplates(false);
    setActiveRun(null);
    setFocusedAgent(null);
  }

  function newArchitecture() {
    setNodes(EMPTY_ARCH.nodes);
    setEdges([]);
    setArchName("New Architecture");
    setSavedArchId(null);
    setSelectedNode(null);
    setShowList(false);
    setActiveRun(null);
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

    // Save first
    const id = savedArchId || `arch-${Date.now()}`;
    const arch = { id, name: archName, nodes, edges, updatedAt: Date.now() };
    setSavedArchId(id);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arch),
    });

    // Mark all nodes as pending
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: "pending" } })));

    try {
      const res = await fetch(`/api/agents/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDir, autoApprove }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Execute error:", data.error);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined } })));
      }
      // Run started — WS events will update status
    } catch (err) {
      console.error("Failed to execute:", err);
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined } })));
    }
  }

  function stopRun() {
    setActiveRun(null);
    setFocusedAgent(null);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined } })));
  }

  async function markAgentDone(nodeId) {
    if (!activeRun) return;
    await fetch(`/api/agents/runs/${activeRun.runId}/agents/${nodeId}/complete`, { method: "POST" });
  }

  // Click node — during run, focus the agent's terminal. Otherwise, select for config.
  function handleNodeClick(_, node) {
    if (activeRun && activeRun.agents[node.id]?.terminalId) {
      setFocusedAgent(node.id);
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setFocusedAgent(null);
    }
  }

  // ── Derived state ──
  const isRunning = activeRun && activeRun.status !== "completed";
  const runAgents = activeRun ? Object.values(activeRun.agents) : [];
  const completedCount = runAgents.filter((a) => a.status === "completed").length;
  const runningCount = runAgents.filter((a) => a.status === "running").length;
  const focusedTerminalId = focusedAgent && activeRun?.agents[focusedAgent]?.terminalId;

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
      <div className={clsx("flex flex-col min-w-0", focusedTerminalId ? "w-[55%]" : "flex-1")}>
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
                <button onClick={addAgent} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-[11px] text-forge-text hover:border-forge-muted transition-colors">
                  <Plus size={11} /> Agent
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
                return "#f97316";
              }}
              maskColor="rgba(14,14,16,0.8)"
              style={{ background: "#18181b", border: "1px solid #27272a" }}
            />
          </ReactFlow>

          {/* Run dialog overlay */}
          {showRunDialog && (
            <RunDialog
              archName={archName}
              agentCount={nodes.length}
              onRun={executeArchitecture}
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
                    onClick={() => setFocusedAgent(a.nodeId)}
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
        </div>
      </div>

      {/* Right panel — Agent terminal (during run) or Config panel */}
      {focusedTerminalId ? (
        <div className="w-[45%] border-l border-forge-border flex flex-col bg-forge-bg">
          {/* Terminal header */}
          <div className="px-3 py-2 border-b border-forge-border flex items-center gap-2 shrink-0 bg-forge-surface/50">
            <TerminalIcon size={12} className="text-forge-accent" />
            <span className="text-xs font-semibold text-forge-text">
              {activeRun?.agents[focusedAgent]?.label || "Agent Terminal"}
            </span>
            <span className={clsx(
              "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
              activeRun?.agents[focusedAgent]?.status === "running"
                ? "bg-forge-accent/20 text-forge-accent"
                : activeRun?.agents[focusedAgent]?.status === "completed"
                ? "bg-forge-green/20 text-forge-green"
                : "bg-forge-border text-forge-muted"
            )}>
              {activeRun?.agents[focusedAgent]?.status}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {activeRun?.agents[focusedAgent]?.status === "running" && (
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
          {/* Terminal */}
          <div className="flex-1 min-h-0">
            <XTerminal
              key={focusedTerminalId}
              terminalId={focusedTerminalId}
              wsRef={wsRef}
            />
          </div>
        </div>
      ) : selectedNode && !isRunning ? (
        <CapabilitiesPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNode(null)}
        />
      ) : null}
    </div>
  );
}


// ── Run Dialog ──
function RunDialog({ archName, agentCount, onRun, onClose }) {
  const [targetDir, setTargetDir] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch("/api/fs/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-forge-bg/90 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-forge-surface border border-forge-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-forge-border flex items-center gap-3">
          <Play size={14} className="text-forge-green" />
          <div>
            <p className="text-sm font-semibold text-forge-text">Run "{archName}"</p>
            <p className="text-[10px] text-forge-muted">
              {agentCount} agents · Root agents start first, children start when parents finish
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded text-forge-muted hover:text-forge-text">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Target Directory</label>
            <input
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="~/projects/my-app"
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono placeholder:text-forge-muted outline-none focus:border-forge-muted"
            />
          </div>

          {projects.length > 0 && (
            <div>
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Or pick a project</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {projects.slice(0, 8).map((p) => (
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
            <Play size={12} />
            Launch {agentCount} Agents
          </button>
        </div>
      </div>
    </div>
  );
}
