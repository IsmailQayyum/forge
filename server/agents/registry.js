/**
 * Agent Registry — standalone, reusable agents with global and project scoping.
 *
 * Global agents:  ~/.claude/forge/registry/
 * Project agents: <projectDir>/.forge/agents/
 *
 * Each agent is a JSON file with metadata, role, prompt, capabilities, etc.
 * Agents from the registry can be dragged onto the Architect canvas or
 * invoked inline during Claude Code sessions.
 */

import fs from "fs";
import path from "path";
import os from "os";

const GLOBAL_DIR = path.join(os.homedir(), ".claude", "forge", "registry");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadAgent(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAgent(filePath, agent) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(agent, null, 2));
}

function listAgentsInDir(dir, scope, projectPath = null) {
  ensureDir(dir);
  const agents = [];
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const agent = loadAgent(path.join(dir, file));
      if (agent) {
        agents.push({ ...agent, scope, projectPath, _file: file });
      }
    }
  } catch {}
  return agents;
}

export const agentRegistry = {
  /**
   * Get all global agents
   */
  getGlobal() {
    return listAgentsInDir(GLOBAL_DIR, "global");
  },

  /**
   * Get project-scoped agents for a specific project directory
   */
  getProject(projectDir) {
    if (!projectDir) return [];
    const dir = path.join(projectDir, ".forge", "agents");
    return listAgentsInDir(dir, "project", projectDir);
  },

  /**
   * Get all agents (global + project) merged
   */
  getAll(projectDir) {
    const global = this.getGlobal();
    const project = projectDir ? this.getProject(projectDir) : [];
    return [...global, ...project];
  },

  /**
   * Get a single agent by ID, searching global then project
   */
  getById(id, projectDir) {
    const all = this.getAll(projectDir);
    return all.find((a) => a.id === id) || null;
  },

  /**
   * Save or update an agent
   */
  save(agent) {
    if (!agent.id) agent.id = `agent-${Date.now()}`;
    const now = Date.now();
    if (!agent.createdAt) agent.createdAt = now;
    agent.updatedAt = now;

    const scope = agent.scope || "global";
    const fileName = `${agent.id}.json`;

    if (scope === "project" && agent.projectPath) {
      const dir = path.join(agent.projectPath, ".forge", "agents");
      saveAgent(path.join(dir, fileName), agent);
    } else {
      saveAgent(path.join(GLOBAL_DIR, fileName), agent);
    }

    return agent;
  },

  /**
   * Delete an agent by ID
   */
  delete(id, projectDir) {
    // Try global first
    const globalFile = path.join(GLOBAL_DIR, `${id}.json`);
    if (fs.existsSync(globalFile)) {
      fs.unlinkSync(globalFile);
      return true;
    }
    // Try project
    if (projectDir) {
      const projFile = path.join(projectDir, ".forge", "agents", `${id}.json`);
      if (fs.existsSync(projFile)) {
        fs.unlinkSync(projFile);
        return true;
      }
    }
    return false;
  },

  /**
   * Duplicate an agent (creates a new copy)
   */
  duplicate(id, projectDir) {
    const agent = this.getById(id, projectDir);
    if (!agent) return null;
    const copy = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    delete copy._file;
    return this.save(copy);
  },

  /**
   * Export an agent to a portable JSON format
   */
  export(id, projectDir) {
    const agent = this.getById(id, projectDir);
    if (!agent) return null;
    const { _file, ...exportable } = agent;
    return exportable;
  },

  /**
   * Import an agent from JSON
   */
  import(agentData, scope = "global", projectPath = null) {
    const agent = {
      ...agentData,
      id: `agent-${Date.now()}`,
      scope,
      projectPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return this.save(agent);
  },

  /**
   * Get preset agent templates
   */
  getPresets() {
    return AGENT_PRESETS;
  },
};

// ── Built-in Agent Presets ──
const AGENT_PRESETS = [
  {
    id: "preset-security-auditor",
    name: "Security Auditor",
    description: "Scans code for OWASP Top 10 vulnerabilities, injection risks, auth issues, and secret leaks",
    role: "reviewer",
    systemPrompt: "You are a security auditor. Scan the codebase for OWASP Top 10 vulnerabilities including SQL injection, XSS, CSRF, authentication flaws, and hardcoded secrets. Report findings with severity levels (Critical, High, Medium, Low) and remediation steps.",
    capabilities: ["read_files", "run_commands"],
    fileRestrictions: [],
    tags: ["security", "review", "audit"],
    icon: "shield",
  },
  {
    id: "preset-test-writer",
    name: "Test Writer",
    description: "Writes comprehensive unit and integration tests for changed code",
    role: "tester",
    systemPrompt: "You are a test engineer. Write thorough unit tests and integration tests for the code. Aim for >80% coverage on changed files. Use the project's existing test framework and patterns. Include edge cases and error paths.",
    capabilities: ["read_files", "write_files", "run_commands"],
    fileRestrictions: ["tests/**", "**/*.test.*", "**/*.spec.*"],
    tags: ["testing", "quality"],
    icon: "flask",
  },
  {
    id: "preset-refactoring-agent",
    name: "Refactoring Agent",
    description: "Identifies and executes safe refactoring opportunities without changing behavior",
    role: "worker",
    systemPrompt: "You are a refactoring specialist. Identify code smells, duplication, and complexity issues. Execute safe refactoring that improves maintainability without changing behavior. Run tests after each change to verify no regressions.",
    capabilities: ["read_files", "write_files", "run_commands"],
    fileRestrictions: [],
    tags: ["refactoring", "quality", "maintenance"],
    icon: "wrench",
  },
  {
    id: "preset-doc-writer",
    name: "Documentation Writer",
    description: "Generates or updates documentation, READMEs, and inline comments",
    role: "worker",
    systemPrompt: "You are a technical writer. Generate clear, concise documentation. Include API references, usage examples, and architecture overviews. Follow the project's existing documentation style and format.",
    capabilities: ["read_files", "write_files"],
    fileRestrictions: ["**/*.md", "docs/**"],
    tags: ["documentation", "writing"],
    icon: "book",
  },
  {
    id: "preset-performance-analyzer",
    name: "Performance Analyzer",
    description: "Profiles code for performance bottlenecks and suggests optimizations",
    role: "reviewer",
    systemPrompt: "You are a performance engineer. Analyze code for performance bottlenecks: N+1 queries, unnecessary re-renders, unoptimized algorithms, memory leaks, large bundle sizes. Provide specific optimization recommendations with expected impact.",
    capabilities: ["read_files", "run_commands"],
    fileRestrictions: [],
    tags: ["performance", "optimization", "review"],
    icon: "zap",
  },
  {
    id: "preset-migration-agent",
    name: "Migration Agent",
    description: "Handles database migrations, API version upgrades, and dependency updates",
    role: "worker",
    systemPrompt: "You are a migration specialist. Handle database schema changes, API version upgrades, and dependency updates. Create migration files, update affected code, and verify nothing breaks. Always create rollback plans.",
    capabilities: ["read_files", "write_files", "run_commands"],
    fileRestrictions: [],
    tags: ["migration", "database", "dependencies"],
    icon: "database",
  },
  {
    id: "preset-code-reviewer",
    name: "Code Reviewer",
    description: "Reviews code for quality, patterns, naming, error handling, and best practices",
    role: "reviewer",
    systemPrompt: "You are a senior code reviewer. Review code for maintainability, naming conventions, error handling, edge cases, and adherence to project patterns. Be constructive — explain the 'why' behind suggestions.",
    capabilities: ["read_files", "run_commands"],
    fileRestrictions: [],
    tags: ["review", "quality"],
    icon: "eye",
  },
  {
    id: "preset-api-builder",
    name: "API Builder",
    description: "Designs and implements REST/GraphQL API endpoints with validation and error handling",
    role: "worker",
    systemPrompt: "You are an API specialist. Design and implement clean API endpoints with proper validation, error handling, authentication, and documentation. Follow REST best practices or the project's existing API patterns.",
    capabilities: ["read_files", "write_files", "run_commands"],
    fileRestrictions: ["server/**", "api/**", "src/routes/**"],
    tags: ["api", "backend"],
    icon: "globe",
  },
];
