"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { api, streamChat } from "@/lib/api";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { MessageBubble } from "@/components/chat/MessageBubble";
import {
  Send,
  Paperclip,
  Bot,
  Sparkles,
  Square,
} from "lucide-react";

export function ChatInterface() {
  const {
    activeWorkspaceId,
    activeSessionId,
    setActiveSessionId,
    sessions,
    setSessions,
    messages,
    setMessages,
    addMessage,
    appendToLastAssistant,
    isStreaming,
    setIsStreaming,
    activeFileContent,
  } = useStore();

  const [input, setInput] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentMessages = activeSessionId ? messages[activeSessionId] || [] : [];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Create initial session if none exists
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const wsSessions = sessions[activeWorkspaceId];
    if (!wsSessions?.length && !activeSessionId) {
      api.createSession(activeWorkspaceId).then((session) => {
        setSessions(activeWorkspaceId, [session]);
        setActiveSessionId(session.id);
        setMessages(session.id, []);
      }).catch(() => {});
    } else if (wsSessions?.length && !activeSessionId) {
      setActiveSessionId(wsSessions[0].id);
    }
  }, [activeWorkspaceId]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) return;
    if (!messages[activeSessionId]?.length) {
      api.getMessages(activeSessionId)
        .then((data) => setMessages(activeSessionId!, data))
        .catch(() => {});
    }
  }, [activeSessionId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeSessionId || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId,
      role: "user" as const,
      content: text,
      meta_data: null,
      token_count: null,
      created_at: new Date().toISOString(),
    };

    addMessage(activeSessionId, userMessage);

    const assistantPlaceholder = {
      id: `temp-assistant-${Date.now()}`,
      session_id: activeSessionId,
      role: "assistant" as const,
      content: "",
      meta_data: null,
      token_count: null,
      created_at: new Date().toISOString(),
    };

    addMessage(activeSessionId, assistantPlaceholder);

    const controller = new AbortController();
    setAbortController(controller);

    let fullContent = "";

    streamChat(
      activeSessionId,
      text,
      true,
      (delta) => {
        fullContent += delta;
        appendToLastAssistant(activeSessionId, delta);
      },
      (content) => {
        setIsStreaming(false);
        setAbortController(null);
      },
      (error) => {
        appendToLastAssistant(activeSessionId, `\n\n> Error: ${error}`);
        setIsStreaming(false);
        setAbortController(null);
      },
      controller.signal
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    abortController?.abort();
    setIsStreaming(false);
    setAbortController(null);
  };

  const handleApplyCode = (code: string) => {
    useStore.getState().setActiveFileContent(code);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center gap-2 shrink-0">
        <Bot size={16} className="text-nexus-accent-purple" />
        <span className="text-sm font-medium text-nexus-200">AI Assistant</span>
        <Sparkles size={14} className="text-nexus-accent-teal ml-auto" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {currentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Bot size={40} className="text-nexus-accent-purple/30 mb-4" />
            <h3 className="text-lg font-medium text-nexus-300 mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-nexus-500 max-w-sm">
              Ask me to write code, review files, or help debug issues in your workspace.
            </p>
          </div>
        )}

        {currentMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onApplyCode={handleApplyCode}
          />
        ))}

        {isStreaming && currentMessages[currentMessages.length - 1]?.content === "" && (
          <div className="glass-panel-light p-4 message-enter">
            <div className="flex items-center gap-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <GlassPanel variant="light" className="p-1">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask NexusOC anything..."
                rows={1}
                className="w-full bg-transparent text-sm text-nexus-200 placeholder-nexus-500 outline-none resize-none px-3 py-2 max-h-[120px]"
                disabled={isStreaming}
              />
            </div>

            <div className="flex items-center gap-1 pr-1 pb-1">
              <button className="p-2 rounded-lg hover:bg-white/5 text-nexus-500 hover:text-nexus-300 transition-colors">
                <Paperclip size={16} />
              </button>

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-nexus-accent-purple/10 text-nexus-accent-purple hover:bg-nexus-accent-purple/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
