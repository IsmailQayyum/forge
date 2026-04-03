import React, { useState } from "react";
import { Sidebar } from "./components/shared/Sidebar.jsx";
import { SessionDashboard } from "./components/SessionDashboard/index.jsx";
import { Messenger } from "./components/Messenger/index.jsx";
import { AgentArchitect } from "./components/AgentArchitect/index.jsx";
import { ContextHub } from "./components/ContextHub/index.jsx";
import { Integrations } from "./components/Integrations/index.jsx";
import { useForgeStore } from "./store/index.js";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { NotificationToast } from "./components/shared/NotificationToast.jsx";

const VIEWS = {
  sessions: SessionDashboard,
  messenger: Messenger,
  architect: AgentArchitect,
  context: ContextHub,
  integrations: Integrations,
};

export default function App() {
  const [activeView, setActiveView] = useState("sessions");
  useWebSocket();

  const View = VIEWS[activeView] || SessionDashboard;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-forge-bg">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-hidden">
        <View />
      </main>
      <NotificationToast />
    </div>
  );
}
