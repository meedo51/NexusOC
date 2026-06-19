"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { Bot, User, Copy, Check, Code2 } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  onApplyCode?: (code: string) => void;
}

export function MessageBubble({ message, onApplyCode }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedBlock(code);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  return (
    <div className={`message-enter flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? "bg-nexus-accent-blue/10 text-nexus-accent-blue"
            : "bg-nexus-accent-purple/10 text-nexus-accent-purple"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <div className="inline-block glass-panel-light p-3 text-sm text-nexus-200">
            {message.content}
          </div>
        ) : (
          <GlassPanel variant="light" className="p-3 markdown-content">
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (match) {
                      return (
                        <div className="relative group my-3">
                          <div className="flex items-center justify-between px-4 py-1.5 bg-black/30 rounded-t-lg border-b border-white/5">
                            <span className="text-xs text-nexus-500">
                              {match[1]}
                            </span>
                            <div className="flex items-center gap-2">
                              {onApplyCode && (
                                <button
                                  onClick={() => onApplyCode(codeString)}
                                  className="flex items-center gap-1 text-xs text-nexus-accent-teal hover:text-nexus-accent-teal/80 transition-colors"
                                >
                                  <Code2 size={12} />
                                  Apply
                                </button>
                              )}
                              <button
                                onClick={() => handleCopy(codeString)}
                                className="flex items-center gap-1 text-xs text-nexus-500 hover:text-nexus-300 transition-colors"
                              >
                                {copiedBlock === codeString ? (
                                  <Check size={12} className="text-green-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: "12px",
                              borderBottomRightRadius: "12px",
                              background: "rgba(0,0,0,0.3)",
                              padding: "16px",
                              fontSize: "0.85rem",
                            }}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
