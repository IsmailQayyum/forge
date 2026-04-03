import { Router } from "express";
import { githubClient } from "../integrations/github.js";
import { linearClient } from "../integrations/linear.js";

export const integrationsRouter = Router();

// ── GitHub ─────────────────────────────────────────────────────────────────

integrationsRouter.post("/github/connect", async (req, res) => {
  try {
    const { token } = req.body;
    await githubClient.connect(token);
    const user = await githubClient.getUser();
    res.json({ ok: true, user: user.login });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/github/repos", async (req, res) => {
  try {
    const repos = await githubClient.listRepos();
    res.json(repos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/github/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const issues = await githubClient.listIssues(owner, repo);
    res.json(issues);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/github/repos/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const prs = await githubClient.listPRs(owner, repo);
    res.json(prs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/github/issues/:owner/:repo/:number/content", async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const content = await githubClient.getIssueAsContext(owner, repo, parseInt(number));
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Linear ─────────────────────────────────────────────────────────────────

integrationsRouter.post("/linear/connect", async (req, res) => {
  try {
    const { apiKey } = req.body;
    await linearClient.connect(apiKey);
    const viewer = await linearClient.getViewer();
    res.json({ ok: true, user: viewer.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/linear/issues", async (req, res) => {
  try {
    const { assignedToMe } = req.query;
    const issues = await linearClient.listIssues(assignedToMe === "true");
    res.json(issues);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

integrationsRouter.get("/linear/issues/:id/content", async (req, res) => {
  try {
    const content = await linearClient.getIssueAsContext(req.params.id);
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
