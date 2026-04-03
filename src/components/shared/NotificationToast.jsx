import React, { useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { useForgeStore } from "../../store/index.js";

export function NotificationToast() {
  const notifications = useForgeStore((s) => s.notifications);
  const dismiss = useForgeStore((s) => s.dismissNotification);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    const timer = setTimeout(() => dismiss(latest.id), 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  if (notifications.length === 0) return null;
  const notif = notifications[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 slide-in">
      <div className="bg-forge-surface border border-forge-border rounded-xl shadow-2xl p-4 w-80">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-forge-accent-dim flex items-center justify-center shrink-0">
            <MessageSquare size={14} className="text-forge-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-forge-text truncate">{notif.message}</p>
            {notif.body && (
              <p className="text-xs text-forge-muted mt-0.5 line-clamp-2">{notif.body}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(notif.id)}
            className="text-forge-muted hover:text-forge-text shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
