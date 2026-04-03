# Forge 🔥

Local agent orchestration platform for Claude Code. See everything your agents are doing, chat with them when they need input, design multi-agent architectures, and inject context from GitHub, Linear, Excel, and more — all from one beautiful UI.

```bash
npx forge
```

Opens at `http://localhost:3333`.

---

## What it does

### Sessions — See everything in real time
Every active Claude Code session is visible as a live card. Click into any session to see a real-time feed of every tool call, file read, and command run. Sub-agents show up as a tree when Claude spawns them.

### Messenger — Chat with your agents
Each session is a conversation thread. When an agent is blocked waiting for your input, you get an OS pop-up notification and the thread is highlighted. Reply inline — your response pipes back to the agent automatically.

### Architect — Design multi-agent systems
Visual drag-and-drop canvas to define your agent hierarchy. Set a supervisor agent, spawn child agents, connect them. Per-agent capability toggles define exactly what each agent is allowed to do: read files, push GitHub PRs, read Linear tickets, send Slack messages, and more.

### Context Hub — Inject anything as context
Drag and drop Excel sheets, CSVs, PDFs, or code files — Forge parses them and makes them ready to inject into any session with one click. Connect GitHub to browse issues and PRs and attach them as context. Connect Linear to pull in tickets.

### Integrations — Everything connected
- **GitHub** — browse repos, issues, PRs, inject as context
- **Linear** — fetch your tickets, inject as context
- **Slack** — get notified when agents need input

---

## Install

```bash
# Run directly (no install needed)
npx forge

# Or install globally
npm install -g forge
forge
```

## Development

```bash
git clone https://github.com/IsmailQayyum/forge
cd forge
npm install
npm run dev
```

Opens the Vite dev server at `http://localhost:5173` with hot reload.

## Architecture

```
forge/
├── server/               # Express + WebSocket backend
│   ├── index.js          # Server entry, WebSocket hub
│   ├── sessions.js       # Claude Code JSONL log watcher
│   ├── agents/store.js   # Agent architecture persistence
│   ├── routes/           # API routes
│   └── integrations/     # GitHub, Linear, file parsers
├── src/                  # React frontend
│   ├── components/
│   │   ├── SessionDashboard/   # Live session monitor
│   │   ├── Messenger/          # Agent chat interface
│   │   ├── AgentArchitect/     # React Flow canvas
│   │   ├── ContextHub/         # File + integration context
│   │   └── Integrations/       # Connection management
│   ├── store/            # Zustand state
│   └── hooks/            # WebSocket hook
└── bin/forge.js          # CLI entry point
```

## License

MIT
