import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForgeStore } from "../../store/index.js";
import { SessionCard } from "./SessionCard.jsx";
import { ActivityFeed } from "./ActivityFeed.jsx";
import { QuickActions } from "./QuickActions.jsx";
import { SessionSearch } from "./SessionSearch.jsx";
import {
  Monitor,
  Download,
  Terminal,
  Plus,
  Circle,
  Coins,
  Activity,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionDashboard() {
  const sessions = useForgeStore((s) => Object.values(s.sessions));
  const selectedId = useForgeStore((s) => s.selectedSessionId);
  const selectSession = useForgeStore((s) => s.selectSession);

  const selected = sessions.find((s) => s.id === selectedId) || sessions[0];

  const [todayTokens, setTodayTokens] = useState(null);
  const [todayCost, setTodayCost] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [localFilter, setLocalFilter] = useState("");

  // Derived stats
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === "active" || s.status === "waiting"),
    [sessions]
  );

  // Fetch today's cost data
  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch("/api/costs");
      const data = await res.json();
      if (data?.today?.tokens) setTodayTokens(data.today.tokens);
      if (data?.today?.cost != null) setTodayCost(data.today.cost);
    } catch {}
  }, []);

  // Auto-refresh: re-fetch sessions and costs every 10 seconds
  useEffect(() => {
    fetchCosts();
    const interval = setInterval(() => {
      // Refresh sessions from the API
      fetch("/api/sessions")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const store = useForgeStore.getState();
            data.forEach((session) => {
              if (store.sessions[session.id]) {
                store.updateSession(session.id, session);
              } else {
                store.addSession(session);
              }
            });
          }
        })
        .catch(() => {});

      fetchCosts();
      setLastRefresh(Date.now());
    }, 10_000);

    return () => clearInterval(interval);
  }, [fetchCosts]);

  // Filter sessions by local text filter (name + project)
  const filteredSessions = useMemo(() => {
    if (!localFilter.trim()) return sessions;
    const q = localFilter.toLowerCase();
    return sessions.filter((s) => {
      const name = (s.displayName || "").toLowerCase();
      const project = (s.project || "").toLowerCase();
      const id = (s.id || "").toLowerCase();
      return name.includes(q) || project.includes(q) || id.includes(q);
    });
  }, [sessions, localFilter]);

  async function exportSelected() {
    if (!selected) return;
    try {
      const res = await fetch(`/api/sessions/${selected.id}/export`);
      const { markdown, name } = await res.json();
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${name || selected.id.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  function handleNewSession() {
    window.dispatchEvent(
      new CustomEvent("navigate-to", { detail: "messenger" })
    );
  }

  function handleOpenTerminal() {
    window.dispatchEvent(
      new CustomEvent("navigate-to", { detail: "messenger" })
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header Stats Bar ── */}
      <div className="shrink-0 border-b border-forge-border bg-forge-surface/60 px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-forge-accent" />
          <span className="text-sm font-semibold text-forge-text">
            Sessions
          </span>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3 ml-2">
          {/* Total count */}
          <div className="flex items-center gap-1.5 bg-forge-bg border border-forge-border rounded-lg px-2.5 py-1">
            <Activity size={11} className="text-forge-muted" />
            <span className="text-[11px] text-forge-muted">Total</span>
            <span className="text-[11px] font-semibold text-forge-text">
              {sessions.length}
            </span>
          </div>

          {/* Active count */}
          <div className="flex items-center gap-1.5 bg-forge-bg border border-forge-border rounded-lg px-2.5 py-1">
            <Circle
              size={8}
              fill="currentColor"
              className="text-forge-green animate-pulse"
            />
            <span className="text-[11px] text-forge-muted">Active</span>
            <span className="text-[11px] font-semibold text-forge-green">
              {activeSessions.length}
            </span>
          </div>

          {/* Today's tokens */}
          {todayTokens != null && (
            <div className="flex items-center gap-1.5 bg-forge-bg border border-forge-border rounded-lg px-2.5 py-1">
              <Coins size={11} className="text-forge-accent" />
              <span className="text-[11px] text-forge-muted">Today</span>
              <span className="text-[11px] font-semibold text-forge-accent">
                {formatTokens(todayTokens)} tokens
              </span>
              {todayCost != null && (
                <span className="text-[10px] text-forge-muted">
                  (${todayCost.toFixed(2)})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Refresh indicator */}
          <span className="text-[10px] text-forge-muted flex items-center gap-1">
            <RefreshCw size={9} className="text-forge-muted" />
            auto-refresh 10s
          </span>

          {/* New Session button */}
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-white text-[11px] font-semibold hover:brightness-110 transition-all"
          >
            <Plus size={12} />
            New Session
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* Session list sidebar */}
        <div className="w-72 border-r border-forge-border flex flex-col">
          {/* Search */}
          <SessionSearch onSelectSession={selectSession} />

          {/* Quick actions */}
          <QuickActions />

          {/* Local filter for visible sessions */}
          {sessions.length > 0 && (
            <div className="px-3 py-2 border-b border-forge-border">
              <input
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
                placeholder="Filter by name or project..."
                className="w-full bg-forge-bg border border-forge-border rounded-md px-2.5 py-1 text-[11px] text-forge-text outline-none focus:border-forge-muted placeholder:text-forge-muted/50"
              />
            </div>
          )}

          {/* Session cards */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {sessions.length === 0 ? (
              /* ── Empty State ── */
              <div className="flex flex-col items-center justify-center h-full gap-3 text-forge-muted px-4">
                <div className="w-12 h-12 rounded-xl bg-forge-surface border border-forge-border flex items-center justify-center">
                  <Terminal size={22} className="text-forge-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-forge-text mb-1">
                    No sessions yet
                  </p>
                  <p className="text-[11px] text-forge-muted leading-relaxed">
                    Launch Claude Code to see sessions here, or open a terminal
                    in Forge.
                  </p>
                </div>
                <button
                  onClick={handleOpenTerminal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-white text-[11px] font-semibold hover:brightness-110 transition-all mt-1"
                >
                  <Terminal size={12} />
                  Open Terminal
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted">
                <p className="text-xs text-center">
                  No sessions match "{localFilter}"
                </p>
              </div>
            ) : (
              filteredSessions.map((s) => (
                <div key={s.id} className="relative group/card">
                  <SessionCard
                    session={s}
                    isSelected={s.id === selected?.id}
                    onClick={() => selectSession(s.id)}
                  />
                  {/* Time since last activity overlay */}
                  {s.lastActivityAt && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] text-forge-muted opacity-0 group-hover/card:opacity-100 transition-opacity bg-forge-bg/80 rounded px-1 py-0.5">
                      {timeAgo(s.lastActivityAt)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {selected ? (
            <>
              {/* Export button in top-right */}
              <div className="absolute top-2 right-4 z-10">
                <button
                  onClick={exportSelected}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-forge-surface border border-forge-border text-[10px] text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors"
                  title="Export session as markdown"
                >
                  <Download size={10} /> Export
                </button>
              </div>
              <ActivityFeed session={selected} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-forge-muted">
              <Monitor size={28} className="text-forge-muted/40" />
              <p className="text-sm">Select a session to see activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
