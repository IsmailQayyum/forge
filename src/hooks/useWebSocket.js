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
    window.__forgeWs = ws; // expose for terminal component

    ws.onopen = () => {
      console.log("Forge connected");
      window.__forgeWs = ws;
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
        // Build initial event stream from existing messages + tool calls
        if (s.messages?.length || s.toolCalls?.length) {
          const events = [];
          for (const m of s.messages || []) {
            events.push({ type: "message", role: m.role, text: m.text, ts: m.ts });
          }
          for (const tc of s.toolCalls || []) {
            events.push({ type: "tool_call", tool: tc.name, input: tc.input, status: tc.status, ts: tc.ts });
          }
          events.sort((a, b) => a.ts - b.ts);
          for (const e of events) {
            store.addSessionEvent(s.id, e);
          }
        }
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

    case "SESSION_MESSAGE": {
      const { sessionId, message } = msg.payload;
      if (message) {
        store.addSessionEvent(sessionId, {
          type: "message",
          role: message.role,
          text: message.text,
          ts: message.ts,
        });
      }
      break;
    }

    case "TOOL_CALL": {
      const { sessionId, toolCall } = msg.payload;
      store.addToolCall(sessionId, toolCall);
      store.addSessionEvent(sessionId, {
        type: "tool_call",
        id: toolCall.id,
        tool: toolCall.name,
        input: toolCall.input,
        status: "running",
        ts: toolCall.ts,
      });
      break;
    }

    case "TOOL_CALL_DONE": {
      const { sessionId, toolCallId } = msg.payload;
      store.addSessionEvent(sessionId, {
        type: "tool_done",
        id: toolCallId,
        ts: Date.now(),
      });
      break;
    }

    case "HOOK_TOOL_COMPLETE": {
      const { sessionId, tool, input, output, ts } = msg.payload;
      store.addSessionEvent(sessionId, {
        type: "tool_result",
        tool,
        input,
        output,
        ts: ts ? new Date(ts).getTime() : Date.now(),
      });
      break;
    }

    // ── Permission flow ──
    case "PERMISSION_REQUEST": {
      const { permissionId, sessionId, project, tool, input, ts } = msg.payload;
      store.addPendingPermission({ permissionId, sessionId, project, tool, input, ts });
      store.addSessionEvent(sessionId, {
        type: "permission_request",
        permissionId,
        tool,
        input,
        ts,
      });

      // OS notification
      const title = `Forge — ${project}`;
      const body = `${tool} needs permission`;
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/forge-icon.png" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") new Notification(title, { body });
        });
      }
      break;
    }

    case "PERMISSION_DECIDED": {
      const { permissionId, sessionId, decision, tool } = msg.payload;
      store.resolvePermission(permissionId);
      store.addSessionEvent(sessionId, {
        type: "permission_decided",
        permissionId,
        tool,
        decision,
        ts: Date.now(),
      });
      break;
    }

    case "SESSION_WAITING": {
      const { sessionId, message, project } = msg.payload;
      store.addPendingInput({ sessionId, message, project, ts: msg.ts });
      store.addSessionEvent(sessionId, {
        type: "waiting",
        message,
        ts: Date.now(),
      });
      store.addNotification({
        id: `notif-${Date.now()}`,
        type: "input_needed",
        sessionId,
        message: `${project}: Agent needs your input`,
        body: message?.slice(0, 100),
        ts: msg.ts,
      });

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
      store.addSessionEvent(sessionId, {
        type: "status",
        status,
        ts: Date.now(),
      });
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
      store.addSessionEvent(sessionId, {
        type: "subagent",
        agent: subAgent,
        ts: Date.now(),
      });
      break;
    }
  }
}
