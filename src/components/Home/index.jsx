import React, { useState, useEffect } from "react";
import {
  Hammer,
  Activity,
  DollarSign,
  GitBranch,
  Terminal,
  Plus,
  Compass,
  BookOpen,
  BarChart3,
  Clock,
  Circle,
  ChevronRight,
  Server,
  HardDrive,
  Plug,
  Loader2,
} from "lucide-react";
import clsx from "clsx";

function navigate(view) {
  window.dispatchEvent(new CustomEvent("navigate-to", { detail: view }));
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Home() {
  const [health, setHealth] = useState(null);
  const [costs, setCosts] = useState(null);
  const [agents, setAgents] = useState(null);
  const [terminals, setTerminals] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [workflows, setWorkflows] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    const results = await Promise.allSettled([
      fetch("/api/health").then((r) => r.json()),
      fetch("/api/costs").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/terminal/list").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/workflows").then((r) => r.json()),
    ]);

    if (results[0].status === "fulfilled") setHealth(results[0].value);
    if (results[1].status === "fulfilled") setCosts(results[1].value);
    if (results[2].status === "fulfilled") setAgents(results[2].value);
    if (results[3].status === "fulfilled") setTerminals(results[3].value);
    if (results[4].status === "fulfilled") setSessions(results[4].value);
    if (results[5].status === "fulfilled") setWorkflows(results[5].value);
    setLoading(false);
  }

  const sessionList = Array.isArray(sessions) ? sessions : sessions ? Object.values(sessions) : [];
  const activeSessions = sessionList.filter((s) => s.status === "active" || s.status === "running");
  const agentList = Array.isArray(agents) ? agents : [];
  const terminalList = Array.isArray(terminals) ? terminals : [];
  const workflowList = Array.isArray(workflows) ? workflows : [];
  const enabledWorkflows = workflowList.filter((w) => w.enabled);
  const recentSessions = [...sessionList]
    .sort((a, b) => new Date(b.updatedAt || b.startedAt || 0) - new Date(a.updatedAt || a.startedAt || 0))
    .slice(0, 5);
  const todayCost = costs?.today?.cost ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-forge-muted">
        <Loader2 size={16} className="animate-spin mr-2" />
        <span className="text-xs">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-forge-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-forge-accent/10 flex items-center justify-center">
              <Hammer size={16} className="text-forge-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-forge-text tracking-tight">Forge</h1>
              <p className="text-[11px] text-forge-muted">The operating system for Claude Code</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Circle
              size={8}
              className={clsx("fill-current", health ? "text-forge-green" : "text-forge-red")}
            />
            <span className="text-[10px] text-forge-muted">
              {health ? "System healthy" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="p-6 grid grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label="Active Sessions"
          value={activeSessions.length}
          sub={`${sessionList.length} total`}
          color="text-forge-green"
        />
        <StatCard
          icon={DollarSign}
          label="Today's Cost"
          value={`$${todayCost.toFixed(2)}`}
          sub={costs?.today?.tokens ? `${formatTokens(costs.today.tokens)} tokens` : null}
          color="text-forge-accent"
        />
        <StatCard
          icon={GitBranch}
          label="Workflows"
          value={agentList.length}
          sub={enabledWorkflows.length > 0 ? `${enabledWorkflows.length} active` : null}
          color="text-purple-400"
        />
        <StatCard
          icon={Terminal}
          label="Terminals"
          value={terminalList.length}
          sub="active"
          color="text-sky-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-5">
        <h2 className="text-[10px] font-semibold text-forge-muted uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <ActionButton
            icon={Plus}
            label="New Terminal"
            desc="Launch Claude Code"
            onClick={() => navigate("messenger")}
          />
          <ActionButton
            icon={Compass}
            label="Design Workflow"
            desc="Build agent architectures"
            onClick={() => navigate("architect")}
          />
          <ActionButton
            icon={BookOpen}
            label="Browse Prompts"
            desc="Explore prompt library"
            onClick={() => navigate("prompts")}
          />
          <ActionButton
            icon={BarChart3}
            label="View Costs"
            desc="Usage and spending"
            onClick={() => navigate("costs")}
          />
        </div>
      </div>

      {/* Two column: Recent Activity + Active Workflows */}
      <div className="px-6 pb-5 grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Recent Activity */}
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-forge-accent" />
              <h2 className="text-xs font-semibold text-forge-text">Recent Activity</h2>
            </div>
            <button
              onClick={() => navigate("sessions")}
              className="text-[10px] text-forge-muted hover:text-forge-text transition-colors flex items-center gap-0.5"
            >
              View all <ChevronRight size={10} />
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {recentSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px] text-forge-muted">No sessions yet. Start one from Quick Actions.</p>
              </div>
            ) : (
              recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    navigate("sessions");
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-border/50 transition-colors text-left group"
                >
                  <Circle
                    size={6}
                    className={clsx(
                      "fill-current flex-shrink-0",
                      s.status === "active" || s.status === "running"
                        ? "text-forge-green"
                        : "text-forge-muted"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-forge-text font-medium truncate">
                      {s.name || s.project || s.id?.slice(0, 12)}
                    </p>
                    <p className="text-[10px] text-forge-muted truncate">
                      {s.project && s.name ? s.project : s.status || "unknown"}
                    </p>
                  </div>
                  <span className="text-[10px] text-forge-muted flex-shrink-0">
                    {timeAgo(s.updatedAt || s.startedAt)}
                  </span>
                  <ChevronRight
                    size={10}
                    className="text-forge-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active Workflows */}
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch size={12} className="text-purple-400" />
              <h2 className="text-xs font-semibold text-forge-text">Active Workflows</h2>
            </div>
            <button
              onClick={() => navigate("architect")}
              className="text-[10px] text-forge-muted hover:text-forge-text transition-colors flex items-center gap-0.5"
            >
              Manage <ChevronRight size={10} />
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {enabledWorkflows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px] text-forge-muted">No active workflows. Design one to get started.</p>
              </div>
            ) : (
              enabledWorkflows.slice(0, 5).map((w) => (
                <div
                  key={w.id || w.name}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-forge-border/50 transition-colors"
                >
                  <div
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      w.status === "running" ? "bg-forge-green animate-pulse" : "bg-forge-accent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-forge-text font-medium truncate">
                      {w.name || w.id}
                    </p>
                    <p className="text-[10px] text-forge-muted truncate">
                      {w.description || w.type || "workflow"}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      w.status === "running"
                        ? "bg-forge-green/10 text-forge-green"
                        : "bg-forge-border text-forge-muted"
                    )}
                  >
                    {w.status || "enabled"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Info Footer */}
      <div className="px-6 py-3 border-t border-forge-border mt-auto">
        <div className="flex items-center gap-6 text-[10px] text-forge-muted">
          <div className="flex items-center gap-1.5">
            <Server size={10} />
            <span>{health?.version ? `v${health.version}` : "Forge Server"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Plug size={10} />
            <span>{health?.integrations ?? 0} integrations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={10} />
            <span>~/.claude/forge/</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-4 hover:border-forge-muted/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={color} />
        <span className="text-[10px] text-forge-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className={clsx("text-lg font-bold", color)}>{value}</p>
      {sub && <p className="text-[10px] text-forge-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function ActionButton({ icon: Icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-forge-surface border border-forge-border rounded-xl p-4 text-left hover:border-forge-muted/50 hover:bg-forge-surface/80 transition-all group"
    >
      <div className="w-7 h-7 rounded-lg bg-forge-accent/10 flex items-center justify-center mb-2.5 group-hover:bg-forge-accent/20 transition-colors">
        <Icon size={14} className="text-forge-accent" />
      </div>
      <p className="text-[11px] font-semibold text-forge-text mb-0.5">{label}</p>
      <p className="text-[10px] text-forge-muted leading-snug">{desc}</p>
    </button>
  );
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}
