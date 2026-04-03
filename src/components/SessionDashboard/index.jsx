import React from "react";
import { useForgeStore } from "../../store/index.js";
import { SessionCard } from "./SessionCard.jsx";
import { ActivityFeed } from "./ActivityFeed.jsx";
import { Monitor } from "lucide-react";

export function SessionDashboard() {
  const sessions = useForgeStore((s) => Object.values(s.sessions));
  const selectedId = useForgeStore((s) => s.selectedSessionId);
  const selectSession = useForgeStore((s) => s.selectSession);

  const selected = sessions.find((s) => s.id === selectedId) || sessions[0];

  return (
    <div className="flex h-full">
      {/* Session list */}
      <div className="w-72 border-r border-forge-border flex flex-col">
        <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
          <Monitor size={14} className="text-forge-accent" />
          <span className="text-sm font-semibold">Sessions</span>
          <span className="ml-auto text-xs text-forge-muted bg-forge-border px-1.5 py-0.5 rounded-full">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted">
              <Monitor size={24} />
              <p className="text-xs text-center">
                No active sessions.<br />Start Claude Code to see them here.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isSelected={s.id === (selected?.id)}
                onClick={() => selectSession(s.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <ActivityFeed session={selected} />
        ) : (
          <div className="flex items-center justify-center h-full text-forge-muted text-sm">
            Select a session to see activity
          </div>
        )}
      </div>
    </div>
  );
}
