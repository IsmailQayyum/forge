import React, { useState, useEffect } from "react";
import { FileText, Save, FolderOpen, Plus, RefreshCw, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

export function ClaudeMdEditor() {
  const [cwd, setCwd] = useState("");
  const [content, setContent] = useState("");
  const [exists, setExists] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [saved, setSaved] = useState(false);
  const [locations, setLocations] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Load list of known CLAUDE.md files
    fetch("/api/claudemd/list").then(r => r.json()).then(setLocations);
  }, []);

  async function loadFile(dir) {
    const res = await fetch(`/api/claudemd?cwd=${encodeURIComponent(dir)}`);
    const data = await res.json();
    setCwd(dir);
    setContent(data.content || "");
    setExists(data.exists);
    setFilePath(data.path);
    setDirty(false);
    setSaved(false);
  }

  async function saveFile() {
    if (!cwd) return;
    await fetch("/api/claudemd", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd, content }),
    });
    setSaved(true);
    setDirty(false);
    setExists(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleChange(e) {
    setContent(e.target.value);
    setDirty(true);
    setSaved(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-forge-border flex items-center gap-3">
        <FileText size={16} className="text-forge-accent" />
        <h1 className="text-sm font-bold">CLAUDE.md Editor</h1>
        {filePath && (
          <span className="text-[10px] text-forge-muted font-mono">{filePath}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-[10px] text-forge-yellow">Unsaved changes</span>}
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-forge-green">
              <CheckCircle2 size={10} /> Saved
            </span>
          )}
          <button
            onClick={saveFile}
            disabled={!cwd || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-white text-xs font-semibold hover:bg-orange-500 disabled:opacity-40 transition-colors"
          >
            <Save size={12} /> Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — file picker */}
        <div className="w-64 border-r border-forge-border flex flex-col">
          <div className="p-3 border-b border-forge-border">
            <label className="text-[10px] text-forge-muted uppercase tracking-wider mb-1.5 block">Open project</label>
            <div className="flex gap-1.5">
              <input
                value={cwd}
                onChange={e => setCwd(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1 bg-forge-surface border border-forge-border rounded-md px-2 py-1.5 text-[11px] text-forge-text font-mono outline-none focus:border-forge-muted"
              />
              <button
                onClick={() => loadFile(cwd)}
                disabled={!cwd}
                className="p-1.5 rounded-md bg-forge-accent text-white hover:bg-orange-500 disabled:opacity-40 transition-colors"
              >
                <FolderOpen size={12} />
              </button>
            </div>
          </div>

          {/* Known locations */}
          <div className="flex-1 overflow-y-auto p-2">
            <p className="px-2 text-[10px] text-forge-muted uppercase tracking-wider mb-2">Found files</p>
            {locations.length === 0 ? (
              <p className="px-2 text-[10px] text-forge-muted">No CLAUDE.md files found. Enter a project path above.</p>
            ) : (
              locations.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => loadFile(loc.path.replace("/CLAUDE.md", ""))}
                  className={clsx(
                    "w-full text-left rounded-lg p-2.5 mb-1 border transition-colors",
                    filePath === loc.path
                      ? "bg-forge-accent-dim border-forge-accent"
                      : "bg-forge-surface border-forge-border hover:border-forge-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={11} className="text-forge-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-forge-text capitalize">{loc.scope}</p>
                      <p className="text-[10px] text-forge-muted font-mono truncate">{loc.path}</p>
                    </div>
                  </div>
                  {loc.content && (
                    <p className="text-[10px] text-forge-muted mt-1 line-clamp-2">{loc.content}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Tips */}
          <div className="p-3 border-t border-forge-border">
            <p className="text-[10px] text-forge-muted leading-relaxed">
              CLAUDE.md files tell Claude Code how to behave in your project — coding conventions, restrictions, and instructions.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {cwd ? (
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="# Your CLAUDE.md instructions here..."
              spellCheck={false}
              className="flex-1 bg-forge-bg text-forge-text text-xs font-mono p-6 outline-none resize-none leading-relaxed"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-forge-muted">
              <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center">
                <FileText size={28} className="text-forge-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-forge-text mb-1">CLAUDE.md Editor</p>
                <p className="text-xs max-w-xs">
                  Enter a project path or select a file from the sidebar to start editing your Claude Code instructions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
