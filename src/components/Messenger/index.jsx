import React, { useState, useRef, useEffect } from "react";
import { useForgeStore } from "../../store/index.js";
import { MessageSquare, Send, Bot, User } from "lucide-react";
import clsx from "clsx";

export function Messenger() {
  const sessions = useForgeStore((s) => Object.values(s.sessions));
  const pendingInputs = useForgeStore((s) => s.pendingInputs);
  const removePendingInput = useForgeStore((s) => s.removePendingInput);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const bottomRef = useRef(null);

  const selected = sessions.find((s) => s.id === selectedId) || sessions[0];
  const isPending = pendingInputs.some((p) => p.sessionId === selected?.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages?.length]);

  function sendReply() {
    if (!reply.trim() || !selected) return;
    fetch("/api/session/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: selected.id, text: reply }),
    });
    removePendingInput(selected.id);
    setReply("");
  }

  return (
    <div className="flex h-full">
      {/* Thread list */}
      <div className="w-64 border-r border-forge-border flex flex-col">
        <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
          <MessageSquare size={14} className="text-forge-accent" />
          <span className="text-sm font-semibold">Messenger</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-forge-muted">
              <MessageSquare size={20} />
              <p className="text-xs text-center">No sessions yet</p>
            </div>
          ) : (
            sessions.map((s) => {
              const hasPending = pendingInputs.some((p) => p.sessionId === s.id);
              const lastMsg = s.messages?.at(-1);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={clsx(
                    "w-full text-left rounded-lg p-3 transition-colors border",
                    selected?.id === s.id
                      ? "bg-forge-accent-dim border-forge-accent"
                      : "bg-forge-surface border-forge-border hover:border-forge-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-forge-border flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-forge-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate">
                          {s.project || s.id?.slice(0, 8)}
                        </span>
                        {hasPending && (
                          <span className="w-2 h-2 rounded-full bg-forge-accent shrink-0" />
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-[10px] text-forge-muted truncate mt-0.5">
                          {lastMsg.text?.slice(0, 40)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-forge-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-forge-accent flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.project || selected.id?.slice(0, 8)}</p>
                <p className="text-xs text-forge-muted">{selected.status}</p>
              </div>
              {isPending && (
                <div className="ml-auto flex items-center gap-1.5 bg-forge-accent-dim border border-forge-accent rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-pulse" />
                  <span className="text-xs text-forge-accent">Waiting for input</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {(!selected.messages || selected.messages.length === 0) ? (
                <div className="flex items-center justify-center h-full text-forge-muted text-xs">
                  No messages yet
                </div>
              ) : (
                selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={clsx("flex gap-2 fade-in", msg.role === "user" && "flex-row-reverse")}
                  >
                    <div className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                      msg.role === "assistant" ? "bg-forge-accent" : "bg-forge-border"
                    )}>
                      {msg.role === "assistant"
                        ? <Bot size={11} className="text-white" />
                        : <User size={11} className="text-forge-text" />}
                    </div>
                    <div className={clsx(
                      "max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "assistant"
                        ? "bg-forge-surface border border-forge-border text-forge-text rounded-tl-none"
                        : "bg-forge-accent text-white rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="p-3 border-t border-forge-border">
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                  placeholder={isPending ? "Agent is waiting for your reply..." : "Send a message..."}
                  className={clsx(
                    "flex-1 bg-forge-surface border rounded-lg px-3 py-2 text-xs text-forge-text placeholder:text-forge-muted outline-none transition-colors",
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-forge-muted text-sm">
            Select a session to chat
          </div>
        )}
      </div>
    </div>
  );
}
