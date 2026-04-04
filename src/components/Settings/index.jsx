import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Server, HardDrive, Shield, RefreshCw,
  Trash2, Download, ExternalLink, Info, Clock, Cpu,
} from "lucide-react";
import clsx from "clsx";

export function Settings() {
  const [health, setHealth] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [clearing, setClearing] = useState(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    fetch("/api/settings/storage").then((r) => r.json()).then(setStorageInfo).catch(() => {});
  }, []);

  async function clearData(type) {
    setClearing(type);
    try {
      await fetch(`/api/settings/clear/${type}`, { method: "POST" });
      // Re-fetch storage info
      const res = await fetch("/api/settings/storage");
      setStorageInfo(await res.json());
    } catch {}
    setClearing(null);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-forge-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forge-accent/10 flex items-center justify-center">
            <SettingsIcon size={16} className="text-forge-accent" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-forge-text tracking-tight">Settings</h1>
            <p className="text-[11px] text-forge-muted">Server configuration and data management</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Server Info */}
        <Section title="Server" icon={Server}>
          <InfoRow label="Status" value={health ? "Running" : "Connecting..."} valueClass={health ? "text-forge-green" : "text-forge-muted"} />
          <InfoRow label="Version" value={health?.version || "—"} />
          <InfoRow label="Port" value={typeof window !== "undefined" ? window.location.port || "3333" : "3333"} />
          <InfoRow label="PID" value={health?.pid || "—"} />
          <InfoRow label="Uptime" value={health?.uptime ? formatUptime(health.uptime) : "—"} />
        </Section>

        {/* System Stats */}
        <Section title="Current State" icon={Cpu}>
          <InfoRow label="Total Sessions" value={health?.sessions?.total ?? "—"} />
          <InfoRow label="Active Sessions" value={health?.sessions?.active ?? "—"} />
          <InfoRow label="Open Terminals" value={health?.terminals ?? "—"} />
        </Section>

        {/* Storage */}
        <Section title="Data Storage" icon={HardDrive}>
          <p className="text-[11px] text-forge-muted mb-3">
            All data is stored locally at <code className="text-forge-text bg-forge-bg px-1.5 py-0.5 rounded text-[10px]">~/.claude/forge/</code>
          </p>
          {storageInfo ? (
            <div className="space-y-2">
              <StorageRow label="Architectures" count={storageInfo.architectures ?? 0} onClear={() => clearData("architectures")} clearing={clearing === "architectures"} />
              <StorageRow label="Cost History" count={storageInfo.costs ?? 0} onClear={() => clearData("costs")} clearing={clearing === "costs"} />
              <StorageRow label="Prompts" count={storageInfo.prompts ?? 0} onClear={() => clearData("prompts")} clearing={clearing === "prompts"} />
              <StorageRow label="Agent Registry" count={storageInfo.agents ?? 0} onClear={() => clearData("agents")} clearing={clearing === "agents"} />
              <StorageRow label="Notifications" count={storageInfo.notifications ?? 0} onClear={() => clearData("notifications")} clearing={clearing === "notifications"} />
            </div>
          ) : (
            <p className="text-[11px] text-forge-muted">Loading storage info...</p>
          )}
        </Section>

        {/* About */}
        <Section title="About" icon={Info}>
          <p className="text-[11px] text-forge-muted leading-relaxed mb-3">
            Forge is the operating system for Claude Code — a local-first orchestration platform
            that gives you visibility, control, and multi-agent power on top of your existing
            Claude Code sessions.
          </p>
          <div className="flex gap-2">
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-[11px] text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors"
            >
              <ExternalLink size={10} /> Claude Code
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} className="text-forge-accent" />
        <h2 className="text-xs font-semibold text-forge-text">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-forge-border/50 last:border-0">
      <span className="text-[11px] text-forge-muted">{label}</span>
      <span className={clsx("text-[11px] font-medium", valueClass || "text-forge-text")}>{value}</span>
    </div>
  );
}

function StorageRow({ label, count, onClear, clearing }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-forge-muted">{label}</span>
        <span className="text-[10px] text-forge-muted bg-forge-bg px-1.5 py-0.5 rounded">{count} items</span>
      </div>
      <button
        onClick={onClear}
        disabled={clearing}
        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-forge-muted hover:text-forge-red hover:bg-forge-red/10 transition-colors disabled:opacity-50"
      >
        {clearing ? <RefreshCw size={9} className="animate-spin" /> : <Trash2 size={9} />}
        Clear
      </button>
    </div>
  );
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
