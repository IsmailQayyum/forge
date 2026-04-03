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
