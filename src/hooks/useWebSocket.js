import { useEffect, useRef } from "react";
import { useForgeStore } from "../store/index.js";

const WS_URL = `ws://${window.location.hostname}:3333/ws`;

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const store = useForgeStore();

  function connect() {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Forge connected");
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg, store);
      } catch {}
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return wsRef;
}

function handleMessage(msg, store) {
  switch (msg.type) {
    case "INIT": {
      const { sessions = [], agents } = msg.payload;
      for (const s of sessions) {
        store.addSession(s);
      }
      if (agents?.architectures) {
        store.setArchitectures(agents.architectures);
        store.setActiveArch(agents.active);
      }
      break;
    }

    case "SESSION_DISCOVERED":
    case "SESSION_UPDATE": {
      const { session } = msg.payload;
      store.addSession(session);
      break;
    }

    case "TOOL_CALL": {
      const { sessionId, toolCall } = msg.payload;
      store.addToolCall(sessionId, toolCall);
      break;
    }

    case "SESSION_WAITING": {
      const { sessionId, message, project } = msg.payload;
      store.addPendingInput({ sessionId, message, project, ts: msg.ts });
      store.addNotification({
        id: `notif-${Date.now()}`,
        type: "input_needed",
        sessionId,
        message: `${project}: Agent needs your input`,
        body: message?.slice(0, 100),
        ts: msg.ts,
      });

      // Browser notification
      if (Notification.permission === "granted") {
        new Notification(`Forge — ${project}`, {
          body: message?.slice(0, 100),
          icon: "/forge-icon.png",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification(`Forge — ${project}`, {
              body: message?.slice(0, 100),
            });
          }
        });
      }
      break;
    }

    case "SESSION_STATUS": {
      const { sessionId, status } = msg.payload;
      store.updateSession(sessionId, { status });
      break;
    }

    case "TOKEN_USAGE": {
      const { sessionId, usage } = msg.payload;
      store.updateSession(sessionId, { tokenUsage: usage });
      break;
    }

    case "SUBAGENT_SPAWNED": {
      const { sessionId, subAgent } = msg.payload;
      const session = useForgeStore.getState().sessions[sessionId];
      if (session) {
        store.updateSession(sessionId, {
          subAgents: [...(session.subAgents || []), subAgent],
        });
      }
      break;
    }
  }
}
