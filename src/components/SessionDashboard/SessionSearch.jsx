import React, { useState, useCallback } from "react";
import { Search, X, Download, FileText } from "lucide-react";
import clsx from "clsx";

export function SessionSearch({ onSelectSession }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const debounceRef = React.useRef(null);

  function handleSearch(q) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/sessions/search?q=${encodeURIComponent(q)}`);
        setResults(await res.json());
      } catch {}
      setSearching(false);
    }, 300);
  }

  async function exportSession(e, sessionId) {
    e.stopPropagation();
    setExportingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/export`);
      const { markdown, name } = await res.json();
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${name || sessionId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExportingId(null);
  }

  return (
    <div className="px-4 py-2 border-b border-forge-border">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-muted" />
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search sessions, messages, tool calls..."
          className="w-full bg-forge-surface border border-forge-border rounded-lg pl-8 pr-8 py-1.5 text-[11px] text-forge-text outline-none focus:border-forge-muted"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-forge-muted hover:text-forge-text">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-1">
          {results.map(s => (
            <button
              key={s.id}
              onClick={() => { onSelectSession(s.id); setQuery(""); setResults([]); }}
              className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-forge-surface border border-forge-border hover:border-forge-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-forge-text truncate">
                  {s.displayName || s.project || s.id?.slice(0, 8)}
                </p>
                {s.project && s.displayName && s.displayName !== s.project && (
                  <p className="text-[10px] text-forge-accent truncate">{s.project}</p>
                )}
                <p className="text-[10px] text-forge-muted">
                  {s.messages?.length || 0} messages · {s.toolCalls?.length || 0} tools · {s.status}
                </p>
              </div>
              <button
                onClick={(e) => exportSession(e, s.id)}
                className="p-1 rounded text-forge-muted hover:text-forge-accent transition-colors"
                title="Export as markdown"
              >
                <Download size={11} />
              </button>
            </button>
          ))}
        </div>
      )}

      {searching && <p className="text-[10px] text-forge-muted mt-1">Searching...</p>}
    </div>
  );
}
