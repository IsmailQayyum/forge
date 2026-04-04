import React from "react";
import { Handle, Position } from "reactflow";
import { MessageSquare, GitPullRequest, Send, Bell, CheckCircle } from "lucide-react";
import clsx from "clsx";

const actionConfig = {
  github_comment: { icon: MessageSquare, label: "GitHub Comment", bg: "bg-green-500/20", color: "text-green-400" },
  approve_pr: { icon: CheckCircle, label: "Approve PR", bg: "bg-green-500/20", color: "text-green-400" },
  slack_message: { icon: Send, label: "Slack Message", bg: "bg-blue-500/20", color: "text-blue-400" },
  notification: { icon: Bell, label: "Notification", bg: "bg-yellow-500/20", color: "text-yellow-400" },
  create_pr: { icon: GitPullRequest, label: "Create PR", bg: "bg-purple-500/20", color: "text-purple-400" },
};

export function ActionNode({ data, selected }) {
  const config = actionConfig[data.actionType] || actionConfig.notification;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "relative rounded-xl border px-4 py-3 min-w-[160px] bg-forge-surface transition-all",
        data.runStatus === "completed" && "border-forge-green/50",
        data.runStatus === "running" && "ring-2 ring-green-500/50 animate-pulse",
        !data.runStatus
          ? selected
            ? "border-green-400 shadow-lg shadow-green-900/30"
            : "border-forge-border border-dashed"
          : null
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400 !border-green-400" />

      <div className="flex items-center gap-2 mb-1.5">
        <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center", config.bg)}>
          <Icon size={13} className={config.color} />
        </div>
        <div>
          <p className="text-xs font-semibold text-forge-text leading-none">{data.label || config.label}</p>
          <p className="text-[10px] text-forge-muted mt-0.5">action</p>
        </div>
      </div>

      {/* Config summary */}
      {data.config?.template && (
        <p className="text-[9px] text-forge-muted mt-1 leading-tight">
          {data.config.template.length > 50
            ? data.config.template.slice(0, 50) + "\u2026"
            : data.config.template}
        </p>
      )}
      {data.config?.channel && (
        <p className="text-[9px] text-forge-muted font-mono mt-1">#{data.config.channel}</p>
      )}

      {data.runStatus === "completed" && (
        <div className="mt-1.5 pt-1 border-t border-forge-border/50">
          <p className="text-[9px] text-forge-green font-medium">Executed</p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-green-400 !border-green-400" />
    </div>
  );
}
