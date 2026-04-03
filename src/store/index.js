import { create } from "zustand";

export const useForgeStore = create((set, get) => ({
  // Sessions
  sessions: {},
  addSession: (session) =>
    set((s) => ({ sessions: { ...s.sessions, [session.id]: session } })),
  updateSession: (sessionId, updates) =>
    set((s) => ({
      sessions: {
        ...s.sessions,
        [sessionId]: { ...s.sessions[sessionId], ...updates },
      },
    })),
  addToolCall: (sessionId, toolCall) =>
    set((s) => {
      const session = s.sessions[sessionId];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...session,
            toolCalls: [...(session.toolCalls || []), toolCall],
          },
        },
      };
    }),

  // Messenger
  pendingInputs: [],
  addPendingInput: (item) =>
    set((s) => ({ pendingInputs: [...s.pendingInputs, item] })),
  removePendingInput: (sessionId) =>
    set((s) => ({
      pendingInputs: s.pendingInputs.filter((p) => p.sessionId !== sessionId),
    })),

  // Notifications
  notifications: [],
  addNotification: (notif) =>
    set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 20) })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  // Context items
  contextItems: [],
  addContextItem: (item) =>
    set((s) => ({ contextItems: [...s.contextItems, item] })),
  removeContextItem: (id) =>
    set((s) => ({ contextItems: s.contextItems.filter((c) => c.id !== id) })),

  // Agent architectures
  architectures: [],
  activeArchId: null,
  setArchitectures: (archs) => set({ architectures: archs }),
  setActiveArch: (id) => set({ activeArchId: id }),
  saveArchitecture: (arch) =>
    set((s) => {
      const existing = s.architectures.findIndex((a) => a.id === arch.id);
      if (existing >= 0) {
        const updated = [...s.architectures];
        updated[existing] = arch;
        return { architectures: updated };
      }
      return { architectures: [...s.architectures, arch] };
    }),

  // Integrations config
  integrations: {
    github: { connected: false, token: null, user: null },
    linear: { connected: false, apiKey: null, user: null },
    slack: { connected: false, webhookUrl: null },
  },
  setIntegration: (name, data) =>
    set((s) => ({
      integrations: {
        ...s.integrations,
        [name]: { ...s.integrations[name], ...data },
      },
    })),

  // Active session selection
  selectedSessionId: null,
  selectSession: (id) => set({ selectedSessionId: id }),
}));
