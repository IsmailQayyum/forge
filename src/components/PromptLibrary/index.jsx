import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Play, Search, Pencil, Trash2, X, Tag, Star, Clock } from "lucide-react";
import clsx from "clsx";

const CATEGORY_COLORS = {
  git: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  testing: "bg-green-500/20 text-green-400 border-green-500/30",
  quality: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  refactor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  explore: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  debug: "bg-red-500/20 text-red-400 border-red-500/30",
  docs: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  custom: "bg-forge-accent/20 text-forge-accent border-forge-accent/30",
};

export function PromptLibrary() {
  const [prompts, setPrompts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/prompts").then(r => r.json()).then(setPrompts);
  }, []);

  const categories = ["all", ...new Set(prompts.map(p => p.category))];

  const filtered = prompts.filter(p => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) ||
        p.tags?.some(t => t.includes(q)) || p.prompt.toLowerCase().includes(q);
    }
    return true;
  });

  async function launchPrompt(prompt) {
    // Record usage
    fetch(`/api/prompts/${prompt.id}/use`, { method: "POST" });

    // Spawn a terminal with this prompt
    const res = await fetch("/api/terminal/spawn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args: ["-p", prompt.prompt] }),
    });
    const data = await res.json();
    if (data.terminalId) {
      // Navigate to messenger — we'll use a custom event
      window.dispatchEvent(new CustomEvent("forge:navigate", { detail: { view: "messenger" } }));
    }
  }

  async function savePrompt(data) {
    if (editing) {
      const res = await fetch(`/api/prompts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, category: data.category || "custom" }),
      });
      const created = await res.json();
      setPrompts(prev => [...prev, created]);
    }
    setEditing(null);
    setCreating(false);
  }

  async function deletePrompt(id) {
    await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    setPrompts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
        <BookOpen size={16} className="text-forge-accent" />
        <h1 className="text-sm font-bold">Prompt Library</h1>
        <span className="text-xs text-forge-muted">{prompts.length} prompts</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="bg-forge-surface border border-forge-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-forge-text outline-none focus:border-forge-muted w-48"
            />
          </div>
          <button
            onClick={() => { setCreating(true); setEditing(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-white text-xs font-semibold hover:bg-orange-500 transition-colors"
          >
            <Plus size={12} /> New Prompt
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 py-2 border-b border-forge-border flex items-center gap-1.5 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx(
              "px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors border",
              selectedCategory === cat
                ? "bg-forge-accent text-white border-forge-accent"
                : "bg-forge-surface text-forge-muted border-forge-border hover:border-forge-muted"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(prompt => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onLaunch={() => launchPrompt(prompt)}
              onEdit={() => { setEditing(prompt); setCreating(false); }}
              onDelete={() => deletePrompt(prompt.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-forge-muted gap-2">
            <BookOpen size={24} />
            <p className="text-xs">No prompts found</p>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {(editing || creating) && (
        <PromptEditor
          prompt={editing}
          onSave={savePrompt}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function PromptCard({ prompt, onLaunch, onEdit, onDelete }) {
  const colorClass = CATEGORY_COLORS[prompt.category] || CATEGORY_COLORS.custom;

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl p-4 hover:border-forge-muted transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-bold text-forge-text">{prompt.name}</h3>
            <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-full border capitalize", colorClass)}>
              {prompt.category}
            </span>
          </div>
          <p className="text-[11px] text-forge-muted leading-relaxed">{prompt.description}</p>
        </div>
      </div>

      <div className="bg-forge-bg border border-forge-border rounded-lg p-2.5 mb-3">
        <p className="text-[10px] text-forge-muted font-mono line-clamp-2">{prompt.prompt}</p>
      </div>

      {prompt.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {prompt.tags.map(tag => (
            <span key={tag} className="text-[9px] text-forge-muted bg-forge-border rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-forge-muted">
          {prompt.usedCount > 0 && (
            <span className="flex items-center gap-0.5"><Star size={9} /> {prompt.usedCount}</span>
          )}
          {prompt.lastUsed && (
            <span className="flex items-center gap-0.5"><Clock size={9} /> {new Date(prompt.lastUsed).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!prompt.builtin && (
            <>
              <button onClick={onEdit} className="p-1.5 rounded-md text-forge-muted hover:text-forge-text hover:bg-forge-border transition-colors">
                <Pencil size={11} />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-md text-forge-muted hover:text-forge-red hover:bg-forge-red/10 transition-colors">
                <Trash2 size={11} />
              </button>
            </>
          )}
          <button
            onClick={onLaunch}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-forge-accent text-white text-[10px] font-semibold hover:bg-orange-500 transition-colors"
          >
            <Play size={10} /> Run
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptEditor({ prompt, onSave, onClose }) {
  const [name, setName] = useState(prompt?.name || "");
  const [description, setDescription] = useState(prompt?.description || "");
  const [text, setText] = useState(prompt?.prompt || "");
  const [category, setCategory] = useState(prompt?.category || "custom");
  const [tags, setTags] = useState(prompt?.tags?.join(", ") || "");

  function handleSave() {
    if (!name.trim() || !text.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      prompt: text.trim(),
      category,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-forge-surface border border-forge-border rounded-2xl w-[520px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-forge-border flex items-center justify-between">
          <h2 className="text-sm font-bold">{prompt ? "Edit Prompt" : "New Prompt"}</h2>
          <button onClick={onClose} className="text-forge-muted hover:text-forge-text"><X size={14} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fix PR Comments"
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
          </div>
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description"
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
          </div>
          <div>
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Prompt</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
              placeholder="The prompt that will be sent to Claude Code..."
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted font-mono resize-y" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none">
                <option value="git">Git</option><option value="testing">Testing</option>
                <option value="quality">Quality</option><option value="refactor">Refactor</option>
                <option value="explore">Explore</option><option value="debug">Debug</option>
                <option value="docs">Docs</option><option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Tags (comma separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="pr, fix, review"
                className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-forge-text outline-none focus:border-forge-muted" />
            </div>
          </div>
          <button onClick={handleSave} disabled={!name.trim() || !text.trim()}
            className="w-full py-2 rounded-lg bg-forge-accent text-white text-xs font-semibold hover:bg-orange-500 disabled:opacity-40 transition-colors">
            {prompt ? "Save Changes" : "Create Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
