import { Router } from "express";
import { execSync } from "child_process";

export const gitRouter = Router();

function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

// Get git info for a directory
gitRouter.get("/info", (req, res) => {
  const cwd = req.query.cwd;
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  const branch = git("rev-parse --abbrev-ref HEAD", cwd);
  if (!branch) return res.json({ isRepo: false });

  const status = git("status --porcelain", cwd);
  const lastCommit = git('log -1 --pretty=format:"%h %s"', cwd);
  const ahead = git("rev-list @{u}..HEAD --count 2>/dev/null", cwd);
  const behind = git("rev-list HEAD..@{u} --count 2>/dev/null", cwd);

  const changedFiles = status
    ? status.split("\n").filter(Boolean).map((line) => ({
        status: line.slice(0, 2).trim(),
        file: line.slice(3),
      }))
    : [];

  res.json({
    isRepo: true,
    branch,
    lastCommit,
    ahead: parseInt(ahead) || 0,
    behind: parseInt(behind) || 0,
    changedFiles,
    dirty: changedFiles.length > 0,
  });
});

// Get diff for a directory
gitRouter.get("/diff", (req, res) => {
  const cwd = req.query.cwd;
  const base = req.query.base || "HEAD";
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  const diff = git(`diff ${base} --stat`, cwd);
  const fullDiff = git(`diff ${base}`, cwd);

  res.json({ stat: diff, diff: fullDiff?.slice(0, 50000) }); // cap at 50KB
});

// Get file diff (specific file)
gitRouter.get("/diff/file", (req, res) => {
  const { cwd, file } = req.query;
  if (!cwd || !file) return res.status(400).json({ error: "cwd and file required" });

  const diff = git(`diff HEAD -- "${file}"`, cwd);
  res.json({ file, diff });
});

// Get recent commits
gitRouter.get("/log", (req, res) => {
  const cwd = req.query.cwd;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  if (!cwd) return res.status(400).json({ error: "cwd required" });

  const raw = git(`log --pretty=format:"%H|%h|%an|%ar|%s" -${limit}`, cwd);
  if (!raw) return res.json({ commits: [] });

  const commits = raw.split("\n").filter(Boolean).map((line) => {
    const [hash, short, author, timeAgo, ...rest] = line.split("|");
    return { hash, short, author, timeAgo, message: rest.join("|") };
  });
  res.json({ commits });
});

// Get diff between two commits (useful for seeing what an agent run changed)
gitRouter.get("/diff/range", (req, res) => {
  const { cwd, from, to } = req.query;
  if (!cwd) return res.status(400).json({ error: "cwd required" });
  const fromRef = from || "HEAD~1";
  const toRef = to || "HEAD";

  const stat = git(`diff ${fromRef}..${toRef} --stat`, cwd);
  const diff = git(`diff ${fromRef}..${toRef}`, cwd);
  const files = git(`diff ${fromRef}..${toRef} --name-status`, cwd);

  const changedFiles = files ? files.split("\n").filter(Boolean).map((line) => {
    const [status, ...parts] = line.split("\t");
    return { status, file: parts.join("\t") };
  }) : [];

  res.json({
    from: fromRef,
    to: toRef,
    stat,
    diff: diff?.slice(0, 100000),
    changedFiles,
  });
});

// Stash and unstash (for undoing agent changes)
gitRouter.post("/stash", (req, res) => {
  const { cwd, message } = req.body;
  if (!cwd) return res.status(400).json({ error: "cwd required" });
  const result = git(`stash push -m "${message || "Forge stash"}"`, cwd);
  res.json({ ok: !!result, message: result });
});

gitRouter.post("/stash/pop", (req, res) => {
  const { cwd } = req.body;
  if (!cwd) return res.status(400).json({ error: "cwd required" });
  const result = git("stash pop", cwd);
  res.json({ ok: !!result, message: result });
});
