import React from "react";
import { Handle, Position } from "reactflow";
import { Bot, Crown } from "lucide-react";
import clsx from "clsx";

export function AgentNode({ data, selected }) {
  const isSupervisor = data.role === "supervisor";

  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3 min-w-[160px] bg-forge-surface transition-all",
        selected ? "border-forge-accent shadow-lg shadow-orange-900/30" : "border-forge-border",
        isSupervisor && "border-forge-accent/50"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-forge-accent !border-forge-accent" />

      <div className="flex items-center gap-2 mb-2">
        <div className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center",
          isSupervisor ? "bg-forge-accent" : "bg-forge-border"
        )}>
          {isSupervisor ? <Crown size={13} className="text-white" /> : <Bot size={13} className="text-forge-text" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-forge-text leading-none">{data.label}</p>
          <p className="text-[10px] text-forge-muted mt-0.5">{data.role}</p>
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

      <Handle type="source" position={Position.Bottom} className="!bg-forge-accent !border-forge-accent" />
    </div>
  );
}
