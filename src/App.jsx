import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/shared/Sidebar.jsx";
import { SessionDashboard } from "./components/SessionDashboard/index.jsx";
import { Messenger } from "./components/Messenger/index.jsx";
import { AgentArchitect } from "./components/AgentArchitect/index.jsx";
import { ContextHub } from "./components/ContextHub/index.jsx";
import { Integrations } from "./components/Integrations/index.jsx";
import { PromptLibrary } from "./components/PromptLibrary/index.jsx";
import { CostDashboard } from "./components/CostDashboard/index.jsx";
import { ClaudeMdEditor } from "./components/ClaudeMdEditor/index.jsx";
import { AgentRegistry } from "./components/AgentRegistry/index.jsx";
import { useForgeStore } from "./store/index.js";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { NotificationToast } from "./components/shared/NotificationToast.jsx";

const VIEWS = {
  sessions: SessionDashboard,
  messenger: Messenger,
  architect: AgentArchitect,
  registry: AgentRegistry,
  context: ContextHub,
  integrations: Integrations,
  prompts: PromptLibrary,
  costs: CostDashboard,
  claudemd: ClaudeMdEditor,
};

export default function App() {
  const [activeView, setActiveView] = useState("sessions");
  useWebSocket();

  // Listen for navigation events (from quick actions, prompt library, etc.)
  useEffect(() => {
    function handleNavigate(e) {
      if (e.detail?.view && VIEWS[e.detail.view]) {
        setActiveView(e.detail.view);
      }
    }
    window.addEventListener("forge:navigate", handleNavigate);
    return () => window.removeEventListener("forge:navigate", handleNavigate);
  }, []);

  const View = VIEWS[activeView] || SessionDashboard;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-forge-bg">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-hidden relative">
        <View />
      </main>
      <NotificationToast />
    </div>
  );
}
