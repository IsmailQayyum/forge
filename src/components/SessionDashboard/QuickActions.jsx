import React, { useState, useEffect } from "react";
import {
  Eye, TestTube, Check, GitPullRequest, BookOpen, Bug, GitCommit, Wand,
  Play, ChevronRight,
} from "lucide-react";
import clsx from "clsx";

const ICON_MAP = {
  eye: Eye, "test-tube": TestTube, check: Check, "git-pull-request": GitPullRequest,
  "book-open": BookOpen, bug: Bug, "git-commit": GitCommit, wand: Wand,
};

const COLOR_MAP = {
  blue: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20",
  green: "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20",
  yellow: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20",
  purple: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20",
  cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20",
  red: "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20",
  orange: "text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20",
  pink: "text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20",
};

export function QuickActions() {
  const [actions, setActions] = useState([]);
  const [launching, setLaunching] = useState(null);

  useEffect(() => {
    fetch("/api/quick-actions").then(r => r.json()).then(setActions);
  }, []);

  async function launch(action) {
    setLaunching(action.id);
    try {
      await fetch("/api/terminal/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: ["-p", action.prompt] }),
      });
      window.dispatchEvent(new CustomEvent("navigate-to", { detail: { view: "messenger" } }));
    } catch {}
    setLaunching(null);
  }

  if (actions.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-forge-border">
      <div className="flex items-center gap-2 mb-2">
        <Play size={10} className="text-forge-accent" />
        <span className="text-[10px] text-forge-muted uppercase tracking-wider">Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map(action => {
          const Icon = ICON_MAP[action.icon] || ChevronRight;
          const colorClass = COLOR_MAP[action.color] || COLOR_MAP.blue;
          return (
            <button
              key={action.id}
              onClick={() => launch(action)}
              disabled={launching === action.id}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors",
                colorClass,
                launching === action.id && "opacity-50"
              )}
            >
              <Icon size={10} />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
