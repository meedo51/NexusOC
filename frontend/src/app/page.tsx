"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/workspace/Sidebar";
import { FileTree } from "@/components/workspace/FileTree";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { TopBar } from "@/components/ui/TopBar";

export default function Home() {
  const {
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    sidebarOpen,
    fileTreeOpen,
    chatOpen,
    setSidebarOpen,
    setFileTreeOpen,
    setChatOpen,
  } = useStore();

  useEffect(() => {
    api.listWorkspaces().then((data) => setWorkspaces(data.workspaces)).catch(() => {});
  }, [setWorkspaces]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setSidebarOpen(false);
        setFileTreeOpen(false);
        setChatOpen(false);
      } else if (width < 1280) {
        setSidebarOpen(true);
        setFileTreeOpen(true);
        setChatOpen(false);
      } else {
        setSidebarOpen(true);
        setFileTreeOpen(true);
        setChatOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen, setFileTreeOpen, setChatOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          {(fileTreeOpen && activeWorkspaceId) ? <FileTree /> : null}
          <main className="flex-1 min-w-0 flex flex-col">
            {activeWorkspaceId ? (
              <div className="flex-1 flex min-h-0">
                <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${chatOpen ? "xl:w-1/2" : "w-full"}`}>
                  <CodeEditor />
                </div>
                {chatOpen && (
                  <div className="w-full xl:w-1/2 min-w-0 border-l border-white/5">
                    <ChatInterface />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md glass-panel p-12">
                  <h1 className="text-4xl font-bold neon-text mb-4">NexusOC</h1>
                  <p className="text-nexus-300 text-lg mb-8">
                    Your AI-powered code assistant
                  </p>
                  <p className="text-nexus-400 text-sm">
                    Create or select a workspace to get started
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
