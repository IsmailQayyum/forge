import React from "react";
import clsx from "clsx";
import { Circle, Zap, Users } from "lucide-react";

const STATUS_CONFIG = {
  active: { color: "text-forge-green", pulse: true, label: "live" },
  done: { color: "text-forge-muted", pulse: false, label: "done" },
  error: { color: "text-forge-red", pulse: false, label: "error" },
  waiting: { color: "text-forge-yellow", pulse: true, label: "waiting" },
};

export function SessionCard({ session, isSelected, onClick }) {
  const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.active;
  const lastTool = session.toolCalls?.at(-1);
  const totalTokens =
    (session.tokenUsage?.input || 0) +
    (session.tokenUsage?.output || 0);

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left rounded-lg p-3 transition-colors border",
        isSelected
          ? "bg-forge-accent-dim border-forge-accent"
          : "bg-forge-surface border-forge-border hover:border-forge-muted"
      )}
    >
      <div className="flex items-start gap-2">
        <div className={clsx("mt-0.5 shrink-0", cfg.color)}>
          <Circle size={8} fill="currentColor" className={cfg.pulse ? "animate-pulse" : ""} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold truncate text-forge-text">
              {session.project || session.id?.slice(0, 8)}
            </span>
            <span className={clsx("text-[10px] shrink-0", cfg.color)}>{cfg.label}</span>
          </div>

          {lastTool && (
            <div className="flex items-center gap-1 mt-1">
              <Zap size={10} className="text-forge-muted shrink-0" />
              <span className="text-[10px] text-forge-muted truncate">
                {lastTool.name}: {JSON.stringify(lastTool.input)?.slice(0, 40)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {totalTokens > 0 && (
              <span className="text-[10px] text-forge-muted">
                {(totalTokens / 1000).toFixed(1)}k tokens
              </span>
            )}
            {session.subAgents?.length > 0 && (
              <div className="flex items-center gap-0.5">
                <Users size={10} className="text-forge-blue" />
                <span className="text-[10px] text-forge-blue">{session.subAgents.length} sub</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
