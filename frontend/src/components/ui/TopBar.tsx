"use client";

import { useStore } from "@/lib/store";
import { PanelLeft, PanelRight, FolderTree } from "lucide-react";

export function TopBar() {
  const {
    activeWorkspaceId,
    workspaces,
    sidebarOpen,
    fileTreeOpen,
    chatOpen,
    toggleSidebar,
    toggleFileTree,
    toggleChat,
    setActiveWorkspaceId,
  } = useStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <header className="h-12 glass-panel-light rounded-none border-x-0 border-t-0 flex items-center px-3 gap-2 shrink-0 z-20">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-white/5 text-nexus-400 hover:text-nexus-200 transition-colors"
        title="Toggle sidebar"
      >
        <PanelLeft size={18} />
      </button>

      <div className="h-5 w-px bg-white/10 mx-1" />

      <button
        onClick={toggleFileTree}
        className="p-2 rounded-lg hover:bg-white/5 text-nexus-400 hover:text-nexus-200 transition-colors"
        title="Toggle file tree"
      >
        <FolderTree size={18} />
      </button>

      <div className="flex-1 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-nexus-400">Workspace:</span>
          <select
            value={activeWorkspaceId || ""}
            onChange={(e) => setActiveWorkspaceId(e.target.value || null)}
            className="bg-transparent text-nexus-200 font-medium border-none outline-none cursor-pointer hover:text-nexus-100 transition-colors appearance-none"
          >
            <option value="" disabled>
              Select workspace
            </option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id} className="bg-nexus-800">
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={toggleChat}
        className={`p-2 rounded-lg transition-colors ${
          chatOpen
            ? "text-nexus-accent-purple bg-nexus-accent-purple/10"
            : "text-nexus-400 hover:text-nexus-200 hover:bg-white/5"
        }`}
        title="Toggle chat panel"
      >
        <PanelRight size={18} />
      </button>
    </header>
  );
}
