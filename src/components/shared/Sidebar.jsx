import React from "react";
import { LayoutDashboard, MessageSquare, GitBranch, Paperclip, Plug, Flame } from "lucide-react";
import { useForgeStore } from "../../store/index.js";
import clsx from "clsx";

const NAV = [
  { id: "sessions", icon: LayoutDashboard, label: "Sessions" },
  { id: "messenger", icon: MessageSquare, label: "Messenger" },
  { id: "architect", icon: GitBranch, label: "Architect" },
  { id: "context", icon: Paperclip, label: "Context" },
  { id: "integrations", icon: Plug, label: "Integrations" },
];

export function Sidebar({ activeView, onNavigate }) {
  const pendingInputs = useForgeStore((s) => s.pendingInputs);

  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-1 border-r border-forge-border bg-forge-surface shrink-0">
      {/* Logo */}
      <div className="mb-4 flex items-center justify-center w-9 h-9 rounded-lg bg-forge-accent">
        <Flame size={18} className="text-white" />
      </div>

      {NAV.map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id;
        const hasBadge = id === "messenger" && pendingInputs.length > 0;

        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={label}
            className={clsx(
              "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-forge-accent text-white"
                : "text-forge-muted hover:text-forge-text hover:bg-forge-border"
            )}
          >
            <Icon size={16} />
            {hasBadge && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-forge-red rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                {pendingInputs.length}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
