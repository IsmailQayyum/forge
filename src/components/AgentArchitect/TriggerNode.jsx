import React from "react";
import { Handle, Position } from "reactflow";
import { GitPullRequest, Globe, Clock, Play, Webhook } from "lucide-react";
import clsx from "clsx";

const triggerConfig = {
  github_pr: { icon: GitPullRequest, label: "GitHub PR", bg: "bg-purple-500/20", color: "text-purple-400" },
  webhook: { icon: Webhook, label: "Webhook", bg: "bg-blue-500/20", color: "text-blue-400" },
  cron: { icon: Clock, label: "Cron Schedule", bg: "bg-yellow-500/20", color: "text-yellow-400" },
  manual: { icon: Play, label: "Manual Trigger", bg: "bg-forge-accent/20", color: "text-forge-accent" },
};

export function TriggerNode({ data, selected }) {
  const config = triggerConfig[data.triggerType] || triggerConfig.manual;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "relative rounded-xl border px-4 py-3 min-w-[160px] bg-forge-surface transition-all",
        selected
          ? "border-purple-400 shadow-lg shadow-purple-900/30"
          : "border-forge-border border-dashed"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center", config.bg)}>
          <Icon size={13} className={config.color} />
        </div>
        <div>
          <p className="text-xs font-semibold text-forge-text leading-none">{data.label || config.label}</p>
          <p className="text-[10px] text-forge-muted mt-0.5">trigger</p>
        </div>
      </div>

      {/* Config summary */}
      {data.triggerType === "github_pr" && data.config?.repo && (
        <p className="text-[9px] text-forge-muted font-mono mt-1">{data.config.repo}</p>
      )}
      {data.triggerType === "webhook" && data.config?.path && (
        <p className="text-[9px] text-forge-muted font-mono mt-1">POST {data.config.path}</p>
      )}
      {data.triggerType === "cron" && data.config?.schedule && (
        <p className="text-[9px] text-forge-muted font-mono mt-1">{data.config.schedule}</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !border-purple-400" />
    </div>
  );
}
