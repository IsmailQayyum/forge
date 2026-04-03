import React, { useState } from "react";
import { useForgeStore } from "../../store/index.js";
import { Plug, Github, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";

export function Integrations() {
  const integrations = useForgeStore((s) => s.integrations);
  const setIntegration = useForgeStore((s) => s.setIntegration);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
        <Plug size={14} className="text-forge-accent" />
        <span className="text-sm font-semibold">Integrations</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 max-w-xl">
        <GitHubCard
          state={integrations.github}
          onUpdate={(d) => setIntegration("github", d)}
        />
        <LinearCard
          state={integrations.linear}
          onUpdate={(d) => setIntegration("linear", d)}
        />
        <SlackCard
          state={integrations.slack}
          onUpdate={(d) => setIntegration("slack", d)}
        />
      </div>
    </div>
  );
}

function IntegrationCard({ icon, name, description, connected, children }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-forge-border rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-forge-muted">{description}</p>
        </div>
        {connected ? (
          <div className="flex items-center gap-1 text-forge-green">
            <CheckCircle size={14} />
            <span className="text-xs">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-forge-muted">
            <XCircle size={14} />
            <span className="text-xs">Not connected</span>
          </div>
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate({ connected: true, token, user: data.user });
        setToken("");
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <IntegrationCard
      icon={<Github size={18} className="text-forge-text" />}
      name="GitHub"
      description="Browse issues, PRs, inject as context"
      connected={state.connected}
    >
      {state.connected ? (
        <p className="text-xs text-forge-muted">Signed in as <span className="text-forge-text">{state.user}</span></p>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="GitHub personal access token"
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
          />
          {error && <p className="text-xs text-forge-red">{error}</p>}
          <button
            onClick={connect}
            disabled={!token || loading}
            className="px-4 py-2 bg-forge-accent rounded-lg text-xs text-white font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors"
          >
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/linear/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate({ connected: true, apiKey, user: data.user });
        setApiKey("");
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <IntegrationCard
      icon={<span className="text-purple-400 font-bold text-sm">L</span>}
      name="Linear"
      description="Fetch tickets, inject as context"
      connected={state.connected}
    >
      {state.connected ? (
        <p className="text-xs text-forge-muted">Signed in as <span className="text-forge-text">{state.user}</span></p>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Linear API key"
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
          />
          {error && <p className="text-xs text-forge-red">{error}</p>}
          <button
            onClick={connect}
            disabled={!apiKey || loading}
            className="px-4 py-2 bg-forge-accent rounded-lg text-xs text-white font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}
    </IntegrationCard>
  );
}

function SlackCard({ state, onUpdate }) {
  const [webhookUrl, setWebhookUrl] = useState("");

  function save() {
    onUpdate({ connected: true, webhookUrl });
    setWebhookUrl("");
  }

  return (
    <IntegrationCard
      icon={<span className="text-forge-yellow font-bold text-sm">#</span>}
      name="Slack"
      description="Get notified when agents need your input"
      connected={state.connected}
    >
      {state.connected ? (
        <p className="text-xs text-forge-muted">Webhook configured</p>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="Slack incoming webhook URL"
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted"
          />
          <button
            onClick={save}
            disabled={!webhookUrl}
            className="px-4 py-2 bg-forge-accent rounded-lg text-xs text-white font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </IntegrationCard>
  );
}
