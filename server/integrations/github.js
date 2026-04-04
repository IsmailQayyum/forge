import { Octokit } from "@octokit/rest";
import { integrationStore } from "../stores/integrations.js";

let octokit = null;

// Auto-reconnect from stored credentials on import
try {
  const stored = integrationStore.getCredential("github");
  if (stored?.token_raw) {
    octokit = new Octokit({ auth: stored.token_raw });
  }
} catch {}

export const githubClient = {
  connect(token) {
    octokit = new Octokit({ auth: token });
    return this.getUser().then((user) => {
      // Persist token on successful connection
      integrationStore.saveCredential("github", token, { user: user.login });
      return user;
    });
  },

  disconnect() {
    octokit = null;
    integrationStore.removeCredential("github");
  },

  async getUser() {
    const { data } = await octokit.users.getAuthenticated();
    return data;
  },

  async listRepos() {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
    });
    return data.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      owner: r.owner.login,
      name: r.name,
      description: r.description,
      private: r.private,
      updatedAt: r.updated_at,
    }));
  },

  async listIssues(owner, repo) {
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 50,
    });
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        body: i.body,
        labels: i.labels.map((l) => l.name),
        assignee: i.assignee?.login,
        createdAt: i.created_at,
        url: i.html_url,
      }));
  },

  async listPRs(owner, repo) {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 50,
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      author: pr.user.login,
      branch: pr.head.ref,
      createdAt: pr.created_at,
      url: pr.html_url,
    }));
  },

  async getIssueAsContext(owner, repo, number) {
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: number });
    const { data: comments } = await octokit.issues.listComments({ owner, repo, issue_number: number });

    let content = `# GitHub Issue #${issue.number}: ${issue.title}\n\n`;
    content += `**Repo:** ${owner}/${repo}\n`;
    content += `**Labels:** ${issue.labels.map((l) => l.name).join(", ") || "none"}\n`;
    content += `**URL:** ${issue.html_url}\n\n`;
    content += `## Description\n${issue.body || "No description provided."}\n`;

    if (comments.length > 0) {
      content += `\n## Comments\n`;
      for (const c of comments.slice(0, 10)) {
        content += `\n**${c.user.login}:** ${c.body}\n`;
      }
    }

    return content;
  },

  isConnected() {
    return octokit !== null;
  },
};
