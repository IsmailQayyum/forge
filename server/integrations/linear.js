import { LinearClient } from "@linear/sdk";
import { integrationStore } from "../stores/integrations.js";

let client = null;

// Auto-reconnect from stored credentials on import
try {
  const stored = integrationStore.getCredential("linear");
  if (stored?.token_raw) {
    client = new LinearClient({ apiKey: stored.token_raw });
  }
} catch {}

export const linearClient = {
  async connect(apiKey) {
    client = new LinearClient({ apiKey });
    const viewer = await this.getViewer();
    // Persist on successful connection
    integrationStore.saveCredential("linear", apiKey, { user: viewer.name });
    return viewer;
  },

  disconnect() {
    client = null;
    integrationStore.removeCredential("linear");
  },

  async getViewer() {
    const viewer = await client.viewer;
    return { name: viewer.name, email: viewer.email };
  },

  async listIssues(assignedToMe = false) {
    const filter = assignedToMe
      ? { assignee: { isMe: { eq: true } }, state: { type: { neq: "completed" } } }
      : { state: { type: { neq: "completed" } } };

    const issues = await client.issues({ filter, first: 50 });
    return Promise.all(
      issues.nodes.map(async (i) => ({
        id: i.id,
        identifier: i.identifier,
        title: i.title,
        priority: i.priority,
        state: (await i.state)?.name,
        assignee: (await i.assignee)?.name,
        url: i.url,
      }))
    );
  },

  async getIssueAsContext(id) {
    const issue = await client.issue(id);
    const state = await issue.state;
    const assignee = await issue.assignee;
    const comments = await issue.comments();

    let content = `# Linear Issue ${issue.identifier}: ${issue.title}\n\n`;
    content += `**Status:** ${state?.name || "Unknown"}\n`;
    content += `**Priority:** ${["No priority", "Urgent", "High", "Medium", "Low"][issue.priority] || "Unknown"}\n`;
    content += `**Assignee:** ${assignee?.name || "Unassigned"}\n`;
    content += `**URL:** ${issue.url}\n\n`;
    content += `## Description\n${issue.description || "No description."}\n`;

    if (comments.nodes.length > 0) {
      content += `\n## Comments\n`;
      for (const c of comments.nodes.slice(0, 10)) {
        const author = await c.user;
        content += `\n**${author?.name || "Unknown"}:** ${c.body}\n`;
      }
    }

    return content;
  },

  isConnected() {
    return client !== null;
  },
};
