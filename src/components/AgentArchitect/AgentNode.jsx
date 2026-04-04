import React from "react";
import { Handle, Position } from "reactflow";
import { Bot, CheckCircle2, Clock, Crown, Eye, FlaskConical, Lock, Map, XCircle } from "lucide-react";
import clsx from "clsx";

const roleConfig = {
  supervisor: { icon: Crown, bg: "bg-forge-accent" },
  worker: { icon: Bot, bg: "bg-forge-border" },
  reviewer: { icon: Eye, bg: "bg-blue-500/20" },
  tester: { icon: FlaskConical, bg: "bg-green-500/20" },
  planner: { icon: Map, bg: "bg-purple-500/20" },
};

export function AgentNode({ data, selected }) {
  const isSupervisor = data.role === "supervisor";
  const config = roleConfig[data.role] || roleConfig.worker;
  const RoleIcon = config.icon;

  return (
    <div
      className={clsx(
        "relative rounded-xl border px-4 py-3 min-w-[160px] bg-forge-surface transition-all",
        data.runStatus === "running" && "ring-2 ring-forge-accent/50 animate-pulse",
        data.runStatus === "completed" && "border-forge-green/50",
        data.runStatus === "failed" && "border-forge-red",
        !data.runStatus || data.runStatus === "pending"
          ? selected
            ? "border-forge-accent shadow-lg shadow-orange-900/30"
            : isSupervisor
              ? "border-forge-accent/50"
              : "border-forge-border"
          : null
      )}
    >
      {data.runStatus === "pending" && (
        <Clock size={14} className="absolute top-2 right-2 text-gray-400" />
      )}
      {data.runStatus === "running" && (
        <span className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full bg-forge-accent animate-pulse" />
      )}
      {data.runStatus === "completed" && (
        <CheckCircle2 size={14} className="absolute top-2 right-2 text-forge-green" />
      )}
      {data.runStatus === "failed" && (
        <XCircle size={14} className="absolute top-2 right-2 text-forge-red" />
      )}
      <Handle type="target" position={Position.Top} className="!bg-forge-accent !border-forge-accent" />

      <div className="flex items-center gap-2 mb-2">
        <div className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center",
          config.bg
        )}>
          <RoleIcon size={13} className={clsx(
            isSupervisor ? "text-white" : "text-forge-text"
          )} />
        </div>
        <div>
          <p className="text-xs font-semibold text-forge-text leading-none">{data.label}</p>
          <p className="text-[10px] text-forge-muted mt-0.5">{data.role}</p>
          {data.systemPrompt && (
            <p className="text-[9px] text-forge-muted/60 mt-0.5 leading-tight">
              {data.systemPrompt.length > 40
                ? data.systemPrompt.slice(0, 40) + "\u2026"
                : data.systemPrompt}
            </p>
          )}
        </div>
      </div>

      {data.capabilities?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.capabilities.slice(0, 3).map((cap) => (
            <span key={cap} className="text-[9px] bg-forge-border text-forge-muted rounded px-1.5 py-0.5">
              {cap.replace(/_/g, " ")}
            </span>
          ))}
          {data.capabilities.length > 3 && (
            <span className="text-[9px] text-forge-muted">+{data.capabilities.length - 3}</span>
          )}
        </div>
      )}

      {data.fileRestrictions?.length > 0 && !data.runStatus && (
        <div className="flex items-center gap-1 mt-1.5">
          <Lock size={10} className="text-forge-muted" />
          <span className="text-[9px] text-forge-muted">{data.fileRestrictions.length} paths</span>
        </div>
      )}

      {/* Live activity during run */}
      {data.runActivity && data.runStatus === "running" && (
        <div className="mt-2 pt-1.5 border-t border-forge-border/50">
          <p className="text-[9px] text-forge-accent font-mono truncate leading-tight animate-pulse">
            {data.runActivity}
          </p>
        </div>
      )}

      {data.runStatus === "completed" && (
        <div className="mt-2 pt-1.5 border-t border-forge-border/50">
          <p className="text-[9px] text-forge-green font-medium">Completed</p>
        </div>
      )}

      {data.runStatus === "pending" && (
        <div className="mt-2 pt-1.5 border-t border-forge-border/50">
          <p className="text-[9px] text-forge-muted">Waiting...</p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-forge-accent !border-forge-accent" />
    </div>
  );
}
