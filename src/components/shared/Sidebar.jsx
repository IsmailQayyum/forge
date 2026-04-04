import React from "react";
import {
  LayoutDashboard, MessageSquare, GitBranch, Paperclip, Plug,
  Flame, BookOpen, DollarSign, FileText, Bot,
} from "lucide-react";
import { useForgeStore } from "../../store/index.js";
import clsx from "clsx";

const NAV_TOP = [
  { id: "sessions", icon: LayoutDashboard, label: "Sessions" },
  { id: "messenger", icon: MessageSquare, label: "Terminal" },
  { id: "prompts", icon: BookOpen, label: "Prompts" },
  { id: "costs", icon: DollarSign, label: "Costs" },
];

const NAV_BOTTOM = [
  { id: "architect", icon: GitBranch, label: "Workflows" },
  { id: "registry", icon: Bot, label: "Agents" },
  { id: "claudemd", icon: FileText, label: "CLAUDE.md" },
  { id: "context", icon: Paperclip, label: "Context" },
  { id: "integrations", icon: Plug, label: "Integrations" },
];

export function Sidebar({ activeView, onNavigate }) {
  const pendingInputs = useForgeStore((s) => s.pendingInputs);
  const pendingPermissions = useForgeStore((s) => s.pendingPermissions);
  const messengerBadge = pendingInputs.length + pendingPermissions.length;

  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-1 border-r border-forge-border bg-forge-surface shrink-0">
      {/* Logo */}
      <div className="mb-3 flex items-center justify-center w-9 h-9 rounded-lg bg-forge-accent">
        <Flame size={18} className="text-white" />
      </div>

      {/* Main nav */}
      {NAV_TOP.map(({ id, icon: Icon, label }) => (
        <NavButton
          key={id}
          id={id}
          icon={Icon}
          label={label}
          isActive={activeView === id}
          badge={id === "messenger" ? messengerBadge : 0}
          onClick={() => onNavigate(id)}
        />
      ))}

      <div className="w-6 h-px bg-forge-border my-2" />

      {/* Secondary nav */}
      {NAV_BOTTOM.map(({ id, icon: Icon, label }) => (
        <NavButton
          key={id}
          id={id}
          icon={Icon}
          label={label}
          isActive={activeView === id}
          onClick={() => onNavigate(id)}
        />
      ))}
    </aside>
  );
}

function NavButton({ id, icon: Icon, label, isActive, badge = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={clsx(
        "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
        isActive
          ? "bg-forge-accent text-white"
          : "text-forge-muted hover:text-forge-text hover:bg-forge-border"
      )}
    >
      <Icon size={16} />
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-forge-red rounded-full text-[9px] flex items-center justify-center text-white font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
