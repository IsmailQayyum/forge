import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sessionWatcher } from "./sessions.js";
import { agentStore } from "./agents/store.js";
import { contextRouter } from "./routes/context.js";
import { integrationsRouter } from "./routes/integrations.js";
import { agentsRouter } from "./routes/agents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.FORGE_PORT || 3333;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve built frontend in production
if (process.argv.includes("--serve")) {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_, res) => res.sendFile(path.join(distPath, "index.html")));
}

// API routes
app.use("/api/context", contextRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/agents", agentsRouter);

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true, version: "1.0.0" }));

// WebSocket broadcast
export function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// WebSocket connection
wss.on("connection", (ws) => {
  // Send current state on connect
  ws.send(JSON.stringify({
    type: "INIT",
    payload: {
      sessions: sessionWatcher.getSessions(),
      agents: agentStore.getAll(),
    },
    ts: Date.now(),
  }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(msg, ws);
    } catch {
      // ignore malformed messages
    }
  });
});

function handleClientMessage(msg, ws) {
  switch (msg.type) {
    case "SESSION_INPUT":
      // Developer replied to an agent — write to session input file
      sessionWatcher.sendInput(msg.payload.sessionId, msg.payload.text);
      break;
    case "PING":
      ws.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
      break;
  }
}

// Start session watcher
sessionWatcher.start(broadcast);

server.listen(PORT, () => {
  console.log(`Forge server running on http://localhost:${PORT}`);
});
