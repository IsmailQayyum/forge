import React, { useState, useEffect } from "react";
import { useForgeStore } from "../../store/index.js";
import { Plug, Github, CheckCircle, XCircle, Bell, Plus, Trash2, Send, ToggleLeft, ToggleRight } from "lucide-react";
import clsx from "clsx";

export function Integrations() {
  const integrations = useForgeStore((s) => s.integrations);
  const setIntegration = useForgeStore((s) => s.setIntegration);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-2">
        <Plug size={14} className="text-forge-accent" />
        <span className="text-sm font-bold">Integrations</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 max-w-2xl">
        <GitHubCard state={integrations.github} onUpdate={(d) => setIntegration("github", d)} />
        <LinearCard state={integrations.linear} onUpdate={(d) => setIntegration("linear", d)} />

        <div className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-forge-accent" />
            <span className="text-sm font-bold">Notification Webhooks</span>
          </div>
          <p className="text-xs text-forge-muted mb-4">
            Get notified on Slack, Discord, or any webhook when sessions end, need input, or require permissions.
          </p>
          <WebhookManager />
        </div>
      </div>
    </div>
  );
}

function WebhookManager() {
  const [webhooks, setWebhooks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("slack");
  const [newEvents, setNewEvents] = useState(["all"]);
  const [newName, setNewName] = useState("");
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(setWebhooks);
  }, []);

  async function addWebhook() {
    if (!newUrl) return;
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName || newType, url: newUrl, type: newType, events: newEvents }),
    });
    const wh = await res.json();
    setWebhooks(prev => [...prev, wh]);
    setAdding(false);
    setNewUrl("");
    setNewName("");
  }

  async function deleteWebhook(id) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setWebhooks(prev => prev.filter(w => w.id !== id));
  }

  async function toggleWebhook(id, enabled) {
    await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled } : w));
  }

  async function testWebhook(id) {
    setTesting(id);
    await fetch(`/api/notifications/${id}/test`, { method: "POST" });
    setTimeout(() => setTesting(null), 2000);
  }

  const EVENT_OPTIONS = [
    { id: "all", label: "All events" },
    { id: "session_end", label: "Session ended" },
    { id: "session_error", label: "Session error" },
    { id: "permission_needed", label: "Permission needed" },
    { id: "input_needed", label: "Input needed" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {webhooks.map(wh => (
        <div key={wh.id} className="bg-forge-surface border border-forge-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
              wh.type === "slack" ? "bg-forge-yellow/20 text-forge-yellow" :
              wh.type === "discord" ? "bg-purple-500/20 text-purple-400" :
              "bg-forge-border text-forge-muted"
            )}>
              {wh.type === "slack" ? "#" : wh.type === "discord" ? "D" : "W"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-forge-text">{wh.name || wh.type}</p>
              <p className="text-[10px] text-forge-muted font-mono truncate">{wh.url.slice(0, 50)}...</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => testWebhook(wh.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-forge-border text-forge-muted hover:text-forge-text transition-colors"
              >
                <Send size={9} />
                {testing === wh.id ? "Sent!" : "Test"}
              </button>
              <button
                onClick={() => toggleWebhook(wh.id, !wh.enabled)}
                className={clsx("p-1 rounded-md transition-colors", wh.enabled ? "text-forge-green" : "text-forge-muted")}
              >
                {wh.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button
                onClick={() => deleteWebhook(wh.id)}
                className="p-1 rounded-md text-forge-muted hover:text-forge-red transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(wh.events || ["all"]).map(e => (
              <span key={e} className="text-[9px] bg-forge-border text-forge-muted rounded px-1.5 py-0.5">{e}</span>
            ))}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="bg-forge-surface border border-forge-accent/50 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name (optional)"
              className="flex-1 bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
            <select value={newType} onChange={e => setNewType(e.target.value)}
              className="bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none">
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="generic">Generic</option>
            </select>
          </div>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder={newType === "slack" ? "https://hooks.slack.com/services/..." : newType === "discord" ? "https://discord.com/api/webhooks/..." : "https://your-webhook.com/..."}
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text font-mono outline-none focus:border-forge-muted" />
          <div>
            <p className="text-[10px] text-forge-muted mb-1.5">Notify on:</p>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_OPTIONS.map(opt => (
                <button key={opt.id}
                  onClick={() => setNewEvents(prev => prev.includes(opt.id) ? prev.filter(e => e !== opt.id) : [...prev, opt.id])}
                  className={clsx("text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                    newEvents.includes(opt.id) ? "bg-forge-accent/20 text-forge-accent border-forge-accent/30" : "bg-forge-surface text-forge-muted border-forge-border"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addWebhook} disabled={!newUrl}
              className="flex-1 py-2 rounded-lg bg-forge-accent text-white text-xs font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors">
              Add Webhook
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg bg-forge-border text-xs text-forge-muted hover:text-forge-text transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-forge-border text-xs text-forge-muted hover:border-forge-muted hover:text-forge-text transition-colors">
          <Plus size={12} /> Add Webhook
        </button>
      )}
    </div>
  );
}

function IntegrationCard({ icon, name, description, connected, children }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-forge-border rounded-lg flex items-center justify-center">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-forge-muted">{description}</p>
        </div>
        {connected ? (
          <div className="flex items-center gap-1 text-forge-green"><CheckCircle size={14} /><span className="text-xs">Connected</span></div>
        ) : (
          <div className="flex items-center gap-1 text-forge-muted"><XCircle size={14} /><span className="text-xs">Not connected</span></div>
        )}
      </div>
      {children}
    </div>
  );
}

function GitHubCard({ state, onUpdate }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function connect() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/integrations/github/connect", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) { onUpdate({ connected: true, token, user: data.user }); setToken(""); } else { setError(data.error); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <IntegrationCard icon={<Github size={18} className="text-forge-text" />} name="GitHub" description="Browse issues, PRs, inject as context" connected={state.connected}>
      {state.connected ? (
        <p className="text-xs text-forge-muted">Signed in as <span className="text-forge-text">{state.user}</span></p>
      ) : (
        <div className="flex flex-col gap-2">
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="GitHub personal access token"
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
          {error && <p className="text-xs text-forge-red">{error}</p>}
          <button onClick={connect} disabled={!token || loading}
            className="px-4 py-2 bg-forge-accent rounded-lg text-xs text-white font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors">
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}
    </IntegrationCard>
  );
}

function LinearCard({ state, onUpdate }) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function connect() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/integrations/linear/connect", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.ok) { onUpdate({ connected: true, apiKey, user: data.user }); setApiKey(""); } else { setError(data.error); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <IntegrationCard icon={<span className="text-purple-400 font-bold text-sm">L</span>} name="Linear" description="Fetch tickets, inject as context" connected={state.connected}>
      {state.connected ? (
        <p className="text-xs text-forge-muted">Signed in as <span className="text-forge-text">{state.user}</span></p>
      ) : (
        <div className="flex flex-col gap-2">
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Linear API key"
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
          {error && <p className="text-xs text-forge-red">{error}</p>}
          <button onClick={connect} disabled={!apiKey || loading}
            className="px-4 py-2 bg-forge-accent rounded-lg text-xs text-white font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors">
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}
    </IntegrationCard>
  );
}
