# Forge

Local agent orchestration platform for Claude Code. See everything your agents are doing, chat with them when they need input, design multi-agent architectures with CLAUDE.md export, and inject context from GitHub, Linear, Excel, and more — all from one UI.

```bash
npx forge
```

Opens at `http://localhost:3333`.

---

## Features

### Session Dashboard — Live monitoring
Every active Claude Code session shows up as a live card with status (active/done/error). Click into any session to see a real-time feed of every tool call, file read, and command run. Sub-agents appear as tags when Claude spawns them.

**Token burn rate** — see total tokens, input/output breakdown, cache hit rate, burn rate (tokens/min), estimated cost, and time-until-budget projection per session.

### Messenger — Talk to your agents
Each session is a conversation thread. When an agent is blocked waiting for your input, you get an OS-level notification and the thread highlights. Reply inline — your response routes back to the agent via the hook bridge.

### Agent Architect — Design + export multi-agent systems
Visual drag-and-drop canvas (React Flow) to define your agent hierarchy. Set supervisors, spawn workers, connect them. Per-agent capability toggles define what each agent is allowed to do: read files, push GitHub PRs, read Linear tickets, send Slack messages, etc.

**Export CLAUDE.md** — one click generates a CLAUDE.md file from your architecture with agent hierarchy, allowed capabilities, restrictions, and workflow rules that Claude Code follows.

### Context Hub — Inject anything
Drag and drop Excel sheets, CSVs, PDFs, or code files — Forge parses them and makes them ready to inject into any session. Connect GitHub to browse issues and PRs. Connect Linear to pull in tickets.

### Integrations
- **GitHub** — browse repos, issues, PRs, inject as context
- **Linear** — fetch tickets, inject as context
- **Slack** — notifications when agents need input

---

## Setup

```bash
# Run directly
npx forge

# Or install globally
npm install -g forge
forge
```

### Connect to Claude Code

```bash
forge install        # installs hooks into .claude/settings.json (current project)
forge install -g     # install globally (~/.claude/settings.json)
```

This installs the hook bridge — a lightweight Python script that:
- Sends tool call events to Forge in real-time (PostToolUse)
- Checks for pending messages before each tool use (PreToolUse)
- Forwards notifications (Notification)
- Reports session end events (Stop)

To remove:
```bash
forge uninstall
forge uninstall -g
```

## Development

```bash
git clone https://github.com/IsmailQayyum/forge
cd forge
npm install
npm run dev
```

Vite dev server runs at `http://localhost:5173` with HMR, API proxied to port 3333.

## Architecture

```
forge/
├── server/               # Express + WebSocket backend
│   ├── index.js          # Server entry, WebSocket hub
│   ├── sessions.js       # Claude Code JSONL log watcher
│   ├── agents/
│   │   ├── store.js      # Agent architecture persistence
│   │   └── claudemd.js   # CLAUDE.md generator
│   ├── routes/           # API routes (sessions, hooks, agents, context, integrations)
│   └── integrations/     # GitHub, Linear, file parsers
├── hooks/
│   └── forge-bridge.py   # Claude Code hook bridge
├── src/                  # React frontend
│   ├── components/
│   │   ├── SessionDashboard/   # Live session monitor + token burn rate
│   │   ├── Messenger/          # Agent chat interface
│   │   ├── AgentArchitect/     # React Flow canvas + CLAUDE.md export
│   │   ├── ContextHub/         # File + integration context
│   │   └── Integrations/       # Connection management
│   ├── store/            # Zustand state
│   └── hooks/            # WebSocket connection
├── src/cli/
│   └── install.js        # forge install/uninstall commands
└── bin/forge.js          # CLI entry point
```

## How it works

Forge reads Claude Code's JSONL session logs from `~/.claude/projects/` using chokidar file watchers. It parses assistant messages, tool calls, token usage, and sub-agent spawns in real-time and broadcasts them over WebSocket to the React frontend.

The hook bridge (`forge-bridge.py`) is installed into Claude Code's hook system. It sends HTTP events to the Forge server on every tool call and checks for pending user messages, enabling bidirectional communication between Forge and Claude Code sessions.

## License

MIT
