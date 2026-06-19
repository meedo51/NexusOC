"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  X,
  Settings,
  Code2,
} from "lucide-react";

export function Sidebar() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    addWorkspace,
    removeWorkspace,
    updateWorkspace,
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    setMessages,
  } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ws = await api.createWorkspace({ name: newName.trim() });
      addWorkspace(ws);
      setActiveWorkspaceId(ws.id);
      setNewName("");
      setIsCreating(false);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteWorkspace(id);
      removeWorkspace(id);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
      }
    } catch {}
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.updateWorkspace(id, { name: editName.trim() });
      updateWorkspace(id, { name: editName.trim() });
      setEditingId(null);
    } catch {}
  };

  const handleSelect = async (id: string) => {
    setActiveWorkspaceId(id);
    if (!sessions[id]?.length) {
      try {
        const data = await api.listSessions(id);
        setSessions(id, data);
      } catch {}
    }
  };

  const handleNewChat = async () => {
    if (!activeWorkspaceId) return;
    try {
      const session = await api.createSession(activeWorkspaceId);
      const current = sessions[activeWorkspaceId] || [];
      setSessions(activeWorkspaceId, [session, ...current]);
      setActiveSessionId(session.id);
      setMessages(session.id, []);
    } catch {}
  };

  return (
    <aside className="w-64 glass-sidebar flex flex-col shrink-0 z-30">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Code2 size={22} className="text-nexus-accent-purple" />
          <h1 className="text-lg font-bold neon-text">NexusOC</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-nexus-accent-purple/10 text-nexus-accent-purple hover:bg-nexus-accent-purple/20 border border-nexus-accent-purple/20 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            New Workspace
          </button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
              onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-nexus-200 placeholder-nexus-500 outline-none focus:border-nexus-accent-purple/40 transition-colors"
              />
              <div className="flex gap-2 mt-2">
                <NeonButton type="submit" size="sm" className="flex-1">
                  Create
                </NeonButton>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setNewName(""); }}
                  className="p-2 rounded-lg hover:bg-white/5 text-nexus-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workspaces.length === 0 && (
          <p className="text-nexus-500 text-sm text-center py-8">
            No workspaces yet
          </p>
        )}

        {workspaces.map((ws) => (
          <div key={ws.id}>
            <div
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                activeWorkspaceId === ws.id
                  ? "bg-nexus-accent-purple/10 text-nexus-accent-purple"
                  : "text-nexus-400 hover:bg-white/5 hover:text-nexus-200"
              }`}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => handleSelect(ws.id)}
              >
                {editingId === ws.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(ws.id); }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white/10 rounded px-2 py-0.5 text-sm text-nexus-200 outline-none border border-nexus-accent-purple/30"
                    />
                  </form>
                ) : (
                  <span className="text-sm font-medium truncate block">
                    {ws.name}
                  </span>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(ws.id);
                    setEditName(ws.name);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-nexus-500 hover:text-nexus-300 transition-colors"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                  className="p-1 rounded hover:bg-white/10 text-nexus-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Sessions for active workspace */}
            {activeWorkspaceId === ws.id && (sessions[ws.id]?.length || 0) > 0 && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-white/5 pl-2">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-nexus-500 hover:text-nexus-300 hover:bg-white/5 transition-all"
                >
                  <Plus size={12} />
                  New chat
                </button>
                {sessions[ws.id]?.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs transition-all ${
                      activeSessionId === session.id
                        ? "bg-nexus-accent-blue/10 text-nexus-accent-blue"
                        : "text-nexus-500 hover:text-nexus-300 hover:bg-white/5"
                    }`}
                  >
                    <MessageSquare size={12} />
                    <span className="truncate">{session.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-nexus-500">
          <Settings size={14} />
          <span>NexusOC v1.0</span>
        </div>
      </div>
    </aside>
  );
}
