<div align="center">

```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

**The operating system for Claude Code.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg?style=flat-square)](https://github.com/AhmadMHawwash/forge/pulls)

A local-first control plane that gives you full visibility, cost tracking,<br/>
and multi-agent orchestration on top of Claude Code.

</div>

---

## What is Forge?

Claude Code is the most powerful coding agent available — but you're flying blind. No visibility across sessions, no cost controls, no way to orchestrate multiple agents, and no structured permission management. Forge gives you a visual control plane that sits on top of Claude Code and turns it into infrastructure you can actually operate. Everything runs locally on your machine. No cloud. No accounts.

---

## Features

### 🖥️ Multi-Session Terminal

Run multiple Claude sessions side-by-side with live PTY rendering. Tab-based session management, split-screen layouts, and full interactive terminals powered by xterm.js and node-pty. Every Claude feature works — you're not watching a replay.

### 🏗️ Visual Agent Workflows

An n8n-style canvas for designing multi-agent pipelines. Drag agents onto a React Flow canvas, connect them with triggers and actions, define roles and capabilities per agent, and export the architecture as executable CLAUDE.md instructions.

### 💰 Cost Intelligence

Real-time spend tracking with live burn rates, cache hit ratios, and projected costs per session. Set daily budgets with visual progress indicators. Get per-project breakdowns with 30-day trend analysis. Know exactly where your tokens are going.

### 🔐 Permission Control

Visual allow/deny for every tool call with full context. See the exact command before approving. Get OS notifications and webhook alerts when sessions need approval. Fail-open safety ensures Claude keeps working if Forge is unreachable.

### 📚 Prompt Library

Save, organize, and instantly launch prompt templates. Ships with 10 built-in prompts for common workflows (security review, test generation, PR review). Build custom prompts with categories, tags, and variables. Track usage analytics across projects.

### 🔌 Integrations

Pull context from GitHub repos, issues, and PRs. Fetch Linear tickets and inject them as session context. Configure Slack, Discord, and webhook notifications for session events. All integration tokens encrypted and persisted locally.

### 🤖 Agent Registry

Save and reuse agent configurations across projects. Define per-agent capabilities — which tools they can use, which files they can access. One-click deployment of saved configurations into new sessions.

### 📝 CLAUDE.md Editor

Visual editor for Claude's system instructions. Design and manage CLAUDE.md files without hand-editing markdown. Export directly to your project.

### ⌨️ Command Palette

VS Code-style command launcher (Ctrl+K). Fuzzy search across all actions and navigation targets. Keyboard-first workflow with arrow key navigation and instant execution.

---

## Quick Start

```bash
git clone https://github.com/AhmadMHawwash/forge.git
cd forge
npm install
npm run dev
# Open http://localhost:3333
```

---

## Architecture

```
┌───────────────────────────────────┐
│  Forge UI (React + Tailwind)      │
│  ├── Home Dashboard               │
│  ├── Session Dashboard            │
│  ├── Agent Architect (ReactFlow)  │
│  ├── Terminal Manager (xterm.js)  │
│  ├── Cost Dashboard               │
│  ├── Prompt Library               │
│  ├── Command Palette (Ctrl+K)     │
│  └── Settings                     │
├───────────────────────────────────┤
│  Forge Server (Express + WS)      │
│  ├── Session Watcher (chokidar)   │
│  ├── Agent Run Engine             │
│  ├── Workflow Daemon               │
│  ├── Terminal Manager (node-pty)  │
│  ├── Cost Tracker                 │
│  └── Integration Layer            │
├───────────────────────────────────┤
│  Claude Code (CLI)                │
└───────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, React Flow, xterm.js |
| **Backend** | Express, WebSocket (ws), node-pty, chokidar |
| **Integrations** | Octokit, Linear SDK, Slack/Discord webhooks |
| **Persistence** | Local JSON files in `~/.claude/forge/` |
| **Hook Bridge** | Python 3 stdlib — zero dependencies |

---

## How It Works

- **Session Logs** — Forge watches Claude Code's session logs in `~/.claude/projects/` in real-time. Every message, tool call, and token count is parsed the instant it's written.
- **Embedded Terminal** — Spawns Claude Code as a child process via `node-pty` with full terminal emulation. xterm.js renders over WebSocket for live interactive sessions.
- **Real-Time Updates** — All events are broadcast via WebSocket. The UI reflects every state change as it happens — no polling.
- **Agent Pipelines** — Agent workflows execute as `claude -p` pipelines in topological order. Define dependencies between agents and Forge handles the orchestration.

---

## Data & Privacy

Forge is 100% local. No cloud, no telemetry, no accounts.

- All data stored in `~/.claude/forge/`
- Session logs read from `~/.claude/projects/`
- Integration tokens encrypted with AES-256
- Nothing leaves your machine

---

## Contributing

Contributions are welcome. Open an issue to discuss what you'd like to change, or submit a pull request directly. See the existing codebase conventions and keep PRs focused.

---

## License

[MIT](LICENSE)
