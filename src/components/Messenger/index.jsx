import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForgeStore } from "../../store/index.js";
import { XTerminal } from "./XTerminal.jsx";
import {
  Terminal, Play, Plus, X, FolderOpen, ChevronRight, ChevronDown,
  Folder, Home, ArrowUp, Shield, ShieldCheck, ShieldX,
  RotateCcw, Maximize2, Minimize2, PanelRightOpen, PanelRightClose,
  Zap, FileText, Edit, Search, Users, Clock, AlertCircle, CheckCircle2,
  Bot, User, Send,
} from "lucide-react";
import clsx from "clsx";

// ── Tool icon/color maps for activity panel ──
const TOOL_ICONS = {
  Read: FileText, Write: Edit, Edit: Edit, Bash: Terminal,
  Grep: Search, Glob: Search, Task: Users, Agent: Users,
};
const TOOL_COLORS = {
  Read: "text-blue-400", Write: "text-orange-400", Edit: "text-orange-400",
  Bash: "text-green-400", Grep: "text-yellow-400", Glob: "text-yellow-400",
  Task: "text-purple-400", Agent: "text-purple-400",
};

export function Messenger() {
  // ── State ──
  const [terminals, setTerminals] = useState([]); // { id, terminalId, label, cwd, status, pid }
  const [activeTermId, setActiveTermId] = useState(null);
  const [spawning, setSpawning] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [cwdInput, setCwdInput] = useState("");
  const wsRef = useRef(null);

  // Store data
  const pendingPermissions = useForgeStore((s) => s.pendingPermissions);
  const sessionEvents = useForgeStore((s) => s.sessionEvents);

  // ── WS reference ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__forgeWs && window.__forgeWs.readyState === 1) {
        wsRef.current = window.__forgeWs;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ── Listen for terminal exits ──
  useEffect(() => {
    function handleWs(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "TERMINAL_EXIT") {
          setTerminals(prev => prev.map(t =>
            t.terminalId === msg.terminalId ? { ...t, status: "exited" } : t
          ));
        }
      } catch {}
    }
    const ws = wsRef.current;
    if (ws) {
      ws.addEventListener("message", handleWs);
      return () => ws.removeEventListener("message", handleWs);
    }
  }, [wsRef.current]);

  // ── Spawn ──
  async function spawnSession(cwd, label) {
    setSpawning(true);
    try {
      const args = autoApprove ? ["--dangerously-skip-permissions"] : [];
      const res = await fetch("/api/terminal/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: cwd || undefined, args }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("Spawn error:", data.error);
      } else if (data.terminalId) {
        const entry = {
          id: data.terminalId,
          terminalId: data.terminalId,
          label: label || cwd?.split("/").pop() || `Session ${terminals.length + 1}`,
          cwd: cwd || "~",
          status: "active",
          pid: data.pid,
          createdAt: Date.now(),
        };
        setTerminals(prev => [...prev, entry]);
        setActiveTermId(data.terminalId);
        setShowBrowser(false);
      }
    } catch (err) {
      console.error("Failed to spawn:", err);
    }
    setSpawning(false);
  }

  async function killSession(terminalId) {
    await fetch(`/api/terminal/${terminalId}/kill`, { method: "POST" });
    setTerminals(prev => prev.map(t =>
      t.terminalId === terminalId ? { ...t, status: "exited" } : t
    ));
  }

  function removeSession(terminalId) {
    setTerminals(prev => prev.filter(t => t.terminalId !== terminalId));
    if (activeTermId === terminalId) {
      const remaining = terminals.filter(t => t.terminalId !== terminalId);
      setActiveTermId(remaining[remaining.length - 1]?.terminalId || null);
    }
  }

  async function handlePermission(permissionId, decision) {
    await fetch(`/api/hooks/permission/${permissionId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
  }

  const activeTerminal = terminals.find(t => t.terminalId === activeTermId);
  const activeCount = terminals.filter(t => t.status === "active").length;
  const permCount = pendingPermissions.length;

  return (
    <div className="flex h-full">
      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Tab bar ── */}
        <div className="flex items-center border-b border-forge-border bg-forge-surface/50 shrink-0">
          {/* Session tabs */}
          <div className="flex-1 flex items-center overflow-x-auto">
            {terminals.map(t => (
              <button
                key={t.terminalId}
                onClick={() => setActiveTermId(t.terminalId)}
                className={clsx(
                  "group flex items-center gap-1.5 px-3 py-2 text-[11px] border-r border-forge-border shrink-0 transition-colors relative",
                  activeTermId === t.terminalId
                    ? "bg-forge-bg text-forge-text"
                    : "text-forge-muted hover:text-forge-text hover:bg-forge-bg/50"
                )}
              >
                {/* Active indicator bar */}
                {activeTermId === t.terminalId && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-forge-accent" />
                )}
                <span className={clsx(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  t.status === "active" ? "bg-forge-green animate-pulse" : "bg-forge-muted"
                )} />
                <span className="font-medium max-w-[120px] truncate">{t.label}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    t.status === "active" ? killSession(t.terminalId) : removeSession(t.terminalId);
                  }}
                  className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-forge-border transition-all cursor-pointer"
                >
                  <X size={9} />
                </span>
              </button>
            ))}

            {/* New tab button */}
            <button
              onClick={() => setShowBrowser(true)}
              className="flex items-center gap-1 px-2.5 py-2 text-forge-muted hover:text-forge-text transition-colors shrink-0"
              title="New session"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 px-2 shrink-0 border-l border-forge-border">
            {activeCount > 0 && (
              <span className="text-[10px] text-forge-muted mr-1">{activeCount} active</span>
            )}
            {permCount > 0 && (
              <div className="flex items-center gap-1 bg-forge-yellow/15 border border-forge-yellow/30 rounded-full px-2 py-0.5 mr-1">
                <Shield size={10} className="text-forge-yellow" />
                <span className="text-[10px] text-forge-yellow font-semibold">{permCount}</span>
              </div>
            )}
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={clsx(
                "p-1.5 rounded-md transition-colors",
                showActivity ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text hover:bg-forge-border"
              )}
              title="Activity panel"
            >
              {showActivity ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            </button>
          </div>
        </div>

        {/* ── Terminal content ── */}
        <div className="flex-1 relative overflow-hidden">
          {terminals.length === 0 ? (
            <EmptyState
              onSpawn={spawnSession}
              spawning={spawning}
              autoApprove={autoApprove}
              setAutoApprove={setAutoApprove}
              showBrowser={showBrowser}
              setShowBrowser={setShowBrowser}
              cwdInput={cwdInput}
              setCwdInput={setCwdInput}
            />
          ) : (
            <>
              {/* Render all terminals but only show active — preserves xterm state */}
              {terminals.map(t => (
                <div
                  key={t.terminalId}
                  className={clsx(
                    "absolute inset-0",
                    t.terminalId !== activeTermId && "hidden"
                  )}
                >
                  {t.status === "active" ? (
                    <XTerminal terminalId={t.terminalId} wsRef={wsRef} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-forge-muted">
                      <Terminal size={24} />
                      <p className="text-xs">Session exited</p>
                      <button
                        onClick={() => { removeSession(t.terminalId); spawnSession(t.cwd, t.label); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs hover:border-forge-muted transition-colors"
                      >
                        <RotateCcw size={10} /> Restart
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Directory browser overlay */}
              {showBrowser && (
                <div className="absolute inset-0 z-10 bg-forge-bg/95 backdrop-blur-sm">
                  <DirectoryBrowser
                    onSelect={(dir) => spawnSession(dir, dir.split("/").pop())}
                    onClose={() => setShowBrowser(false)}
                    cwdInput={cwdInput}
                    setCwdInput={setCwdInput}
                    autoApprove={autoApprove}
                    setAutoApprove={setAutoApprove}
                    spawning={spawning}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Status bar ── */}
        {activeTerminal && (
          <div className="flex items-center gap-3 px-3 py-1 border-t border-forge-border bg-forge-surface/50 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={clsx(
                "w-1.5 h-1.5 rounded-full",
                activeTerminal.status === "active" ? "bg-forge-green" : "bg-forge-muted"
              )} />
              <span className="text-[10px] text-forge-muted">
                {activeTerminal.status === "active" ? "Running" : "Exited"}
              </span>
            </div>
            <span className="text-[10px] text-forge-muted font-mono">{activeTerminal.cwd}</span>
            <span className="text-[10px] text-forge-muted">PID {activeTerminal.pid}</span>
            {autoApprove && (
              <span className="text-[10px] text-forge-yellow flex items-center gap-1">
                <Zap size={8} /> Auto-approve
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Activity side panel ── */}
      {showActivity && (
        <ActivityPanel
          permissions={pendingPermissions}
          sessionEvents={sessionEvents}
          onPermission={handlePermission}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
}


// ── Empty state with spawn options ──
function EmptyState({ onSpawn, spawning, autoApprove, setAutoApprove, showBrowser, setShowBrowser, cwdInput, setCwdInput }) {
  return (
    <div className="flex items-center justify-center h-full">
      {showBrowser ? (
        <DirectoryBrowser
          onSelect={(dir) => onSpawn(dir, dir.split("/").pop())}
          onClose={() => setShowBrowser(false)}
          cwdInput={cwdInput}
          setCwdInput={setCwdInput}
          autoApprove={autoApprove}
          setAutoApprove={setAutoApprove}
          spawning={spawning}
        />
      ) : (
        <div className="flex flex-col items-center gap-5 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
            <Terminal size={28} className="text-forge-accent" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-forge-text mb-1">Start a Claude Code Session</p>
            <p className="text-xs text-forge-muted">
              Spawn Claude Code in any project directory. Full terminal experience with permission controls.
            </p>
          </div>

          {/* Quick spawn */}
          <div className="w-full flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={cwdInput}
                onChange={(e) => setCwdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && cwdInput && onSpawn(cwdInput)}
                placeholder="~/projects/my-app"
                className="flex-1 bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono placeholder:text-forge-muted outline-none focus:border-forge-muted"
              />
              <button
                onClick={() => setShowBrowser(true)}
                className="px-2.5 rounded-lg bg-forge-surface border border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors"
                title="Browse directories"
              >
                <FolderOpen size={14} />
              </button>
            </div>

            <button
              onClick={() => onSpawn(cwdInput)}
              disabled={spawning}
              className="w-full py-2.5 rounded-lg bg-forge-accent text-white text-xs font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={12} />
              {spawning ? "Starting..." : "Start Session"}
            </button>

            <label className="flex items-center gap-2 justify-center cursor-pointer">
              <div
                onClick={() => setAutoApprove(!autoApprove)}
                className={clsx(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer",
                  autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
                )}
              >
                {autoApprove && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
              </div>
              <span className="text-[10px] text-forge-muted">Auto-approve all tool calls</span>
            </label>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-forge-border" />
            <span className="text-[10px] text-forge-muted">or browse projects</span>
            <div className="flex-1 h-px bg-forge-border" />
          </div>

          <button
            onClick={() => setShowBrowser(true)}
            className="w-full py-2.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-muted hover:text-forge-text hover:border-forge-muted transition-colors flex items-center justify-center gap-2"
          >
            <FolderOpen size={12} />
            Browse Directories
          </button>
        </div>
      )}
    </div>
  );
}


// ── Directory browser ──
function DirectoryBrowser({ onSelect, onClose, cwdInput, setCwdInput, autoApprove, setAutoApprove, spawning }) {
  const [currentPath, setCurrentPath] = useState("");
  const [dirs, setDirs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("projects"); // "projects" | "browse"

  // Load projects on mount
  useEffect(() => {
    fetch("/api/fs/projects")
      .then(r => r.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function browseTo(dirPath) {
    setLoading(true);
    try {
      const res = await fetch(`/api/fs/browse?path=${encodeURIComponent(dirPath || "~")}`);
      const data = await res.json();
      if (data.error) return;
      setCurrentPath(data.current);
      setDirs(data.dirs);
      setCwdInput(data.current);
      setTab("browse");
    } catch {}
    setLoading(false);
  }

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto h-full max-h-[500px] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-forge-text">Choose Project Directory</h3>
        <button onClick={onClose} className="p-1 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Path input + go */}
      <div className="flex gap-2 mb-3">
        <input
          value={cwdInput}
          onChange={(e) => setCwdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey || e.metaKey) onSelect(cwdInput);
              else browseTo(cwdInput);
            }
          }}
          placeholder="Enter path or browse below..."
          className="flex-1 bg-forge-surface border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono placeholder:text-forge-muted outline-none focus:border-forge-muted"
        />
        <button
          onClick={() => onSelect(cwdInput)}
          disabled={!cwdInput || spawning}
          className="px-3 py-2 rounded-lg bg-forge-accent text-white text-[11px] font-semibold hover:bg-orange-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          <Play size={10} />
          {spawning ? "..." : "Start"}
        </button>
      </div>

      {/* Auto-approve */}
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <div
          onClick={() => setAutoApprove(!autoApprove)}
          className={clsx(
            "w-3 h-3 rounded border flex items-center justify-center transition-colors cursor-pointer",
            autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
          )}
        >
          {autoApprove && <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
        </div>
        <span className="text-[10px] text-forge-muted">Auto-approve</span>
      </label>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => setTab("projects")}
          className={clsx("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
            tab === "projects" ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
          )}
        >
          Projects
        </button>
        <button
          onClick={() => { setTab("browse"); if (!currentPath) browseTo("~"); }}
          className={clsx("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
            tab === "browse" ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
          )}
        >
          Browse
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-forge-border bg-forge-surface">
        {loading ? (
          <div className="flex items-center justify-center h-full text-forge-muted text-xs">Loading...</div>
        ) : tab === "projects" ? (
          projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted p-4">
              <Folder size={20} />
              <p className="text-xs text-center">No projects found. Try browsing manually.</p>
            </div>
          ) : (
            <div className="divide-y divide-forge-border">
              {projects.map(p => (
                <button
                  key={p.path}
                  onClick={() => { setCwdInput(p.path); onSelect(p.path); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-forge-bg transition-colors text-left"
                >
                  <Folder size={14} className="text-forge-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-forge-text">{p.name}</p>
                    <p className="text-[10px] text-forge-muted font-mono truncate">{p.path}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.hasGit && <span className="text-[9px] bg-forge-border text-forge-muted rounded px-1.5 py-0.5">git</span>}
                    {p.hasClaude && <span className="text-[9px] bg-forge-accent/20 text-forge-accent rounded px-1.5 py-0.5">CLAUDE.md</span>}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div>
            {/* Breadcrumb */}
            {currentPath && (
              <div className="flex items-center gap-1 px-3 py-2 border-b border-forge-border bg-forge-bg">
                <button onClick={() => browseTo("~")} className="text-forge-muted hover:text-forge-text transition-colors">
                  <Home size={11} />
                </button>
                <span className="text-[10px] text-forge-muted font-mono truncate">{currentPath}</span>
                <button onClick={() => browseTo(currentPath + "/..")} className="ml-auto text-forge-muted hover:text-forge-text transition-colors" title="Go up">
                  <ArrowUp size={11} />
                </button>
              </div>
            )}
            {/* Use this directory */}
            {currentPath && (
              <button
                onClick={() => onSelect(currentPath)}
                className="w-full flex items-center gap-2 px-3 py-2 text-forge-accent hover:bg-forge-accent/10 transition-colors border-b border-forge-border"
              >
                <Play size={10} />
                <span className="text-[11px] font-semibold">Start session here</span>
              </button>
            )}
            <div className="divide-y divide-forge-border/50">
              {dirs.map(d => (
                <button
                  key={d.path}
                  onClick={() => browseTo(d.path)}
                  onDoubleClick={() => onSelect(d.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-forge-bg transition-colors text-left"
                >
                  <Folder size={12} className="text-forge-muted shrink-0" />
                  <span className="text-[11px] text-forge-text">{d.name}</span>
                  <ChevronRight size={10} className="text-forge-muted ml-auto" />
                </button>
              ))}
              {dirs.length === 0 && (
                <p className="text-xs text-forge-muted text-center py-4">No subdirectories</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Activity side panel (replaces Events tab) ──
function ActivityPanel({ permissions, sessionEvents, onPermission, onClose }) {
  const allEvents = Object.values(sessionEvents).flat().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 100);

  return (
    <div className="w-80 border-l border-forge-border flex flex-col bg-forge-surface/30 shrink-0">
      <div className="px-3 py-2 border-b border-forge-border flex items-center gap-2">
        <Zap size={12} className="text-forge-accent" />
        <span className="text-xs font-semibold text-forge-text">Activity</span>
        <button onClick={onClose} className="ml-auto p-1 rounded text-forge-muted hover:text-forge-text">
          <X size={11} />
        </button>
      </div>

      {/* Pending permissions */}
      {permissions.length > 0 && (
        <div className="p-2 border-b border-forge-border flex flex-col gap-2">
          {permissions.map(p => (
            <div key={p.permissionId} className="bg-forge-yellow/5 border border-forge-yellow/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield size={11} className="text-forge-yellow" />
                <span className="text-[11px] font-semibold text-forge-yellow">Permission</span>
              </div>
              <p className="text-[10px] text-forge-text font-semibold mb-1">{p.tool}</p>
              {p.input && (
                <p className="text-[9px] text-forge-muted font-mono mb-2 line-clamp-2">
                  {typeof p.input === "string" ? p.input.slice(0, 100) : JSON.stringify(p.input).slice(0, 100)}
                </p>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => onPermission(p.permissionId, "allow")}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-forge-green/20 border border-forge-green/40 text-[10px] font-semibold text-forge-green hover:bg-forge-green/30 transition-colors"
                >
                  <ShieldCheck size={10} /> Allow
                </button>
                <button
                  onClick={() => onPermission(p.permissionId, "deny")}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-forge-red/20 border border-forge-red/40 text-[10px] font-semibold text-forge-red hover:bg-forge-red/30 transition-colors"
                >
                  <ShieldX size={10} /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event stream */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted">
            <Zap size={16} />
            <p className="text-[10px]">No activity yet</p>
          </div>
        ) : (
          allEvents.map((event, i) => <MiniEvent key={i} event={event} />)
        )}
      </div>
    </div>
  );
}


// ── Compact event display for activity panel ──
function MiniEvent({ event }) {
  switch (event.type) {
    case "message": {
      const isUser = event.role === "user";
      return (
        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md hover:bg-forge-surface/50">
          {isUser
            ? <User size={10} className="text-forge-muted mt-0.5 shrink-0" />
            : <Bot size={10} className="text-forge-accent mt-0.5 shrink-0" />}
          <p className="text-[10px] text-forge-text line-clamp-2">{event.text?.slice(0, 100)}</p>
        </div>
      );
    }
    case "tool_call": {
      const Icon = TOOL_ICONS[event.tool] || Zap;
      const color = TOOL_COLORS[event.tool] || "text-forge-muted";
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-forge-surface/50">
          <Icon size={10} className={clsx("shrink-0", color)} />
          <span className={clsx("text-[10px] font-medium", color)}>{event.tool}</span>
          <span className="text-[9px] text-forge-muted font-mono truncate">
            {typeof event.input === "object" ? Object.values(event.input || {})[0]?.toString().slice(0, 40) : ""}
          </span>
        </div>
      );
    }
    case "tool_result": {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-forge-surface/50 ml-2">
          <CheckCircle2 size={9} className="text-forge-green shrink-0" />
          <span className="text-[9px] text-forge-muted truncate">{event.tool} done</span>
        </div>
      );
    }
    case "waiting":
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-forge-accent/5">
          <AlertCircle size={10} className="text-forge-accent shrink-0" />
          <span className="text-[10px] text-forge-accent">Waiting for input</span>
        </div>
      );
    case "subagent":
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
          <Users size={10} className="text-purple-400 shrink-0" />
          <span className="text-[10px] text-purple-400">Sub-agent</span>
        </div>
      );
    default:
      return null;
  }
}
