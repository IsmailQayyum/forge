import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, LayoutDashboard, MessageSquare, Plus, GitBranch,
  BookOpen, DollarSign, Bot, Plug, FileText, Paperclip,
  Keyboard, Search,
} from "lucide-react";
import clsx from "clsx";

const ICON_MAP = {
  Home,
  LayoutDashboard,
  MessageSquare,
  Plus,
  GitBranch,
  BookOpen,
  DollarSign,
  Bot,
  Plug,
  FileText,
  Paperclip,
  Keyboard,
};

const COMMANDS = [
  { id: "home", label: "Go to Home", category: "Navigation", icon: "Home", action: "home" },
  { id: "sessions", label: "Go to Sessions", category: "Navigation", icon: "LayoutDashboard", action: "sessions" },
  { id: "terminal", label: "Open Terminal", category: "Navigation", icon: "MessageSquare", action: "messenger" },
  { id: "new-terminal", label: "New Terminal Session", category: "Actions", icon: "Plus", action: "messenger" },
  { id: "architect", label: "Design Workflow", category: "Navigation", icon: "GitBranch", action: "architect" },
  { id: "prompts", label: "Browse Prompts", category: "Navigation", icon: "BookOpen", action: "prompts" },
  { id: "costs", label: "View Costs", category: "Navigation", icon: "DollarSign", action: "costs" },
  { id: "registry", label: "Agent Registry", category: "Navigation", icon: "Bot", action: "registry" },
  { id: "integrations", label: "Integrations", category: "Navigation", icon: "Plug", action: "integrations" },
  { id: "claudemd", label: "CLAUDE.md Editor", category: "Navigation", icon: "FileText", action: "claudemd" },
  { id: "context", label: "Context Hub", category: "Navigation", icon: "Paperclip", action: "context" },
  { id: "shortcuts", label: "Keyboard Shortcuts", category: "Help", icon: "Keyboard", action: "shortcuts" },
  { id: "settings", label: "Settings", category: "Navigation", icon: "FileText", action: "settings" },
];

function fuzzyMatch(query, text) {
  const lower = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < query.length; i++) {
    if (lower[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

function groupByCategory(commands) {
  const groups = [];
  const seen = new Set();
  for (const cmd of commands) {
    if (!seen.has(cmd.category)) {
      seen.add(cmd.category);
      groups.push({ category: cmd.category, items: [] });
    }
    groups.find((g) => g.category === cmd.category).items.push(cmd);
  }
  return groups;
}

export function CommandPalette({ onClose, onShowShortcuts }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((cmd) => fuzzyMatch(q, cmd.label));
  }, [query]);

  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function executeCommand(cmd) {
    onClose();
    if (cmd.action === "shortcuts") {
      onShowShortcuts();
    } else {
      window.dispatchEvent(
        new CustomEvent("navigate-to", { detail: cmd.action })
      );
    }
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, filtered, selectedIndex]);

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-forge-surface border border-forge-border rounded-xl w-full max-w-[500px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-forge-border">
          <Search size={16} className="text-forge-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-forge-text placeholder:text-forge-muted outline-none"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-forge-muted">
              No results
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.category}>
                <div className="px-4 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-forge-muted">
                  {group.category}
                </div>
                {group.items.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const Icon = ICON_MAP[cmd.icon];
                  const idx = flatIndex;

                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                        isSelected
                          ? "bg-forge-accent/10 border-l-2 border-forge-accent"
                          : "border-l-2 border-transparent hover:bg-forge-border/30"
                      )}
                    >
                      {Icon && (
                        <Icon
                          size={16}
                          className={clsx(
                            "shrink-0",
                            isSelected ? "text-forge-accent" : "text-forge-muted"
                          )}
                        />
                      )}
                      <span
                        className={clsx(
                          "flex-1 text-sm",
                          isSelected ? "text-forge-text" : "text-forge-muted"
                        )}
                      >
                        {cmd.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-forge-border/50 text-forge-muted">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-forge-border flex items-center gap-4 text-[11px] text-forge-muted">
          <span>
            <kbd className="bg-forge-bg border border-forge-border rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="bg-forge-bg border border-forge-border rounded px-1 py-0.5 font-mono text-[10px]">↵</kbd>{" "}
            select
          </span>
          <span>
            <kbd className="bg-forge-bg border border-forge-border rounded px-1 py-0.5 font-mono text-[10px]">esc</kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
