import React, { useState } from "react";
import { X, GitPullRequest, Globe, Clock, Play } from "lucide-react";
import clsx from "clsx";

const TRIGGER_TYPES = [
  { id: "manual", label: "Manual", icon: Play, desc: "Triggered manually from Forge UI" },
  { id: "github_pr", label: "GitHub PR", icon: GitPullRequest, desc: "Fires when a PR is opened or updated" },
  { id: "webhook", label: "Webhook", icon: Globe, desc: "Fires on incoming HTTP request" },
  { id: "cron", label: "Cron Schedule", icon: Clock, desc: "Runs on a time schedule" },
];

export function TriggerPanel({ node, onUpdate, onClose }) {
  const data = node?.data || {};
  const [triggerType, setTriggerType] = useState(data.triggerType || "manual");
  const [label, setLabel] = useState(data.label || "");
  const [config, setConfig] = useState(data.config || {});

  function handleTypeChange(type) {
    setTriggerType(type);
    setConfig({});
    onUpdate({ triggerType: type, config: {} });
  }

  function updateConfig(key, val) {
    const newConfig = { ...config, [key]: val };
    setConfig(newConfig);
    onUpdate({ config: newConfig });
  }

  return (
    <div className="w-72 border-l border-forge-border flex flex-col bg-forge-surface">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <p className="text-xs font-semibold text-forge-text">Trigger Config</p>
        <button onClick={onClose} className="text-forge-muted hover:text-forge-text">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Label */}
        <div>
          <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Label</label>
          <input
            value={label}
            onChange={(e) => { setLabel(e.target.value); onUpdate({ label: e.target.value }); }}
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
          />
        </div>

        {/* Trigger Type */}
        <div>
          <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-2 block">Trigger Type</label>
          <div className="flex flex-col gap-1.5">
            {TRIGGER_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                    triggerType === t.id
                      ? "bg-purple-500/20 border border-purple-400/40"
                      : "bg-forge-bg border border-forge-border hover:border-forge-muted"
                  )}
                >
                  <Icon size={12} className={triggerType === t.id ? "text-purple-400" : "text-forge-muted"} />
                  <div>
                    <p className="text-[10px] font-semibold text-forge-text">{t.label}</p>
                    <p className="text-[9px] text-forge-muted">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type-specific config */}
        {triggerType === "github_pr" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Repository</label>
              <input
                value={config.repo || ""}
                onChange={(e) => updateConfig("repo", e.target.value)}
                placeholder="owner/repo"
                className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono outline-none focus:border-forge-muted"
              />
            </div>
            <div>
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Events</label>
              <div className="flex flex-wrap gap-1">
                {["opened", "synchronize", "review_requested"].map((ev) => (
                  <button
                    key={ev}
                    onClick={() => {
                      const events = config.events || [];
                      const newEvents = events.includes(ev) ? events.filter((e) => e !== ev) : [...events, ev];
                      updateConfig("events", newEvents);
                    }}
                    className={clsx(
                      "px-2 py-1 rounded text-[9px] border transition-colors",
                      (config.events || []).includes(ev)
                        ? "bg-purple-500/20 border-purple-400/40 text-purple-400"
                        : "bg-forge-bg border-forge-border text-forge-muted"
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {triggerType === "webhook" && (
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Webhook Path</label>
            <input
              value={config.path || ""}
              onChange={(e) => updateConfig("path", e.target.value)}
              placeholder="/hooks/my-workflow"
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono outline-none focus:border-forge-muted"
            />
            <p className="text-[9px] text-forge-muted mt-1">
              POST to http://localhost:3333{config.path || "/hooks/..."}
            </p>
          </div>
        )}

        {triggerType === "cron" && (
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1 block">Schedule</label>
            <input
              value={config.schedule || ""}
              onChange={(e) => updateConfig("schedule", e.target.value)}
              placeholder="0 9 * * 1-5"
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono outline-none focus:border-forge-muted"
            />
            <p className="text-[9px] text-forge-muted mt-1">
              Cron expression (e.g., "0 9 * * 1-5" = weekdays at 9am)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
