import { useEffect, useState, useCallback } from "react";

const VIEW_MAP = {
  "1": "sessions",
  "2": "messenger",
  "3": "architect",
  "4": "prompts",
  "5": "costs",
};

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const editable = isEditableTarget(e.target);

      // Ctrl+1 through Ctrl+5 — switch views
      if (ctrl && VIEW_MAP[e.key]) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("navigate-to", { detail: VIEW_MAP[e.key] }),
        );
        return;
      }

      // Ctrl+N — new terminal (navigate to messenger)
      if (ctrl && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("navigate-to", { detail: "messenger" }),
        );
        return;
      }

      // Ctrl+K — focus search input on current page
      if (ctrl && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        const search =
          document.querySelector('input[type="search"]') ||
          document.querySelector('input[data-search]') ||
          document.querySelector('input[placeholder*="earch"]');
        if (search) {
          search.focus();
          search.select();
        }
        return;
      }

      // ? — toggle shortcuts help overlay (only outside editable fields)
      if (e.key === "?" && !editable) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
