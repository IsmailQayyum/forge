import React, { useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

const ALL_CAPABILITIES = [
  { id: "read_files", label: "Read files", group: "filesystem" },
  { id: "write_files", label: "Write files", group: "filesystem" },
  { id: "run_commands", label: "Run terminal commands", group: "system" },
  { id: "spawn_agents", label: "Spawn sub-agents", group: "system" },
  { id: "github_read", label: "Read GitHub issues/PRs", group: "github" },
  { id: "github_pr", label: "Open GitHub PRs", group: "github" },
  { id: "github_push", label: "Push to GitHub", group: "github" },
  { id: "linear_read", label: "Read Linear tickets", group: "linear" },
  { id: "linear_create", label: "Create Linear tickets", group: "linear" },
  { id: "linear_update", label: "Update Linear tickets", group: "linear" },
  { id: "slack_read", label: "Read Slack messages", group: "slack" },
  { id: "slack_send", label: "Send Slack messages", group: "slack" },
  { id: "jira_read", label: "Read Jira tickets", group: "jira" },
  { id: "jira_create", label: "Create Jira tickets", group: "jira" },
  { id: "web_fetch", label: "Fetch URLs", group: "web" },
  { id: "web_search", label: "Web search", group: "web" },
];

const GROUP_COLORS = {
  filesystem: "text-forge-blue",
  system: "text-forge-green",
  github: "text-forge-text",
  linear: "text-purple-400",
  slack: "text-forge-yellow",
  jira: "text-blue-400",
  web: "text-forge-accent",
};

const groups = [...new Set(ALL_CAPABILITIES.map((c) => c.group))];

export function CapabilitiesPanel({ node, onUpdate, onClose }) {
  const [label, setLabel] = useState(node.data.label);
  const [capabilities, setCapabilities] = useState(new Set(node.data.capabilities || []));

  function toggleCap(id) {
    const next = new Set(capabilities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCapabilities(next);
    onUpdate({ capabilities: Array.from(next) });
  }

  function updateLabel(v) {
    setLabel(v);
    onUpdate({ label: v });
  }

  return (
    <div className="w-72 border-l border-forge-border bg-forge-surface flex flex-col">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <span className="text-sm font-semibold">Agent Config</span>
        <button onClick={onClose} className="text-forge-muted hover:text-forge-text">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Name</label>
          <input
            value={label}
            onChange={(e) => updateLabel(e.target.value)}
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
          />
        </div>

        {/* Capabilities */}
        <div>
          <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-2 block">
            Capabilities
          </label>
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group}>
                <p className={clsx("text-[10px] font-semibold mb-1.5 capitalize", GROUP_COLORS[group])}>
                  {group}
                </p>
                <div className="flex flex-col gap-1">
                  {ALL_CAPABILITIES.filter((c) => c.group === group).map((cap) => (
                    <label
                      key={cap.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div
                        className={clsx(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          capabilities.has(cap.id)
                            ? "bg-forge-accent border-forge-accent"
                            : "border-forge-border group-hover:border-forge-muted"
                        )}
                        onClick={() => toggleCap(cap.id)}
                      >
                        {capabilities.has(cap.id) && (
                          <svg width="8" height="8" viewBox="0 0 8 8">
                            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-forge-text">{cap.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
