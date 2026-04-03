import fs from "fs";
import path from "path";
import os from "os";

const STORE_PATH = path.join(os.homedir(), ".claude", "forge", "prompts.json");

const DEFAULT_PROMPTS = [
  {
    id: "fix-pr-comments",
    name: "Fix PR Review Comments",
    description: "Address all review comments on the current PR",
    prompt: "Look at the open PR review comments on this branch and fix every single one. Run the tests after.",
    category: "git",
    tags: ["pr", "review", "fix"],
    builtin: true,
  },
  {
    id: "write-tests",
    name: "Write Tests",
    description: "Generate comprehensive tests for recent changes",
    prompt: "Look at the files I changed recently (git diff main) and write comprehensive tests for all the new/modified functions. Use the existing test patterns in this repo.",
    category: "testing",
    tags: ["tests", "coverage"],
    builtin: true,
  },
  {
    id: "fix-lint",
    name: "Fix Lint Errors",
    description: "Auto-fix all linting and type errors",
    prompt: "Run the linter and type checker, then fix every error and warning. Don't just suppress them — actually fix the underlying issues.",
    category: "quality",
    tags: ["lint", "types", "fix"],
    builtin: true,
  },
  {
    id: "refactor-file",
    name: "Refactor This File",
    description: "Clean up and refactor the specified file",
    prompt: "Refactor this file to improve readability, reduce complexity, and follow best practices. Keep the same behavior. Explain what you changed and why.",
    category: "refactor",
    tags: ["refactor", "clean"],
    builtin: true,
  },
  {
    id: "explain-codebase",
    name: "Explain Codebase",
    description: "Get a high-level overview of the project",
    prompt: "Give me a high-level overview of this codebase. What does it do, what's the architecture, what are the key files and patterns? Keep it concise.",
    category: "explore",
    tags: ["explain", "overview"],
    builtin: true,
  },
  {
    id: "create-pr",
    name: "Create PR",
    description: "Create a pull request with a good description",
    prompt: "Create a pull request for my current branch. Write a clear title and description that explains what changed and why. Include a test plan.",
    category: "git",
    tags: ["pr", "git"],
    builtin: true,
  },
  {
    id: "debug-error",
    name: "Debug This Error",
    description: "Investigate and fix an error",
    prompt: "I'm seeing this error. Investigate the root cause, trace through the code, and fix it. Run tests to verify the fix.",
    category: "debug",
    tags: ["debug", "error", "fix"],
    builtin: true,
  },
  {
    id: "add-docs",
    name: "Add Documentation",
    description: "Document undocumented code",
    prompt: "Find functions and modules that lack documentation in the recently changed files. Add clear, concise JSDoc/docstring comments. Don't over-document obvious things.",
    category: "docs",
    tags: ["docs", "comments"],
    builtin: true,
  },
  {
    id: "security-review",
    name: "Security Review",
    description: "Check for security vulnerabilities",
    prompt: "Do a security review of the recent changes. Check for injection vulnerabilities, auth issues, exposed secrets, unsafe operations. Report findings with severity.",
    category: "quality",
    tags: ["security", "review"],
    builtin: true,
  },
  {
    id: "perf-optimize",
    name: "Optimize Performance",
    description: "Find and fix performance bottlenecks",
    prompt: "Analyze this codebase for performance issues — N+1 queries, unnecessary re-renders, missing indexes, heavy computations that could be cached. Fix the top issues.",
    category: "quality",
    tags: ["performance", "optimize"],
    builtin: true,
  },
];

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
      // Merge builtins with user prompts
      const userPrompts = data.prompts || [];
      const builtinIds = new Set(DEFAULT_PROMPTS.map((p) => p.id));
      const custom = userPrompts.filter((p) => !builtinIds.has(p.id));
      return [...DEFAULT_PROMPTS, ...custom];
    }
  } catch {}
  return [...DEFAULT_PROMPTS];
}

function save(prompts) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify({ prompts }, null, 2));
}

export const promptStore = {
  getAll() {
    return load();
  },

  create(prompt) {
    const prompts = load();
    const entry = {
      ...prompt,
      id: prompt.id || `prompt-${Date.now()}`,
      createdAt: Date.now(),
      usedCount: 0,
      lastUsed: null,
    };
    prompts.push(entry);
    save(prompts);
    return entry;
  },

  update(id, updates) {
    const prompts = load();
    const idx = prompts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    prompts[idx] = { ...prompts[idx], ...updates, updatedAt: Date.now() };
    save(prompts);
    return prompts[idx];
  },

  delete(id) {
    const prompts = load().filter((p) => p.id !== id);
    save(prompts);
  },

  recordUse(id) {
    const prompts = load();
    const p = prompts.find((p) => p.id === id);
    if (p) {
      p.usedCount = (p.usedCount || 0) + 1;
      p.lastUsed = Date.now();
      save(prompts);
    }
  },
};
