import React, { useState, useEffect } from "react";
import { GitBranch, FileText, Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";

/**
 * Shows git diff for the session's working directory.
 * Displays changed files and inline diffs with syntax coloring.
 */
export function DiffViewer({ cwd }) {
  const [gitInfo, setGitInfo] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [expandedFile, setExpandedFile] = useState(null);
  const [fileDiffs, setFileDiffs] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cwd) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/git/info?cwd=${encodeURIComponent(cwd)}`).then(r => r.json()),
      fetch(`/api/git/diff?cwd=${encodeURIComponent(cwd)}`).then(r => r.json()),
    ]).then(([info, diff]) => {
      setGitInfo(info);
      setDiffData(diff);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [cwd]);

  async function loadFileDiff(file) {
    if (fileDiffs[file]) {
      setExpandedFile(expandedFile === file ? null : file);
      return;
    }
    const res = await fetch(`/api/git/diff/file?cwd=${encodeURIComponent(cwd)}&file=${encodeURIComponent(file)}`);
    const data = await res.json();
    setFileDiffs(prev => ({ ...prev, [file]: data.diff || "No changes" }));
    setExpandedFile(file);
  }

  if (!cwd) return null;
  if (loading) return <div className="px-4 py-3 text-xs text-forge-muted">Loading git info...</div>;
  if (!gitInfo?.isRepo) return null;

  const STATUS_COLORS = {
    M: "text-forge-yellow",
    A: "text-forge-green",
    D: "text-forge-red",
    "?": "text-forge-muted",
    "??": "text-forge-muted",
  };

  const STATUS_LABELS = {
    M: "Modified",
    A: "Added",
    D: "Deleted",
    "?": "Untracked",
    "??": "Untracked",
  };

  return (
    <div className="border-t border-forge-border">
      {/* Git header */}
      <div className="px-4 py-2 flex items-center gap-2 bg-forge-surface/30">
        <GitBranch size={12} className="text-forge-accent" />
        <span className="text-[11px] font-semibold text-forge-text">{gitInfo.branch}</span>
        {gitInfo.ahead > 0 && (
          <span className="text-[9px] bg-forge-green/20 text-forge-green rounded px-1.5 py-0.5">
            {gitInfo.ahead} ahead
          </span>
        )}
        {gitInfo.behind > 0 && (
          <span className="text-[9px] bg-forge-red/20 text-forge-red rounded px-1.5 py-0.5">
            {gitInfo.behind} behind
          </span>
        )}
        {gitInfo.dirty && (
          <span className="text-[9px] bg-forge-yellow/20 text-forge-yellow rounded px-1.5 py-0.5">
            {gitInfo.changedFiles.length} changed
          </span>
        )}
      </div>

      {/* Changed files */}
      {gitInfo.changedFiles?.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex flex-col gap-0.5">
            {gitInfo.changedFiles.map(({ status, file }) => (
              <div key={file}>
                <button
                  onClick={() => loadFileDiff(file)}
                  className="w-full flex items-center gap-2 py-1 px-2 rounded hover:bg-forge-surface/50 text-left transition-colors"
                >
                  {expandedFile === file ? <ChevronDown size={10} className="text-forge-muted shrink-0" /> : <ChevronRight size={10} className="text-forge-muted shrink-0" />}
                  <span className={clsx("text-[10px] font-bold w-4 shrink-0", STATUS_COLORS[status] || "text-forge-muted")}>
                    {status}
                  </span>
                  <FileText size={10} className="text-forge-muted shrink-0" />
                  <span className="text-[11px] text-forge-text font-mono truncate">{file}</span>
                </button>

                {expandedFile === file && fileDiffs[file] && (
                  <div className="ml-6 mt-1 mb-2 bg-forge-bg border border-forge-border rounded-lg overflow-x-auto">
                    <pre className="text-[10px] font-mono p-3 leading-relaxed">
                      {fileDiffs[file].split("\n").map((line, i) => {
                        let color = "text-forge-muted";
                        if (line.startsWith("+") && !line.startsWith("+++")) color = "text-forge-green";
                        else if (line.startsWith("-") && !line.startsWith("---")) color = "text-forge-red";
                        else if (line.startsWith("@@")) color = "text-forge-blue";
                        return (
                          <div key={i} className={clsx(color, line.startsWith("+") && !line.startsWith("+++") && "bg-forge-green/5", line.startsWith("-") && !line.startsWith("---") && "bg-forge-red/5")}>
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
