import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Circle, Zap, Users, Pencil } from "lucide-react";
import { useForgeStore } from "../../store/index.js";

const STATUS_CONFIG = {
  active: { color: "text-forge-green", pulse: true, label: "live" },
  done: { color: "text-forge-muted", pulse: false, label: "done" },
  error: { color: "text-forge-red", pulse: false, label: "error" },
  waiting: { color: "text-forge-yellow", pulse: true, label: "waiting" },
};

export function SessionCard({ session, isSelected, onClick }) {
  const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.active;
  const lastTool = session.toolCalls?.at(-1);
  const totalTokens = (session.tokenUsage?.input || 0) + (session.tokenUsage?.output || 0);
  const renameSession = useForgeStore((s) => s.renameSession);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const displayName = session.displayName || session.project || session.id?.slice(0, 8);

  function startEdit(e) {
    e.stopPropagation();
    setDraft(displayName);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitRename() {
    if (draft.trim() && draft.trim() !== displayName) {
      renameSession(session.id, draft.trim());
    }
    setEditing(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setEditing(false);
    e.stopPropagation();
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left rounded-lg p-3 transition-colors border group",
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
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={onKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-forge-bg border border-forge-accent rounded px-1.5 py-0.5 text-xs text-forge-text outline-none min-w-0"
              />
            ) : (
              <span className="text-xs font-semibold truncate text-forge-text flex-1">
                {displayName}
              </span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {!editing && (
                <button
                  onClick={startEdit}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-forge-muted hover:text-forge-text"
                  title="Rename session"
                >
                  <Pencil size={10} />
                </button>
              )}
              <span className={clsx("text-[10px]", cfg.color)}>{cfg.label}</span>
            </div>
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
