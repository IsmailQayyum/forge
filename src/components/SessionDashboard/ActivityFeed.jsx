import React, { useRef, useEffect } from "react";
import { FileText, Terminal, Search, Edit, Users, Zap } from "lucide-react";
import clsx from "clsx";
import { TokenBurnRate } from "./TokenBurnRate.jsx";
import { DiffViewer } from "./DiffViewer.jsx";

const TOOL_ICONS = {
  Read: FileText,
  Write: Edit,
  Edit: Edit,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  Task: Users,
  Agent: Users,
};

const TOOL_COLORS = {
  Read: "text-forge-blue",
  Write: "text-forge-accent",
  Edit: "text-forge-accent",
  Bash: "text-forge-green",
  Grep: "text-forge-yellow",
  Glob: "text-forge-yellow",
  Task: "text-purple-400",
  Agent: "text-purple-400",
};

function ToolCallRow({ tc }) {
  const Icon = TOOL_ICONS[tc.name] || Zap;
  const color = TOOL_COLORS[tc.name] || "text-forge-muted";
  const inputStr = Object.values(tc.input || {})[0];
  const preview = typeof inputStr === "string" ? inputStr.slice(0, 80) : JSON.stringify(tc.input)?.slice(0, 80);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-forge-border/50 fade-in">
      <div className={clsx("mt-0.5 shrink-0", color)}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx("text-xs font-semibold", color)}>{tc.name}</span>
          {tc.status === "running" && (
            <span className="w-1.5 h-1.5 rounded-full bg-forge-green animate-pulse" />
          )}
        </div>
        {preview && (
          <p className="text-[11px] text-forge-muted mt-0.5 font-mono truncate">{preview}</p>
        )}
      </div>
      <span className="text-[10px] text-forge-muted shrink-0">
        {new Date(tc.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
}

export function ActivityFeed({ session }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.toolCalls?.length]);

  const totalTokens = (session.tokenUsage?.input || 0) + (session.tokenUsage?.output || 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-forge-border flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{session.project || session.id?.slice(0, 8)}</h2>
          <p className="text-xs text-forge-muted">{session.id?.slice(0, 20)}...</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-forge-muted">
          <span>{session.toolCalls?.length || 0} calls</span>
          {totalTokens > 0 && <span>{(totalTokens / 1000).toFixed(1)}k tokens</span>}
          {session.subAgents?.length > 0 && (
            <span className="text-forge-blue">{session.subAgents.length} sub-agents</span>
          )}
        </div>
      </div>

      {/* Token burn rate */}
      <TokenBurnRate session={session} />

      {/* Sub-agents */}
      {session.subAgents?.length > 0 && (
        <div className="px-4 py-2 border-b border-forge-border bg-forge-surface/50">
          <p className="text-[10px] text-forge-muted mb-1.5 uppercase tracking-wider">Sub-agents</p>
          <div className="flex flex-wrap gap-1.5">
            {session.subAgents.map((sa) => (
              <div key={sa.id} className="flex items-center gap-1 bg-forge-border rounded-md px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[10px] text-forge-text truncate max-w-[120px]">{sa.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff viewer */}
      {session.cwd && <DiffViewer cwd={session.cwd} />}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {(!session.toolCalls || session.toolCalls.length === 0) ? (
          <div className="flex items-center justify-center h-full text-forge-muted text-xs">
            Waiting for activity...
          </div>
        ) : (
          session.toolCalls.map((tc, i) => <ToolCallRow key={tc.id || i} tc={tc} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
