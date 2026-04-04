import React from "react";
import { CheckCircle2, XCircle, Clock, Download, GitCompare, X } from "lucide-react";
import clsx from "clsx";

function formatDuration(ms) {
  if (!ms) return "0s";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function exportReport(run) {
  const lines = [
    `# Forge Run Report`,
    ``,
    `**Architecture:** ${run.archName || "Unknown"}`,
    `**Duration:** ${formatDuration(run.duration)}`,
    `**Status:** ${run.status}`,
    ``,
    `## Agent Results`,
    ``,
  ];
  for (const agent of Object.values(run.agents)) {
    lines.push(`### ${agent.label} (${agent.role})`);
    lines.push(`Status: ${agent.status}`);
    if (agent.lastActivity) lines.push(`Last activity: ${agent.lastActivity}`);
    lines.push(``);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forge-run-${run.runId}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RunSummary({ run, onClose, onViewDiff, onViewAgent }) {
  if (!run) return null;

  const agents = run.agents ? Object.entries(run.agents) : [];
  const agentCount = agents.length;
  const runFailed = run.status === "failed" || run.status === "error";
  const showDiff = run.gitBefore && run.gitAfter && run.gitBefore !== run.gitAfter;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 mx-4 mb-4">
      <div className="bg-forge-surface/95 backdrop-blur-sm border border-forge-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            {runFailed ? (
              <XCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
            <span className="text-forge-text">
              {runFailed ? "Run Failed" : "Run Complete"}
            </span>
            <span className="text-forge-muted">·</span>
            <span className="text-forge-muted">
              {agentCount} agent{agentCount !== 1 ? "s" : ""}
            </span>
            {run.duration != null && (
              <>
                <span className="text-forge-muted">·</span>
                <span className="text-forge-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(run.duration)}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-forge-border/50 text-forge-muted hover:text-forge-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent Results */}
        {agents.length > 0 && (
          <div className="px-4 py-2">
            <div className="text-xs font-medium text-forge-muted uppercase tracking-wide mb-1.5">
              Agent Results
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {agents.map(([nodeId, agent]) => {
                const failed = agent.status === "failed" || agent.status === "error";
                return (
                  <button
                    key={nodeId}
                    onClick={() => onViewAgent?.(nodeId)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left",
                      "hover:bg-forge-border/30 transition-colors group"
                    )}
                  >
                    {failed ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    )}
                    <span className="font-medium text-forge-text min-w-[120px]">
                      {agent.label || nodeId}
                    </span>
                    <span className="text-forge-muted text-xs min-w-[80px]">
                      {agent.role || "agent"}
                    </span>
                    {agent.lastActivity && (
                      <span className="text-forge-muted text-xs truncate ml-auto max-w-[240px] opacity-70 group-hover:opacity-100 transition-opacity">
                        {agent.lastActivity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-forge-border">
          {showDiff && (
            <button
              onClick={onViewDiff}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-forge-border/40 hover:bg-forge-border/70 text-forge-text transition-colors"
              )}
            >
              <GitCompare className="w-3.5 h-3.5" />
              View Git Diff
            </button>
          )}
          <button
            onClick={() => exportReport(run)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-forge-border/40 hover:bg-forge-border/70 text-forge-text transition-colors"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
