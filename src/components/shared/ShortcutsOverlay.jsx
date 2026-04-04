import React, { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Command Palette" },
  { keys: ["Ctrl", "1"], description: "Home" },
  { keys: ["Ctrl", "2"], description: "Sessions" },
  { keys: ["Ctrl", "3"], description: "Terminal" },
  { keys: ["Ctrl", "4"], description: "Workflows" },
  { keys: ["Ctrl", "5"], description: "Costs" },
  { keys: ["Ctrl", "N"], description: "New Terminal" },
  { keys: ["?"], description: "Toggle this help" },
];

function Kbd({ children }) {
  return (
    <kbd className="bg-forge-bg border border-forge-border rounded px-2 py-0.5 text-xs font-mono text-forge-text">
      {children}
    </kbd>
  );
}

export function ShortcutsOverlay({ onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-forge-surface border border-forge-border rounded-xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-forge-text">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-forge-muted hover:text-forge-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-forge-muted">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && (
                      <span className="text-forge-muted text-xs">+</span>
                    )}
                    <Kbd>{key}</Kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-6 pt-4 border-t border-forge-border text-center">
          <span className="text-xs text-forge-muted">
            Press <Kbd>Esc</Kbd> or <Kbd>?</Kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
