import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/shared/Sidebar.jsx";
import { Home } from "./components/Home/index.jsx";
import { SessionDashboard } from "./components/SessionDashboard/index.jsx";
import { Messenger } from "./components/Messenger/index.jsx";
import { AgentArchitect } from "./components/AgentArchitect/index.jsx";
import { ContextHub } from "./components/ContextHub/index.jsx";
import { Integrations } from "./components/Integrations/index.jsx";
import { PromptLibrary } from "./components/PromptLibrary/index.jsx";
import { CostDashboard } from "./components/CostDashboard/index.jsx";
import { ClaudeMdEditor } from "./components/ClaudeMdEditor/index.jsx";
import { AgentRegistry } from "./components/AgentRegistry/index.jsx";
import { Settings } from "./components/Settings/index.jsx";
import { ShortcutsOverlay } from "./components/shared/ShortcutsOverlay.jsx";
import { CommandPalette } from "./components/shared/CommandPalette.jsx";
import { useForgeStore } from "./store/index.js";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { NotificationToast } from "./components/shared/NotificationToast.jsx";

const VIEWS = {
  home: Home,
  sessions: SessionDashboard,
  messenger: Messenger,
  architect: AgentArchitect,
  registry: AgentRegistry,
  context: ContextHub,
  integrations: Integrations,
  prompts: PromptLibrary,
  costs: CostDashboard,
  claudemd: ClaudeMdEditor,
  settings: Settings,
};

export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  useWebSocket();

  // Listen for navigation events (from quick actions, prompt library, home dashboard, etc.)
  useEffect(() => {
    function handleNavigate(e) {
      const view = e.detail?.view || e.detail;
      if (view && VIEWS[view]) {
        setActiveView(view);
      }
    }
    window.addEventListener("navigate-to", handleNavigate);
    return () => {
      window.removeEventListener("navigate-to", handleNavigate);
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.contentEditable === "true") return;

      const viewKeys = { "1": "home", "2": "sessions", "3": "messenger", "4": "architect", "5": "costs" };

      if ((e.ctrlKey || e.metaKey) && viewKeys[e.key]) {
        e.preventDefault();
        setActiveView(viewKeys[e.key]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setActiveView("messenger");
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowCommandPalette(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const View = VIEWS[activeView] || Home;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-forge-bg">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-hidden relative">
        <View />
      </main>
      <NotificationToast />
      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onShowShortcuts={() => { setShowCommandPalette(false); setShowShortcuts(true); }}
        />
      )}
    </div>
  );
}
