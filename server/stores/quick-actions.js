const QUICK_ACTIONS = [
  { id: "review-pr", label: "Review PR", icon: "eye", prompt: "Review the open PR on this branch. Check for bugs, edge cases, and style issues. Be thorough.", color: "blue" },
  { id: "write-tests", label: "Write Tests", icon: "test-tube", prompt: "Write comprehensive tests for the files I changed. Use existing test patterns.", color: "green" },
  { id: "fix-lint", label: "Fix Lint", icon: "check", prompt: "Run the linter and fix every error and warning.", color: "yellow" },
  { id: "create-pr", label: "Create PR", icon: "git-pull-request", prompt: "Create a PR for this branch with a clear title, description, and test plan.", color: "purple" },
  { id: "explain", label: "Explain", icon: "book-open", prompt: "Explain what this codebase does. Architecture, key files, patterns. Be concise.", color: "cyan" },
  { id: "debug", label: "Debug", icon: "bug", prompt: "Help me debug. Look at recent errors and investigate the root cause.", color: "red" },
  { id: "commit", label: "Commit", icon: "git-commit", prompt: "Stage the relevant changes and create a well-described commit.", color: "orange" },
  { id: "refactor", label: "Refactor", icon: "wand", prompt: "Refactor the most recently changed files. Improve readability without changing behavior.", color: "pink" },
];

export function getQuickActions() {
  return QUICK_ACTIONS;
}
