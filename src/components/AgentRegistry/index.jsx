import React, { useState, useEffect, useRef } from "react";
import {
  Bot, Plus, Search, Shield, FlaskConical, Eye, Wrench, BookOpen, Zap,
  Globe, Database, Code, Trash2, Copy, Download, Upload, Edit3, X, Check,
  Crown, Map, ChevronRight, Tag, FolderOpen,
} from "lucide-react";
import clsx from "clsx";

const ICON_MAP = {
  shield: Shield,
  flask: FlaskConical,
  eye: Eye,
  wrench: Wrench,
  book: BookOpen,
  zap: Zap,
  globe: Globe,
  database: Database,
  code: Code,
  bot: Bot,
  crown: Crown,
  map: Map,
};

const ROLE_COLORS = {
  supervisor: "text-forge-accent",
  worker: "text-forge-muted",
  reviewer: "text-blue-400",
  tester: "text-green-400",
  planner: "text-purple-400",
};

export function AgentRegistry() {
  const [agents, setAgents] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, global, project
  const [editing, setEditing] = useState(null); // agent being edited
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAgents();
    fetchPresets();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/registry");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {}
    setLoading(false);
  }

  async function fetchPresets() {
    try {
      const res = await fetch("/api/registry/presets");
      const data = await res.json();
      setPresets(data.presets || []);
    } catch {}
  }

  async function saveAgent(agent) {
    await fetch("/api/registry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agent),
    });
    fetchAgents();
    setEditing(null);
  }

  async function deleteAgent(id) {
    await fetch(`/api/registry/${id}`, { method: "DELETE" });
    fetchAgents();
  }

  async function duplicateAgent(id) {
    await fetch(`/api/registry/${id}/duplicate`, { method: "POST" });
    fetchAgents();
  }

  function createFromPreset(preset) {
    const agent = {
      ...preset,
      id: undefined,
      scope: "global",
    };
    setEditing(agent);
    setShowPresets(false);
  }

  function newAgent() {
    setEditing({
      name: "New Agent",
      description: "",
      role: "worker",
      systemPrompt: "",
      capabilities: ["read_files"],
      fileRestrictions: [],
      tags: [],
      scope: "global",
      icon: "bot",
    });
  }

  function importAgent(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await fetch("/api/registry/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent: data, scope: "global" }),
        });
        fetchAgents();
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function exportAgent(id) {
    const res = await fetch(`/api/registry/${id}/export`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name?.replace(/\s+/g, "-").toLowerCase() || "agent"}.agent.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = agents.filter((a) => {
    if (filter !== "all" && a.scope !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q)) ||
        a.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Edit panel ──
  if (editing) {
    return (
      <AgentEditor
        agent={editing}
        onSave={saveAgent}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
        <Bot size={16} className="text-forge-accent" />
        <h2 className="text-sm font-semibold text-forge-text">Agent Registry</h2>
        <span className="text-[10px] text-forge-muted bg-forge-border px-2 py-0.5 rounded-full">
          {agents.length} agents
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
              showPresets
                ? "bg-forge-accent text-white"
                : "bg-forge-surface border border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-muted"
            )}
          >
            <Zap size={12} />
            Presets
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors"
          >
            <Upload size={12} />
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importAgent} className="hidden" />
          <button
            onClick={newAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
          >
            <Plus size={12} />
            New Agent
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-forge-border/50">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full bg-forge-surface border border-forge-border rounded-lg pl-8 pr-3 py-2 text-xs text-forge-text placeholder:text-forge-muted outline-none focus:border-forge-muted"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "global", "project"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors capitalize",
                filter === f
                  ? "bg-forge-accent/20 text-forge-accent"
                  : "text-forge-muted hover:text-forge-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Presets */}
        {showPresets && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-3">
              Agent Presets — Click to customize and save
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset) => {
                const Icon = ICON_MAP[preset.icon] || Bot;
                return (
                  <button
                    key={preset.id}
                    onClick={() => createFromPreset(preset)}
                    className="flex items-start gap-3 p-4 rounded-xl bg-forge-surface border border-forge-border hover:border-forge-muted transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-forge-bg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon size={16} className={ROLE_COLORS[preset.role] || "text-forge-muted"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-forge-text mb-0.5">{preset.name}</p>
                      <p className="text-[10px] text-forge-muted leading-relaxed">{preset.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={clsx("text-[9px] font-medium capitalize", ROLE_COLORS[preset.role])}>
                          {preset.role}
                        </span>
                        {preset.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] text-forge-muted bg-forge-border rounded px-1 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent list */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-forge-muted text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-forge-muted">
            <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
              <Bot size={28} className="text-forge-accent" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-forge-text mb-1">
                {search ? "No agents match your search" : "No agents yet"}
              </p>
              <p className="text-xs text-forge-muted max-w-xs">
                Create reusable agents that can be used across workflows and projects.
                Start from a preset or build your own.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPresets(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-muted hover:text-forge-text transition-colors"
              >
                <Zap size={12} /> Browse presets
              </button>
              <button
                onClick={newAgent}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
              >
                <Plus size={12} /> Create agent
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((agent) => {
              const Icon = ICON_MAP[agent.icon] || Bot;
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-forge-surface border border-forge-border hover:border-forge-muted transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-forge-bg flex items-center justify-center shrink-0">
                    <Icon size={16} className={ROLE_COLORS[agent.role] || "text-forge-muted"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-forge-text">{agent.name}</p>
                      <span className={clsx(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        agent.scope === "global"
                          ? "bg-forge-accent/20 text-forge-accent"
                          : "bg-blue-500/20 text-blue-400"
                      )}>
                        {agent.scope}
                      </span>
                    </div>
                    <p className="text-[10px] text-forge-muted mt-0.5 truncate">{agent.description}</p>
                    {agent.tags?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {agent.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[9px] text-forge-muted bg-forge-border rounded px-1 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditing({ ...agent })}
                      className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => duplicateAgent(agent.id)}
                      className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => exportAgent(agent.id)}
                      className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors"
                      title="Export"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      className="p-1.5 rounded-md text-forge-muted hover:text-forge-red hover:bg-forge-red/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Agent Editor ──
function AgentEditor({ agent, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: agent.name || "",
    description: agent.description || "",
    role: agent.role || "worker",
    systemPrompt: agent.systemPrompt || "",
    capabilities: agent.capabilities || [],
    fileRestrictions: agent.fileRestrictions || [],
    tags: agent.tags || [],
    scope: agent.scope || "global",
    icon: agent.icon || "bot",
    ...agent,
  });
  const [tagInput, setTagInput] = useState("");
  const [restrictionInput, setRestrictionInput] = useState(
    (agent.fileRestrictions || []).join(", ")
  );

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleCapability(cap) {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter((c) => c !== cap)
        : [...f.capabilities, cap],
    }));
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      update("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag) {
    update("tags", form.tags.filter((t) => t !== tag));
  }

  function handleSave() {
    const restrictions = restrictionInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      ...form,
      fileRestrictions: restrictions,
    });
  }

  const CAPABILITIES = [
    { id: "read_files", label: "Read Files" },
    { id: "write_files", label: "Write Files" },
    { id: "run_commands", label: "Run Commands" },
    { id: "spawn_agents", label: "Spawn Agents" },
    { id: "github_read", label: "GitHub Read" },
    { id: "github_pr", label: "GitHub PR" },
    { id: "web_search", label: "Web Search" },
  ];

  const ICONS = [
    "bot", "shield", "flask", "eye", "wrench", "book",
    "zap", "globe", "database", "code", "crown", "map",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
        <Bot size={16} className="text-forge-accent" />
        <h2 className="text-sm font-semibold text-forge-text">
          {agent.id ? "Edit Agent" : "New Agent"}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-forge-muted hover:text-forge-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
          >
            <Check size={12} />
            Save Agent
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto flex flex-col gap-5">
          {/* Icon + Name */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-forge-muted uppercase tracking-wider">Icon</label>
              <div className="flex flex-wrap gap-1 w-24">
                {ICONS.map((iconName) => {
                  const Ic = ICON_MAP[iconName] || Bot;
                  return (
                    <button
                      key={iconName}
                      onClick={() => update("icon", iconName)}
                      className={clsx(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                        form.icon === iconName
                          ? "bg-forge-accent text-white"
                          : "bg-forge-surface border border-forge-border text-forge-muted hover:text-forge-text"
                      )}
                    >
                      <Ic size={12} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
                />
              </div>
              <div>
                <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
                  placeholder="What does this agent do?"
                />
              </div>
            </div>
          </div>

          {/* Role + Scope */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Role</label>
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none"
              >
                <option value="worker">Worker</option>
                <option value="supervisor">Supervisor</option>
                <option value="reviewer">Reviewer</option>
                <option value="tester">Tester</option>
                <option value="planner">Planner</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => update("scope", e.target.value)}
                className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none"
              >
                <option value="global">Global — available everywhere</option>
                <option value="project">Project — specific to working directory</option>
              </select>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
              rows={5}
              className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono resize-y outline-none focus:border-forge-muted"
              placeholder="Instructions for the agent..."
            />
          </div>

          {/* Capabilities */}
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-2 block">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITIES.map((cap) => (
                <button
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  className={clsx(
                    "px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors",
                    form.capabilities.includes(cap.id)
                      ? "bg-forge-accent/20 border-forge-accent/40 text-forge-accent"
                      : "bg-forge-surface border-forge-border text-forge-muted hover:text-forge-text"
                  )}
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {/* File Restrictions */}
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">
              File Restrictions (comma-separated globs)
            </label>
            <input
              value={restrictionInput}
              onChange={(e) => setRestrictionInput(e.target.value)}
              className="w-full bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono outline-none focus:border-forge-muted"
              placeholder="src/**, tests/**, **/*.ts"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Tags</label>
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="flex-1 bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
                placeholder="Add tag and press Enter"
              />
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-forge-border text-[10px] text-forge-muted"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-forge-text">
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
