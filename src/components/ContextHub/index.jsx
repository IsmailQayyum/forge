import React, { useCallback, useState } from "react";
import { useForgeStore } from "../../store/index.js";
import { Paperclip, Upload, X, Send, FileText, Github, Ticket } from "lucide-react";
import clsx from "clsx";

export function ContextHub() {
  const contextItems = useForgeStore((s) => s.contextItems);
  const addContextItem = useForgeStore((s) => s.addContextItem);
  const removeContextItem = useForgeStore((s) => s.removeContextItem);
  const sessions = useForgeStore((s) => Object.values(s.sessions));
  const [tab, setTab] = useState("files");
  const [dragging, setDragging] = useState(false);
  const [targetSession, setTargetSession] = useState(sessions[0]?.id || "");

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await parseAndAdd(file);
    }
  }, []);

  async function onFileInput(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await parseAndAdd(file);
    }
  }

  async function parseAndAdd(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const res = await fetch("/api/context/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: file.type, data: base64 }),
        });
        const { content } = await res.json();
        addContextItem({ id: `ctx-${Date.now()}`, name: file.name, content, type: "file" });
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  function injectAll() {
    if (!targetSession || contextItems.length === 0) return;
    const combined = contextItems.map((c) => `## ${c.name}\n\n${c.content}`).join("\n\n---\n\n");
    fetch(`/api/sessions/${targetSession}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: combined }),
    });
  }

  return (
    <div className="flex h-full">
      {/* Left: upload + items */}
      <div className="flex-1 flex flex-col border-r border-forge-border">
        <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
          <Paperclip size={14} className="text-forge-accent" />
          <span className="text-sm font-semibold">Context Hub</span>

          {/* Tabs */}
          <div className="ml-4 flex gap-1">
            {["files", "github", "linear"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "px-3 py-1 rounded-md text-xs capitalize transition-colors",
                  tab === t ? "bg-forge-accent text-white" : "text-forge-muted hover:text-forge-text"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "files" && (
            <>
              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors mb-4 cursor-pointer",
                  dragging ? "border-forge-accent bg-forge-accent-dim" : "border-forge-border hover:border-forge-muted"
                )}
                onClick={() => document.getElementById("file-input").click()}
              >
                <Upload size={24} className={dragging ? "text-forge-accent" : "text-forge-muted"} />
                <p className="text-xs text-forge-muted text-center">
                  Drop files here or click to upload<br />
                  <span className="text-[10px]">Excel, CSV, PDF, text, code files</span>
                </p>
                <input id="file-input" type="file" multiple className="hidden" onChange={onFileInput} />
              </div>

              {/* Context items */}
              <div className="flex flex-col gap-2">
                {contextItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-forge-surface border border-forge-border rounded-lg p-3">
                    <FileText size={14} className="text-forge-blue shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-[10px] text-forge-muted">{item.content?.length} chars</p>
                    </div>
                    <button onClick={() => removeContextItem(item.id)} className="text-forge-muted hover:text-forge-red transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "github" && <GitHubTab onAdd={addContextItem} />}
          {tab === "linear" && <LinearTab onAdd={addContextItem} />}
        </div>
      </div>

      {/* Right: inject panel */}
      <div className="w-64 flex flex-col p-4 gap-4">
        <div>
          <p className="text-[10px] text-forge-muted uppercase tracking-wider mb-2">Inject into session</p>
          <select
            value={targetSession}
            onChange={(e) => setTargetSession(e.target.value)}
            className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.project || s.id?.slice(0, 8)}</option>
            ))}
          </select>
        </div>

        <div className="bg-forge-surface border border-forge-border rounded-lg p-3">
          <p className="text-xs font-semibold mb-1">Ready to inject</p>
          <p className="text-[10px] text-forge-muted">{contextItems.length} item(s)</p>
          <p className="text-[10px] text-forge-muted">
            {contextItems.reduce((acc, c) => acc + (c.content?.length || 0), 0)} total chars
          </p>
        </div>

        <button
          onClick={injectAll}
          disabled={contextItems.length === 0 || !targetSession}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-forge-accent text-white text-xs font-semibold disabled:opacity-40 hover:bg-orange-500 transition-colors"
        >
          <Send size={13} />
          Inject Context
        </button>
      </div>
    </div>
  );
}

function GitHubTab({ onAdd }) {
  const [repos, setRepos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const integrations = useForgeStore((s) => s.integrations);

  async function loadRepos() {
    const res = await fetch("/api/integrations/github/repos");
    setRepos(await res.json());
  }

  async function loadIssues(owner, name) {
    setSelectedRepo({ owner, name });
    const res = await fetch(`/api/integrations/github/repos/${owner}/${name}/issues`);
    setIssues(await res.json());
  }

  async function addIssue(issue) {
    const res = await fetch(`/api/integrations/github/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}/content`);
    const { content } = await res.json();
    onAdd({ id: `gh-${issue.number}`, name: `#${issue.number}: ${issue.title}`, content, type: "github" });
  }

  if (!integrations.github.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-forge-muted">
        <Github size={20} />
        <p className="text-xs">Connect GitHub in Integrations</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {repos.length === 0 ? (
        <button onClick={loadRepos} className="text-xs text-forge-accent hover:underline">Load repositories</button>
      ) : (
        <select
          onChange={(e) => { const [o, n] = e.target.value.split("/"); loadIssues(o, n); }}
          className="bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none"
        >
          <option value="">Select repo...</option>
          {repos.map((r) => <option key={r.id} value={r.fullName}>{r.fullName}</option>)}
        </select>
      )}
      {issues.map((issue) => (
        <div key={issue.number} className="flex items-center gap-2 bg-forge-surface border border-forge-border rounded-lg p-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">#{issue.number} {issue.title}</p>
            <p className="text-[10px] text-forge-muted">{issue.labels.join(", ")}</p>
          </div>
          <button onClick={() => addIssue(issue)} className="text-[10px] bg-forge-border px-2 py-1 rounded hover:bg-forge-accent hover:text-white transition-colors">
            Add
          </button>
        </div>
      ))}
    </div>
  );
}

function LinearTab({ onAdd }) {
  const [issues, setIssues] = useState([]);
  const integrations = useForgeStore((s) => s.integrations);

  async function loadIssues() {
    const res = await fetch("/api/integrations/linear/issues?assignedToMe=true");
    setIssues(await res.json());
  }

  async function addIssue(issue) {
    const res = await fetch(`/api/integrations/linear/issues/${issue.id}/content`);
    const { content } = await res.json();
    onAdd({ id: `lin-${issue.id}`, name: `${issue.identifier}: ${issue.title}`, content, type: "linear" });
  }

  if (!integrations.linear.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-forge-muted">
        <Ticket size={20} />
        <p className="text-xs">Connect Linear in Integrations</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {issues.length === 0 ? (
        <button onClick={loadIssues} className="text-xs text-forge-accent hover:underline">Load my issues</button>
      ) : (
        issues.map((issue) => (
          <div key={issue.id} className="flex items-center gap-2 bg-forge-surface border border-forge-border rounded-lg p-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{issue.identifier} {issue.title}</p>
              <p className="text-[10px] text-forge-muted">{issue.state}</p>
            </div>
            <button onClick={() => addIssue(issue)} className="text-[10px] bg-forge-border px-2 py-1 rounded hover:bg-forge-accent hover:text-white transition-colors">
              Add
            </button>
          </div>
        ))
      )}
    </div>
  );
}
