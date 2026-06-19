import { create } from "zustand";
import type { Workspace, WorkspaceFile, ChatSession, Message } from "@/types";

interface AppState {
  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  addWorkspace: (ws: Workspace) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;

  // Files
  files: Record<string, WorkspaceFile[]>; // keyed by workspaceId
  setFiles: (workspaceId: string, files: WorkspaceFile[]) => void;
  addFile: (workspaceId: string, file: WorkspaceFile) => void;
  removeFile: (workspaceId: string, fileId: string) => void;

  // Active editor file
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  activeFileContent: string;
  setActiveFileContent: (content: string) => void;

  // Chat
  sessions: Record<string, ChatSession[]>; // keyed by workspaceId
  activeSessionId: string | null;
  messages: Record<string, Message[]>; // keyed by sessionId
  isStreaming: boolean;
  setSessions: (workspaceId: string, sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  addMessage: (sessionId: string, message: Message) => void;
  appendToLastAssistant: (sessionId: string, content: string) => void;
  setIsStreaming: (val: boolean) => void;

  // UI
  sidebarOpen: boolean;
  fileTreeOpen: boolean;
  chatOpen: boolean;
  toggleSidebar: () => void;
  toggleFileTree: () => void;
  toggleChat: () => void;
  setSidebarOpen: (val: boolean) => void;
  setFileTreeOpen: (val: boolean) => void;
  setChatOpen: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Workspaces
  workspaces: [],
  activeWorkspaceId: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, activeFileId: null, activeSessionId: null }),
  addWorkspace: (ws) => set((s) => ({ workspaces: [...s.workspaces, ws] })),
  removeWorkspace: (id) =>
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
    })),
  updateWorkspace: (id, data) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w)),
    })),

  // Files
  files: {},
  setFiles: (workspaceId, files) => set((s) => ({ files: { ...s.files, [workspaceId]: files } })),
  addFile: (workspaceId, file) =>
    set((s) => ({
      files: {
        ...s.files,
        [workspaceId]: [...(s.files[workspaceId] || []), file],
      },
    })),
  removeFile: (workspaceId, fileId) =>
    set((s) => ({
      files: {
        ...s.files,
        [workspaceId]: (s.files[workspaceId] || []).filter((f) => f.id !== fileId),
      },
    })),

  // Active editor
  activeFileId: null,
  activeFileContent: "",
  setActiveFileId: (id) => set({ activeFileId: id }),
  setActiveFileContent: (content) => set({ activeFileContent: content }),

  // Chat
  sessions: {},
  activeSessionId: null,
  messages: {},
  isStreaming: false,
  setSessions: (workspaceId, sessions) => set((s) => ({ sessions: { ...s.sessions, [workspaceId]: sessions } })),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setMessages: (sessionId, messages) => set((s) => ({ messages: { ...s.messages, [sessionId]: messages } })),
  addMessage: (sessionId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] || []), message],
      },
    })),
  appendToLastAssistant: (sessionId, content) =>
    set((s) => {
      const msgs = s.messages[sessionId] || [];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        const updated = { ...last, content: last.content + content };
        return { messages: { ...s.messages, [sessionId]: [...msgs.slice(0, -1), updated] } };
      }
      return s;
    }),
  setIsStreaming: (val) => set({ isStreaming: val }),

  // UI
  sidebarOpen: true,
  fileTreeOpen: true,
  chatOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleFileTree: () => set((s) => ({ fileTreeOpen: !s.fileTreeOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setFileTreeOpen: (val) => set({ fileTreeOpen: val }),
  setChatOpen: (val) => set({ chatOpen: val }),
}));
