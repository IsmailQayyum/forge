import React, { useState, useRef, useEffect } from "react";
import { useForgeStore } from "../../store/index.js";
import { XTerminal } from "./XTerminal.jsx";
import { MultiSession } from "./MultiSession.jsx";
import {
  MessageSquare, Send, Bot, User, Shield, ShieldCheck, ShieldX,
  Terminal, FileText, Edit, Search, Users, Zap, ChevronDown, ChevronRight,
  AlertCircle, Clock, CheckCircle2, XCircle, Plus, Play, Square,
  FolderOpen, TerminalSquare, List, Grid2X2,
} from "lucide-react";
import clsx from "clsx";

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
  const sessions = useForgeStore((s) => Object.values(s.sessions));
  const pendingPermissions = useForgeStore((s) => s.pendingPermissions);
  const sessionEvents = useForgeStore((s) => s.sessionEvents);
  const pendingInputs = useForgeStore((s) => s.pendingInputs);
  const removePendingInput = useForgeStore((s) => s.removePendingInput);
  const updateSession = useForgeStore((s) => s.updateSession);

  const [selectedId, setSelectedId] = useState(null);
  const [activeTerminals, setActiveTerminals] = useState({}); // sessionId or termId -> termId
  const [forgeTerminals, setForgeTerminals] = useState([]); // terminals spawned from Forge
  const [tab, setTab] = useState("terminal"); // "terminal" | "events"
  const [cwdInput, setCwdInput] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [reply, setReply] = useState("");
  const [copied, setCopied] = useState(false);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  const selected = sessions.find((s) => s.id === selectedId) || sessions[0];
  const events = selected ? (sessionEvents[selected.id] || []) : [];
  const sessionPerms = pendingPermissions.filter((p) => p.sessionId === selected?.id);
  const isPending = pendingInputs.some((p) => p.sessionId === selected?.id);

  // Find or track WS reference
  useEffect(() => {
    // Grab the global WS from the store's connection
    // We'll access it via window.__forgeWs set by useWebSocket
    const interval = setInterval(() => {
      if (window.__forgeWs && window.__forgeWs.readyState === 1) {
        wsRef.current = window.__forgeWs;
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Check for the active terminal tied to a selected session
  const currentTerminalId = selected ? activeTerminals[selected.id] : null;
  // Also check for standalone Forge terminals
  const standaloneTermId = forgeTerminals.find(t => !t.sessionId)?.terminalId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  async function spawnClaude(cwd) {
    setSpawning(true);
    try {
      const args = autoApprove ? ["--dangerously-skip-permissions"] : [];
      const res = await fetch("/api/terminal/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd: cwd || undefined, args }),
      });
      const data = await res.json();
      if (data.terminalId) {
        const termId = data.terminalId;
        setForgeTerminals(prev => [...prev, { terminalId: termId, cwd, createdAt: Date.now() }]);
        // If we have a selected session, link it
        if (selected) {
          setActiveTerminals(prev => ({ ...prev, [selected.id]: termId }));
        } else {
          // Create a virtual session entry for this terminal
          setActiveTerminals(prev => ({ ...prev, [`forge-${termId}`]: termId }));
        }
        setTab("terminal");
      }
    } catch (err) {
      console.error("Failed to spawn Claude:", err);
    }
    setSpawning(false);
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    const text = reply.trim();

    // Add to messages
    updateSession(selected.id, {
      messages: [...(selected.messages || []), {
        id: `user-${Date.now()}`, role: "user", text, ts: Date.now(),
      }],
      waitingForInput: false,
    });
    useForgeStore.getState().addSessionEvent(selected.id, {
      type: "message", role: "user", text, ts: Date.now(),
    });

    // Send via hooks API
    fetch(`/api/hooks/send/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    // If there's an active terminal for this session, also write to it
    const termId = activeTerminals[selected.id];
    if (termId && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: "TERMINAL_INPUT",
        payload: { terminalId: termId, data: text + "\n" },
      }));
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}

    removePendingInput(selected.id);
    setReply("");
  }

  async function handlePermission(permissionId, decision) {
    await fetch(`/api/hooks/permission/${permissionId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
  }

  // Determine which terminal to show
  const displayTerminalId = currentTerminalId || forgeTerminals[forgeTerminals.length - 1]?.terminalId;

  return (
    <div className="flex h-full">
      {/* Session sidebar */}
      <div className="w-64 border-r border-forge-border flex flex-col">
        <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
          <TerminalSquare size={14} className="text-forge-accent" />
          <span className="text-sm font-semibold">Sessions</span>
        </div>

        {/* Spawn controls */}
        <div className="p-2 border-b border-forge-border flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              value={cwdInput}
              onChange={(e) => setCwdInput(e.target.value)}
              placeholder="Working directory..."
              className="flex-1 bg-forge-surface border border-forge-border rounded-md px-2 py-1.5 text-[11px] text-forge-text placeholder:text-forge-muted outline-none focus:border-forge-muted font-mono"
            />
            <button
              onClick={() => spawnClaude(cwdInput)}
              disabled={spawning}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-forge-accent text-white text-[11px] font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors shrink-0"
            >
              <Play size={10} />
              {spawning ? "..." : "New"}
            </button>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div
              onClick={() => setAutoApprove(!autoApprove)}
              className={clsx(
                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
              )}
            >
              {autoApprove && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
            </div>
            <span className="text-[10px] text-forge-muted">Auto-approve (skip permissions)</span>
          </label>
        </div>

        {/* Forge-spawned terminals */}
        {forgeTerminals.length > 0 && (
          <div className="border-b border-forge-border">
            <div className="px-3 py-1.5">
              <span className="text-[10px] text-forge-muted uppercase tracking-wider">Forge terminals</span>
            </div>
            {forgeTerminals.map((t) => (
              <button
                key={t.terminalId}
                onClick={() => {
                  setActiveTerminals(prev => ({...prev, _current: t.terminalId}));
                  setTab("terminal");
                }}
                className={clsx(
                  "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-forge-surface/50 transition-colors",
                  displayTerminalId === t.terminalId && "bg-forge-accent-dim"
                )}
              >
                <Terminal size={12} className="text-forge-green shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-forge-text truncate">{t.cwd || "~"}</p>
                  <p className="text-[10px] text-forge-muted">{t.terminalId.slice(0, 12)}</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-forge-green animate-pulse shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Existing sessions (from JSONL watcher) */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted">
              <Terminal size={20} />
              <p className="text-xs text-center px-4">
                No sessions yet. Click "New" to start Claude Code, or start it in a terminal.
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const hasPerm = pendingPermissions.some(p => p.sessionId === s.id);
              const hasPending = pendingInputs.some(p => p.sessionId === s.id);
              const hasTerminal = !!activeTerminals[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={clsx(
                    "w-full text-left rounded-lg p-2.5 transition-colors border",
                    selected?.id === s.id
                      ? "bg-forge-accent-dim border-forge-accent"
                      : "bg-forge-surface border-forge-border hover:border-forge-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      s.status === "active" ? "bg-forge-accent" : "bg-forge-border"
                    )}>
                      {hasTerminal
                        ? <Terminal size={10} className="text-white" />
                        : <Bot size={10} className={s.status === "active" ? "text-white" : "text-forge-muted"} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold truncate">
                          {s.displayName || s.project || s.id?.slice(0, 8)}
                        </span>
                        {hasPerm && <Shield size={9} className="text-forge-yellow animate-pulse shrink-0" />}
                        {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-forge-accent shrink-0" />}
                      </div>
                      <p className="text-[10px] text-forge-muted">{s.status}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col">
        {/* Tabs + header */}
        <div className="px-4 py-2 border-b border-forge-border flex items-center gap-4">
          <div className="flex items-center gap-1 bg-forge-surface rounded-lg p-0.5">
            <button
              onClick={() => setTab("terminal")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                tab === "terminal" ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
              )}
            >
              <Terminal size={11} />
              Terminal
            </button>
            <button
              onClick={() => setTab("multi")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                tab === "multi" ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
              )}
            >
              <Grid2X2 size={11} />
              Multi
            </button>
            <button
              onClick={() => setTab("events")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                tab === "events" ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
              )}
            >
              <List size={11} />
              Events
              {sessionPerms.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-forge-yellow text-[9px] text-forge-bg flex items-center justify-center font-bold">
                  {sessionPerms.length}
                </span>
              )}
            </button>
          </div>

          {selected && (
            <div className="flex items-center gap-2 ml-2">
              <span className={clsx(
                "w-1.5 h-1.5 rounded-full",
                selected.status === "active" ? "bg-forge-green animate-pulse" : "bg-forge-muted"
              )} />
              <span className="text-xs text-forge-text font-semibold">
                {selected.displayName || selected.project || selected.id?.slice(0, 8)}
              </span>
              <span className="text-[10px] text-forge-muted">{selected.status}</span>
            </div>
          )}

          {(isPending || sessionPerms.length > 0) && (
            <div className="ml-auto flex items-center gap-1.5 bg-forge-accent-dim border border-forge-accent rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-pulse" />
              <span className="text-[11px] text-forge-accent font-semibold">
                {sessionPerms.length > 0 ? "Permission needed" : "Waiting for input"}
              </span>
            </div>
          )}
        </div>

        {/* Content — all tabs always mounted, hidden via CSS to preserve terminal state */}
        <div className={clsx("flex-1 flex flex-col overflow-hidden", tab !== "terminal" && "hidden")}>
          {displayTerminalId ? (
            <XTerminal
              terminalId={displayTerminalId}
              wsRef={wsRef}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-forge-muted">
              <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
                <Terminal size={28} className="text-forge-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-forge-text mb-1">No terminal active</p>
                <p className="text-xs text-forge-muted max-w-xs">
                  Click "New" to spawn a Claude Code session, or select a session and switch to the Events tab to see its activity.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => spawnClaude(cwdInput)}
                  disabled={spawning}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forge-accent text-white text-xs font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors"
                >
                  <Play size={12} />
                  Start Claude Code
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={clsx(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                      autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
                    )}
                  >
                    {autoApprove && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                  </div>
                  <span className="text-[10px] text-forge-muted">Auto-approve (--dangerously-skip-permissions)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className={clsx("flex-1 flex flex-col overflow-hidden", tab !== "multi" && "hidden")}>
          <MultiSession wsRef={wsRef} />
        </div>

        <div className={clsx("flex-1 flex flex-col overflow-hidden", tab !== "events" && "hidden")}>
          {/* Events tab — raw feed */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {events.length === 0 && (!selected?.messages || selected.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-forge-muted">
                <List size={28} />
                <p className="text-xs">No events yet</p>
              </div>
            ) : (
              <>
                {events.length === 0 && selected?.messages?.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {events.map((event, i) => (
                  <EventRow key={i} event={event} onPermission={handlePermission} />
                ))}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick reply for events tab */}
          <div className="p-3 border-t border-forge-border">
            {copied && (
              <div className="mb-2 flex items-center gap-2 text-xs text-forge-green bg-forge-surface border border-forge-green/30 rounded-lg px-3 py-1.5">
                <CheckCircle2 size={12} />
                <span>Copied to clipboard</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                placeholder={isPending ? "Agent is waiting for your reply..." : "Send a message..."}
                className={clsx(
                  "flex-1 bg-forge-surface border rounded-lg px-3 py-2 text-xs text-forge-text placeholder:text-forge-muted outline-none transition-colors font-mono",
                  isPending ? "border-forge-accent" : "border-forge-border focus:border-forge-muted"
                )}
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim()}
                className="w-8 h-8 rounded-lg bg-forge-accent flex items-center justify-center disabled:opacity-40 hover:bg-orange-500 transition-colors"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Event components ─────────────────────────────────────────────

function EventRow({ event, onPermission }) {
  switch (event.type) {
    case "message": return <MessageBubble msg={event} />;
    case "tool_call": return <ToolCallEvent event={event} />;
    case "tool_result": return <ToolResultEvent event={event} />;
    case "tool_done": return null;
    case "permission_request": return <PermissionEvent event={event} onDecide={onPermission} />;
    case "permission_decided": return <PermissionDecidedEvent event={event} />;
    case "waiting": return <WaitingEvent event={event} />;
    case "status": return <StatusEvent event={event} />;
    case "subagent": return <SubAgentEvent event={event} />;
    default: return null;
  }
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex gap-2 fade-in", isUser && "flex-row-reverse")}>
      <div className={clsx(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-forge-border" : "bg-forge-accent"
      )}>
        {isUser ? <User size={11} className="text-forge-text" /> : <Bot size={11} className="text-white" />}
      </div>
      <div className={clsx(
        "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
        isUser
          ? "bg-forge-accent text-white rounded-tr-none"
          : "bg-forge-surface border border-forge-border text-forge-text rounded-tl-none"
      )}>
        <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
      </div>
    </div>
  );
}

function ToolCallEvent({ event }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[event.tool] || Zap;
  const color = TOOL_COLORS[event.tool] || "text-forge-muted";
  const preview = typeof event.input === "object"
    ? Object.values(event.input || {})[0] : event.input;
  const previewStr = typeof preview === "string" ? preview.slice(0, 120) : JSON.stringify(event.input)?.slice(0, 120);

  return (
    <div className="fade-in">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 bg-forge-surface/60 border border-forge-border rounded-lg px-3 py-2 hover:border-forge-muted transition-colors text-left">
        <Icon size={13} className={clsx("mt-0.5 shrink-0", color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx("text-xs font-semibold", color)}>{event.tool}</span>
            {event.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-forge-green animate-pulse" />}
          </div>
          {previewStr && <p className="text-[11px] text-forge-muted mt-0.5 font-mono truncate">{previewStr}</p>}
        </div>
        {expanded ? <ChevronDown size={12} className="text-forge-muted mt-1" /> : <ChevronRight size={12} className="text-forge-muted mt-1" />}
      </button>
      {expanded && (
        <div className="ml-5 mt-1 bg-forge-bg border border-forge-border rounded-lg p-3 overflow-x-auto">
          <pre className="text-[10px] text-forge-muted font-mono whitespace-pre-wrap">{JSON.stringify(event.input, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ToolResultEvent({ event }) {
  const [expanded, setExpanded] = useState(false);
  const output = event.output || "";
  const preview = typeof output === "string" ? output.slice(0, 120) : JSON.stringify(output).slice(0, 120);

  return (
    <div className="fade-in ml-5">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 bg-forge-surface/30 border border-forge-border/50 rounded-lg px-3 py-1.5 hover:border-forge-muted transition-colors text-left">
        <CheckCircle2 size={11} className="text-forge-green mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-forge-green font-semibold">{event.tool} result</span>
          <p className="text-[10px] text-forge-muted mt-0.5 font-mono truncate">{preview}</p>
        </div>
        {expanded ? <ChevronDown size={10} className="text-forge-muted mt-1" /> : <ChevronRight size={10} className="text-forge-muted mt-1" />}
      </button>
      {expanded && (
        <div className="mt-1 bg-forge-bg border border-forge-border rounded-lg p-3 overflow-auto max-h-60">
          <pre className="text-[10px] text-forge-muted font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

function PermissionEvent({ event, onDecide }) {
  const pending = useForgeStore((s) => s.pendingPermissions.some((p) => p.permissionId === event.permissionId));
  const [expanded, setExpanded] = useState(true);
  const Icon = TOOL_ICONS[event.tool] || Shield;
  const color = TOOL_COLORS[event.tool] || "text-forge-yellow";

  if (!pending) return null;

  const preview = typeof event.input === "object"
    ? Object.values(event.input || {})[0] : event.input;
  const previewStr = typeof preview === "string" ? preview.slice(0, 200) : JSON.stringify(event.input)?.slice(0, 200);

  return (
    <div className="fade-in border-2 border-forge-yellow/50 rounded-xl p-3 bg-forge-yellow/5">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={14} className="text-forge-yellow animate-pulse" />
        <span className="text-xs font-bold text-forge-yellow">Permission Required</span>
      </div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-2 text-left mb-3">
        <Icon size={13} className={clsx("mt-0.5 shrink-0", color)} />
        <div className="flex-1 min-w-0">
          <span className={clsx("text-xs font-semibold", color)}>{event.tool}</span>
          <p className="text-[11px] text-forge-muted mt-0.5 font-mono">{previewStr}</p>
        </div>
      </button>
      {expanded && event.input && (
        <div className="bg-forge-bg border border-forge-border rounded-lg p-3 mb-3 overflow-x-auto">
          <pre className="text-[10px] text-forge-muted font-mono whitespace-pre-wrap">{JSON.stringify(event.input, null, 2)}</pre>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => onDecide(event.permissionId, "allow")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-forge-green/20 border border-forge-green text-xs font-semibold text-forge-green hover:bg-forge-green/30 transition-colors">
          <ShieldCheck size={12} /> Allow
        </button>
        <button onClick={() => onDecide(event.permissionId, "deny")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-forge-red/20 border border-forge-red text-xs font-semibold text-forge-red hover:bg-forge-red/30 transition-colors">
          <ShieldX size={12} /> Deny
        </button>
        <span className="text-[10px] text-forge-muted ml-auto flex items-center gap-1">
          <Clock size={10} /> Waiting...
        </span>
      </div>
    </div>
  );
}

function PermissionDecidedEvent({ event }) {
  const allowed = event.decision === "allow";
  return (
    <div className={clsx("fade-in flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
      allowed ? "bg-forge-green/10 border border-forge-green/30" : "bg-forge-red/10 border border-forge-red/30"
    )}>
      {allowed ? <ShieldCheck size={12} className="text-forge-green" /> : <ShieldX size={12} className="text-forge-red" />}
      <span className={allowed ? "text-forge-green" : "text-forge-red"}>
        {event.tool} — {allowed ? "Allowed" : "Denied"}
      </span>
    </div>
  );
}

function WaitingEvent({ event }) {
  return (
    <div className="fade-in flex items-center gap-2 px-3 py-2 rounded-lg bg-forge-accent/10 border border-forge-accent/30">
      <AlertCircle size={12} className="text-forge-accent animate-pulse" />
      <span className="text-xs text-forge-accent">Agent is waiting for your input</span>
    </div>
  );
}

function StatusEvent({ event }) {
  return (
    <div className="fade-in flex items-center gap-2 px-3 py-1 text-[10px] text-forge-muted">
      <span className={clsx("w-1.5 h-1.5 rounded-full",
        event.status === "active" ? "bg-forge-green" : event.status === "error" ? "bg-forge-red" : "bg-forge-muted"
      )} />
      Session {event.status}
    </div>
  );
}

function SubAgentEvent({ event }) {
  return (
    <div className="fade-in flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
      <Users size={12} className="text-purple-400" />
      <span className="text-xs text-purple-400 font-semibold">Sub-agent spawned</span>
      <span className="text-[10px] text-forge-muted">{event.agent?.description}</span>
    </div>
  );
}
