import React, { useState, useRef, useEffect } from "react";
import { XTerminal } from "./XTerminal.jsx";
import { Plus, Play, X, Maximize2, Minimize2, Grid2X2, Rows2, Square } from "lucide-react";
import clsx from "clsx";

export function MultiSession({ wsRef }) {
  const [terminals, setTerminals] = useState([]);
  const [layout, setLayout] = useState("grid");
  const [focusedId, setFocusedId] = useState(null);
  const [spawning, setSpawning] = useState(false);
  const [quickCwd, setQuickCwd] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);

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
      if (data.terminalId) {
        const entry = {
          id: data.terminalId,
          terminalId: data.terminalId,
          cwd: cwd || "~",
          label: label || `Session ${terminals.length + 1}`,
          status: "active",
          pid: data.pid,
        };
        setTerminals(prev => [...prev, entry]);
        setFocusedId(data.terminalId);
      }
    } catch {}
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
    if (focusedId === terminalId) {
      setFocusedId(terminals.find(t => t.terminalId !== terminalId)?.terminalId || null);
    }
  }

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
    const ws = wsRef?.current;
    if (ws) {
      ws.addEventListener("message", handleWs);
      return () => ws.removeEventListener("message", handleWs);
    }
  }, [wsRef?.current]);

  const activeCount = terminals.filter(t => t.status === "active").length;
  // Always render all terminals to preserve xterm state; hide non-focused via CSS
  const visibleTerminals = terminals;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-forge-border flex items-center gap-2">
        <input
          value={quickCwd}
          onChange={e => setQuickCwd(e.target.value)}
          placeholder="Working directory..."
          className="bg-forge-surface border border-forge-border rounded-md px-2 py-1 text-[11px] text-forge-text placeholder:text-forge-muted outline-none focus:border-forge-muted font-mono w-48"
        />
        <button
          onClick={() => spawnSession(quickCwd)}
          disabled={spawning}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-forge-accent text-white text-[10px] font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors"
        >
          <Plus size={10} /> {spawning ? "..." : "Add"}
        </button>
        <label className="flex items-center gap-1 ml-1">
          <div
            onClick={() => setAutoApprove(!autoApprove)}
            className={clsx(
              "w-3 h-3 rounded border flex items-center justify-center cursor-pointer transition-colors",
              autoApprove ? "bg-forge-accent border-forge-accent" : "border-forge-border"
            )}
          >
            {autoApprove && <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
          </div>
          <span className="text-[9px] text-forge-muted">Auto-approve</span>
        </label>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-forge-muted mr-1">{activeCount} active</span>
          {[
            { id: "grid", icon: Grid2X2 },
            { id: "tabs", icon: Rows2 },
            { id: "focus", icon: Square },
          ].map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setLayout(id)}
              className={clsx("p-1 rounded", layout === id ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text")}>
              <Icon size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      {(layout === "tabs" || layout === "focus") && terminals.length > 0 && (
        <div className="flex items-center border-b border-forge-border bg-forge-surface/50 overflow-x-auto">
          {terminals.map(t => (
            <button key={t.terminalId} onClick={() => setFocusedId(t.terminalId)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 text-[11px] border-r border-forge-border transition-colors shrink-0",
                focusedId === t.terminalId ? "bg-forge-accent-dim text-forge-accent" : "text-forge-muted hover:text-forge-text"
              )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", t.status === "active" ? "bg-forge-green animate-pulse" : "bg-forge-muted")} />
              <span className="font-semibold">{t.label}</span>
              <span className="text-[9px] font-mono text-forge-muted">{t.cwd}</span>
              <span onClick={e => { e.stopPropagation(); removeSession(t.terminalId); }} className="ml-1 text-forge-muted hover:text-forge-red cursor-pointer">
                <X size={9} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {terminals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-forge-muted">
          <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
            <Grid2X2 size={28} className="text-forge-accent" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-forge-text mb-1">Multi-Session Orchestration</p>
            <p className="text-xs max-w-sm">Run multiple Claude Code sessions in parallel. Great for frontend + backend + tests simultaneously.</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: "Frontend", cls: "bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30" },
              { label: "Backend", cls: "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30" },
              { label: "Tests", cls: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30" },
            ].map(({ label, cls }) => (
              <button key={label} onClick={() => spawnSession("", label)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold ${cls}`}>
                + {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={clsx(
          "flex-1 overflow-hidden",
          layout === "grid" && "grid gap-[1px] bg-forge-border",
          layout === "grid" && terminals.length <= 2 && "grid-cols-2",
          layout === "grid" && terminals.length === 3 && "grid-cols-3",
          layout === "grid" && terminals.length >= 4 && "grid-cols-2 grid-rows-2",
        )}>
          {visibleTerminals.map(t => (
            <div key={t.terminalId} className={clsx(
              "relative bg-forge-bg flex flex-col min-h-0",
              layout === "focus" && focusedId && t.terminalId !== focusedId && "hidden"
            )}>
              <div className="flex items-center gap-2 px-2 py-1 bg-forge-surface border-b border-forge-border shrink-0">
                <span className={clsx("w-1.5 h-1.5 rounded-full", t.status === "active" ? "bg-forge-green animate-pulse" : "bg-forge-muted")} />
                <span className="text-[10px] font-semibold text-forge-text">{t.label}</span>
                <span className="text-[9px] text-forge-muted font-mono">{t.cwd}</span>
                <div className="ml-auto flex items-center gap-1">
                  {layout !== "focus" && (
                    <button onClick={() => { setLayout("focus"); setFocusedId(t.terminalId); }} className="p-0.5 text-forge-muted hover:text-forge-text">
                      <Maximize2 size={9} />
                    </button>
                  )}
                  {layout === "focus" && (
                    <button onClick={() => setLayout("grid")} className="p-0.5 text-forge-muted hover:text-forge-text">
                      <Minimize2 size={9} />
                    </button>
                  )}
                  <button
                    onClick={() => t.status === "active" ? killSession(t.terminalId) : removeSession(t.terminalId)}
                    className="p-0.5 text-forge-muted hover:text-forge-red" title={t.status === "active" ? "Kill" : "Remove"}>
                    <X size={9} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {t.status === "active" ? (
                  <XTerminal terminalId={t.terminalId} wsRef={wsRef} />
                ) : (
                  <div className="flex items-center justify-center h-full text-forge-muted text-xs">Session exited</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
