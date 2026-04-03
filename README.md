<p align="center">
  <img src="https://raw.githubusercontent.com/IsmailQayyum/forge/develop/.github/logo.svg" width="80" height="80" alt="Forge Logo" />
</p>

<h1 align="center">Forge</h1>

<p align="center">
  <strong>The developer platform for Claude Code</strong>
</p>

<p align="center">
  Multi-session orchestration · Real-time cost tracking · Permission controls · Prompt library · Visual agent design
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#setup">Setup</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#development">Development</a>
</p>

---

## What is Forge?

Forge is a local-first platform that gives you complete control over your Claude Code sessions. Run multiple Claude instances in parallel, track costs in real-time, manage permissions from a visual UI, and design multi-agent architectures — all from one interface.

No cloud. No accounts. Runs entirely on your machine.

---

## Features

### Terminal — Full Claude Code Experience
Spawn Claude Code sessions directly from the browser. Every session runs as a real PTY process with full xterm.js terminal emulation.

- **Session tabs** — open multiple Claude sessions, switch between them like browser tabs
- **Split-screen grid** — view 2, 4, or more terminals simultaneously in a grid layout
- **Directory browser** — auto-detects projects (scans for `.git` / `CLAUDE.md`), or browse manually
- **Rename sessions** — double-click any tab to label it (Frontend, Backend, Tests, etc.)
- **Auto-approve** — optionally skip permission prompts for trusted workflows
- **Activity panel** — collapsible side panel shows live tool calls, messages, and permission requests

### Session Dashboard — Live Monitoring
Every active Claude Code session shows up as a live card with status, tool calls, and token usage. Sub-agents appear as tags when Claude spawns them.

- **Token burn rate** — input/output breakdown, cache hit rate, burn rate (tokens/min), cost estimate
- **Session search** — full-text search across all session messages and tool calls
- **Export** — download any session as a markdown file
- **Quick actions** — one-click buttons for common tasks (Review PR, Write Tests, Fix Lint, Debug, etc.)
- **Diff viewer** — see current git branch, changed files, and syntax-colored diffs

### Cost Dashboard — Real-Time Spend Tracking
Built on Opus 4 pricing with automatic token tracking from your sessions.

- **Today / Week / Month / All Time** — instant cost breakdowns
- **Daily budget** — configurable budget with progress bar
- **30-day trend** — bar chart with hover tooltips
- **Per-project breakdown** — see which projects are costing the most

### Prompt Library — Save & Reuse
10 built-in prompts plus unlimited custom prompts. One-click launch spawns a Claude session with the prompt pre-loaded.

- **Categories** — organize by type (code review, testing, debugging, docs, etc.)
- **Search** — find prompts by name, description, or tags
- **Usage tracking** — see which prompts you use most

### Agent Architect — Visual Multi-Agent Design
Drag-and-drop canvas (React Flow) to design agent hierarchies. Define supervisors, workers, and connections. Set per-agent capabilities and restrictions.

- **Export CLAUDE.md** — generates a CLAUDE.md file from your architecture with roles, capabilities, restrictions, and delegation rules
- **Capability toggles** — control what each agent can do (read files, run commands, push PRs, etc.)

### CLAUDE.md Editor
Find, edit, and save CLAUDE.md files across all your projects from one place. Dirty tracking, save confirmation, and auto-discovery of known files.

### Context Hub
Drag and drop files to parse and inject as context into sessions. Supports Excel, CSV, PDF, code files, and plain text.

### Integrations
- **GitHub** — connect with a personal access token, browse repos/issues/PRs, inject as context
- **Linear** — connect with an API key, fetch tickets, inject as context
- **Notification Webhooks** — Slack, Discord, or generic webhooks with event filtering (session end, errors, permission needed, input needed)

### Permission Flow
When Claude Code needs approval for a tool call, Forge intercepts it via the hook bridge and surfaces an Allow/Deny prompt in the UI. No need to switch to the terminal.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/IsmailQayyum/forge.git
cd forge
npm install

# Build frontend
npx vite build

# Start server
node server/index.js --serve
```

Opens at **http://localhost:3333**

### Connect to Claude Code

```bash
# Install hooks (project-level)
node src/cli/install.js

# Or install globally
node src/cli/install.js -g
```

This installs the hook bridge — a lightweight Python script that enables bidirectional communication between Forge and Claude Code:

| Hook | What it does |
|------|-------------|
| `PreToolUse` | Checks for pending messages, handles permission requests |
| `PostToolUse` | Sends tool completion events with output |
| `Notification` | Forwards agent notifications to the UI |
| `Stop` | Reports session end, fires webhook notifications |

---

## Architecture

```
forge/
├── server/                    # Express + WebSocket backend
│   ├── index.js               # Server entry, WS hub, terminal & FS APIs
│   ├── sessions.js            # JSONL log watcher (chokidar)
│   ├── terminal.js            # PTY management (node-pty)
│   ├── agents/
│   │   ├── store.js           # Agent architecture persistence
│   │   └── claudemd.js        # CLAUDE.md generator from architectures
│   ├── routes/
│   │   ├── sessions.js        # Session CRUD, search, export
│   │   ├── hooks.js           # Permission flow, message passing
│   │   ├── agents.js          # Agent architecture CRUD
│   │   ├── prompts.js         # Prompt library CRUD
│   │   ├── costs.js           # Cost tracking & summaries
│   │   ├── git.js             # Git info, diffs
│   │   ├── notifications.js   # Webhook CRUD & test
│   │   ├── claudemd.js        # CLAUDE.md file operations
│   │   ├── context.js         # Context injection
│   │   └── integrations.js    # GitHub & Linear connections
│   ├── stores/                # JSON file-based persistence
│   │   ├── prompts.js         # ~/.claude/forge/prompts.json
│   │   ├── costs.js           # ~/.claude/forge/cost-history.json
│   │   ├── notifications.js   # ~/.claude/forge/notifications.json
│   │   └── quick-actions.js   # Predefined quick actions
│   └── integrations/          # GitHub (Octokit), Linear SDK, file parsers
├── hooks/
│   └── forge-bridge.py        # Claude Code hook bridge
├── src/                       # React + Vite frontend
│   ├── App.jsx                # Root layout, view routing
│   ├── components/
│   │   ├── Messenger/         # Terminal tabs, grid, XTerminal, directory browser
│   │   ├── SessionDashboard/  # Activity feed, token monitor, diff viewer, search
│   │   ├── AgentArchitect/    # React Flow canvas, CLAUDE.md export
│   │   ├── PromptLibrary/     # Prompt CRUD, search, one-click run
│   │   ├── CostDashboard/     # Spend tracking, trends, per-project breakdown
│   │   ├── ClaudeMdEditor/    # Multi-file CLAUDE.md editor
│   │   ├── ContextHub/        # File upload, GitHub/Linear context
│   │   ├── Integrations/      # Connection management, webhooks
│   │   └── shared/            # Sidebar, notification toast
│   ├── store/                 # Zustand state management
│   └── hooks/                 # WebSocket connection, real-time sync
└── src/cli/
    └── install.js             # Hook installer/uninstaller
```

## How It Works

```
┌─────────────┐     JSONL logs      ┌──────────────┐     WebSocket      ┌─────────────┐
│ Claude Code  │ ──────────────────▶ │  Forge Server │ ◀──────────────▶  │  Forge UI   │
│  (terminal)  │                     │  (Express)    │                    │  (React)    │
│              │ ◀── hook bridge ──▶ │               │                    │             │
└─────────────┘   HTTP POST/GET      └──────────────┘                    └─────────────┘
```

1. **Session monitoring** — Forge watches Claude Code's JSONL session logs in `~/.claude/projects/` using chokidar. Parses messages, tool calls, token usage, and sub-agent spawns in real-time.

2. **Hook bridge** — `forge-bridge.py` is installed into Claude Code's hook system. On every tool call, it sends events to Forge via HTTP and checks for pending user messages, enabling bidirectional communication.

3. **Embedded terminal** — Forge spawns Claude Code as a child process via `node-pty`, giving full stdin/stdout control. The terminal is rendered in the browser via xterm.js, piped through WebSocket.

4. **Permission flow** — `PreToolUse` hooks block and POST to Forge. The UI shows Allow/Deny. The hook polls for the decision with a 5-minute timeout. If Forge is down, it fail-opens (auto-allows).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Zustand, React Flow, xterm.js |
| Backend | Express, WebSocket (ws), node-pty, chokidar |
| Integrations | Octokit (GitHub), Linear SDK |
| Persistence | JSON files in `~/.claude/forge/` |
| Hook Bridge | Python 3 (urllib, no dependencies) |

---

## Development

```bash
git clone https://github.com/IsmailQayyum/forge.git
cd forge
npm install

# Terminal 1 — Vite dev server (HMR)
npm run dev

# Terminal 2 — Backend
node server/index.js
```

Vite dev server runs at `http://localhost:5173` with API proxied to port 3333.

### Production Build

```bash
npx vite build
node server/index.js --serve
```

---

## Data Storage

All data stays local. Nothing leaves your machine.

| Data | Location |
|------|----------|
| Session logs | `~/.claude/projects/` (Claude Code native) |
| Prompts | `~/.claude/forge/prompts.json` |
| Cost history | `~/.claude/forge/cost-history.json` |
| Webhooks | `~/.claude/forge/notifications.json` |
| Session names | `~/.claude/forge/session-names.json` |
| Hook inputs | `~/.claude/forge/inputs/` |

---

## License

MIT
