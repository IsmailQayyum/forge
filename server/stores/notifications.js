import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

const STORE_PATH = path.join(os.homedir(), ".claude", "forge", "notifications.json");

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {}
  return { webhooks: [], rules: [] };
}

function save(data) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

/**
 * Send a webhook POST request.
 */
function sendWebhook(url, payload) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(payload);
      const parsed = new URL(url);
      const mod = parsed.protocol === "https:" ? https : http;

      const req = mod.request(parsed, { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
        resolve({ status: res.statusCode });
      });
      req.on("error", () => resolve({ status: 0, error: "Request failed" }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, error: "Timeout" }); });
      req.write(body);
      req.end();
    } catch (err) {
      resolve({ status: 0, error: err.message });
    }
  });
}

/**
 * Format a Slack webhook message.
 */
function formatSlack(event) {
  const emoji = {
    session_end: ":checkered_flag:",
    session_error: ":x:",
    permission_needed: ":shield:",
    input_needed: ":speech_balloon:",
  };
  return {
    text: `${emoji[event.type] || ":bell:"} *Forge* — ${event.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji[event.type] || ":bell:"} *${event.title}*\n${event.message}`,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Project: *${event.project || "unknown"}* | ${new Date().toLocaleTimeString()}` }],
      },
    ],
  };
}

/**
 * Format a Discord webhook message.
 */
function formatDiscord(event) {
  const colors = {
    session_end: 0x22c55e,
    session_error: 0xef4444,
    permission_needed: 0xeab308,
    input_needed: 0xf97316,
  };
  return {
    embeds: [{
      title: event.title,
      description: event.message,
      color: colors[event.type] || 0x6b7280,
      footer: { text: `Forge — ${event.project || "unknown"}` },
      timestamp: new Date().toISOString(),
    }],
  };
}

export const notificationStore = {
  getWebhooks() {
    return load().webhooks;
  },

  addWebhook(webhook) {
    const data = load();
    const entry = {
      id: `wh-${Date.now()}`,
      ...webhook,
      createdAt: Date.now(),
      enabled: true,
    };
    data.webhooks.push(entry);
    save(data);
    return entry;
  },

  updateWebhook(id, updates) {
    const data = load();
    const idx = data.webhooks.findIndex(w => w.id === id);
    if (idx === -1) return null;
    data.webhooks[idx] = { ...data.webhooks[idx], ...updates };
    save(data);
    return data.webhooks[idx];
  },

  deleteWebhook(id) {
    const data = load();
    data.webhooks = data.webhooks.filter(w => w.id !== id);
    save(data);
  },

  /**
   * Fire notifications for an event.
   */
  async notify(event) {
    const data = load();
    const results = [];

    for (const webhook of data.webhooks) {
      if (!webhook.enabled) continue;

      // Check if this webhook cares about this event type
      if (webhook.events && !webhook.events.includes(event.type) && !webhook.events.includes("all")) {
        continue;
      }

      let payload;
      if (webhook.type === "slack") {
        payload = formatSlack(event);
      } else if (webhook.type === "discord") {
        payload = formatDiscord(event);
      } else {
        // Generic JSON
        payload = { event: event.type, ...event };
      }

      const result = await sendWebhook(webhook.url, payload);
      results.push({ webhookId: webhook.id, ...result });
    }

    return results;
  },

  /**
   * Test a webhook by sending a test message.
   */
  async test(webhookId) {
    const data = load();
    const webhook = data.webhooks.find(w => w.id === webhookId);
    if (!webhook) return { error: "Webhook not found" };

    return notificationStore.notify({
      type: "test",
      title: "Forge Test Notification",
      message: "If you see this, your webhook is working!",
      project: "forge",
    });
  },
};
