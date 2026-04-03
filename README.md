<p align="center">
  <img src=".github/banner.svg" alt="Forge Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-22c55e?style=flat-square&logo=github" alt="Build" />
  <img src="https://img.shields.io/badge/release-v1.0.0-f97316?style=flat-square" alt="Release" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-3b82f6?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-a855f7?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-71717a?style=flat-square" alt="License" />
</p>

<p align="center">
  <strong>Forge</strong> is a local-first developer platform for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>.<br/>
  Run multiple sessions in parallel, track costs in real-time, manage permissions from a visual UI,<br/>
  design multi-agent architectures — all from one interface. No cloud. No accounts. Fully local.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-how-it-works">How It Works</a> ·
  <a href="#-development">Development</a>
</p>

---

## 🚀 Quick Start

```bash
git clone https://github.com/IsmailQayyum/forge.git
cd forge
npm install
npx vite build
node server/index.js --serve
```

Opens at **http://localhost:3333**

### Connect to Claude Code

```bash
node src/cli/install.js       # project-level hooks
node src/cli/install.js -g    # global hooks
```

---

## ✨ Features

### Terminal — Full Claude Code Experience

Spawn Claude Code sessions directly from the browser with full xterm.js terminal emulation.

| Capability | Description |
|-----------|-------------|
| **Session tabs** | Open multiple Claude sessions, switch like browser tabs |
| **Split-screen grid** | View 2, 4, or more terminals simultaneously in a 2x2 grid |
| **Directory browser** | Auto-detects projects (scans for `.git` / `CLAUDE.md`), or browse manually |
| **Rename sessions** | Double-click any tab to label it (Frontend, Backend, Tests) |
| **Auto-approve** | Skip permission prompts for trusted workflows |
| **Activity panel** | Collapsible side panel with live tool calls and permission requests |

### Session Dashboard — Live Monitoring

Every active Claude Code session appears as a live card with status, tool calls, and token usage.

- **Token burn rate** — input/output breakdown, cache hits, burn rate (tokens/min), cost estimate
- **Session search** — full-text search across all messages and tool calls
- **Export** — download any session as markdown
- **Quick actions** — one-click buttons: Review PR, Write Tests, Fix Lint, Debug, Commit, Refactor
- **Diff viewer** — current branch, changed files, syntax-colored diffs

### Cost Dashboard — Real-Time Spend Tracking

Automatic token tracking from your Claude Code sessions with Opus 4 pricing.

- **Today / Week / Month / All Time** cost breakdowns
- **Daily budget** with configurable limit and progress bar
- **30-day trend** bar chart with hover tooltips
- **Per-project breakdown** — which projects cost the most

### Prompt Library — Save & Reuse

10 built-in prompts + unlimited custom prompts. One-click launch spawns a Claude session with the prompt pre-loaded.

- **Categories** — code review, testing, debugging, docs, security, performance
- **Search** — find by name, description, or tags
- **Usage tracking** — see which prompts you use most

### Agent Architect — Visual Multi-Agent Design

Drag-and-drop canvas (React Flow) to design agent hierarchies with supervisors, workers, and connections.

- **Export CLAUDE.md** — generates CLAUDE.md with roles, capabilities, restrictions, delegation rules
- **Capability toggles** — control what each agent can do

### CLAUDE.md Editor

Find, edit, and save CLAUDE.md files across all your projects. Auto-discovery, dirty tracking, save confirmation.

### Context Hub

Drag and drop files to parse and inject as context. Supports Excel, CSV, PDF, code files, plain text.

### Integrations

| Integration | Description |
|------------|-------------|
| **GitHub** | Connect with PAT, browse repos/issues/PRs, inject as context |
| **Linear** | Connect with API key, fetch tickets, inject as context |
| **Slack** | Webhook notifications when sessions need attention |
| **Discord** | Webhook notifications with rich embeds |
| **Generic** | Any webhook URL with JSON payloads |

### Permission Flow

When Claude Code needs tool approval, Forge intercepts via the hook bridge and surfaces **Allow / Deny** in the UI. No terminal switching needed. 5-minute timeout. Fail-open if Forge is down.

---

## 🏗 Architecture

```
forge/
├── server/                    # Express + WebSocket backend
│   ├── index.js               # Server entry, WS hub, terminal & FS APIs
│   ├── sessions.js            # JSONL log watcher (chokidar)
│   ├── terminal.js            # PTY management (node-pty)
│   ├── agents/                # Architecture store + CLAUDE.md generator
│   ├── routes/                # REST APIs (sessions, hooks, prompts, costs, git, etc.)
│   ├── stores/                # JSON file persistence (~/.claude/forge/)
│   └── integrations/          # GitHub (Octokit), Linear SDK, file parsers
├── hooks/
│   └── forge-bridge.py        # Claude Code hook bridge (zero dependencies)
├── src/                       # React + Vite frontend
│   ├── components/
│   │   ├── Messenger/         # Terminal tabs, grid, xterm.js, directory browser
│   │   ├── SessionDashboard/  # Activity feed, token monitor, diff viewer, search
│   │   ├── AgentArchitect/    # React Flow canvas
│   │   ├── PromptLibrary/     # Prompt CRUD + one-click run
│   │   ├── CostDashboard/     # Spend tracking + trends
│   │   ├── ClaudeMdEditor/    # Multi-file editor
│   │   ├── ContextHub/        # File upload + integration context
│   │   └── Integrations/      # Connections + webhooks
│   ├── store/                 # Zustand state management
│   └── hooks/                 # WebSocket connection
└── src/cli/
    └── install.js             # Hook installer / uninstaller
```

---

## ⚡ How It Works

```
┌─────────────┐    JSONL logs     ┌──────────────┐    WebSocket     ┌─────────────┐
│             │ ────────────────▶ │              │ ◀────────────▶  │             │
│ Claude Code │                   │ Forge Server │                  │  Forge UI   │
│  (terminal) │ ◀── hook bridge ─▶│  (Express)   │                  │  (React)    │
│             │   HTTP POST/GET   │              │                  │             │
└─────────────┘                   └──────────────┘                  └─────────────┘
```

| Layer | What happens |
|-------|-------------|
| **Session logs** | Forge watches `~/.claude/projects/` JSONL files via chokidar. Parses messages, tool calls, tokens, sub-agents in real-time. |
| **Hook bridge** | `forge-bridge.py` installs into Claude Code's hook system. Sends events on every tool call, checks for pending messages. |
| **Embedded terminal** | Spawns Claude Code as a child process via `node-pty`. Rendered in browser via xterm.js over WebSocket. |
| **Permission flow** | `PreToolUse` hooks POST to Forge → UI shows Allow/Deny → hook polls for decision (5min timeout, fail-open). |

### Hook Events

| Hook | Trigger | What it does |
|------|---------|-------------|
| `PreToolUse` | Before any tool call | Permission check + pending message delivery |
| `PostToolUse` | After tool completes | Sends tool output to Forge UI |
| `Notification` | Agent needs input | Forwards to UI + fires webhooks |
| `Stop` | Session ends | Reports status + fires webhook notifications |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Flow, xterm.js |
| Backend | Express, WebSocket (ws), node-pty, chokidar |
| Integrations | Octokit (GitHub), Linear SDK |
| Persistence | JSON files in `~/.claude/forge/` |
| Hook Bridge | Python 3 (stdlib only, zero dependencies) |

---

## 💾 Data Storage

Everything stays local. Nothing leaves your machine.

| Data | Location |
|------|----------|
| Session logs | `~/.claude/projects/` (Claude Code native) |
| Prompts | `~/.claude/forge/prompts.json` |
| Cost history | `~/.claude/forge/cost-history.json` |
| Webhooks | `~/.claude/forge/notifications.json` |
| Session names | `~/.claude/forge/session-names.json` |
| Hook inputs | `~/.claude/forge/inputs/` |

---

## 🧑‍💻 Development

```bash
git clone https://github.com/IsmailQayyum/forge.git
cd forge
npm install

# Terminal 1 — Vite dev server with HMR
npm run dev

# Terminal 2 — Backend
node server/index.js
```

Vite runs at `http://localhost:5173`, API proxied to `3333`.

### Production Build

```bash
npx vite build
node server/index.js --serve
```

---

## 📄 License

MIT
