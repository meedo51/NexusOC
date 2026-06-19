"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  Save,
  Download,
  Copy,
  Check,
  FileCode,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-nexus-500">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    ),
  }
);

const LANGUAGE_MAP: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  html: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
  xml: "xml",
  graphql: "graphql",
  vue: "html",
  svelte: "html",
};

export function CodeEditor() {
  const {
    activeFileId,
    activeFileContent,
    setActiveFileContent,
    activeWorkspaceId,
    files,
  } = useStore();

  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);

  const workspaceFiles = activeWorkspaceId ? files[activeWorkspaceId] || [] : [];
  const activeFile = workspaceFiles.find((f) => f.id === activeFileId);

  const fileExt = activeFile?.original_name?.split(".").pop()?.toLowerCase() || "";
  const language = LANGUAGE_MAP[fileExt] || "plaintext";

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.focus();

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  }, [activeFileId, activeWorkspaceId, activeFileContent]);

  const handleSave = useCallback(async () => {
    if (!activeFileId || !activeWorkspaceId) return;
    try {
      await api.updateFileContent(activeWorkspaceId, activeFileId, activeFileContent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }, [activeFileId, activeWorkspaceId, activeFileContent]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setActiveFileContent(value);
        setSaved(false);
      }
    },
    [setActiveFileContent]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeFileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageFromPath = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return LANGUAGE_MAP[ext] || "plaintext";
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center glass-panel p-10">
          <FileCode size={48} className="text-nexus-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-nexus-400 mb-2">No file selected</h3>
          <p className="text-sm text-nexus-600">
            Select a file from the file tree to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Tab Bar */}
      <div className="flex items-center h-9 border-b border-white/5 bg-black/20 shrink-0">
        <div className="flex items-center gap-2 px-3 h-full border-r border-white/5">
          <FileCode size={14} className="text-nexus-400" />
          <span className="text-xs text-nexus-300 font-medium">
            {activeFile.path || activeFile.original_name}
          </span>
          {!saved && (
            <span className="w-2 h-2 rounded-full bg-nexus-accent-blue" />
          )}
        </div>

        <div className="flex items-center gap-1 px-2 ml-auto">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-white/5 text-nexus-500 hover:text-nexus-300 transition-colors"
            title="Copy content"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleSave}
            className="p-1.5 rounded hover:bg-white/5 text-nexus-500 hover:text-nexus-300 transition-colors"
            title="Save (Ctrl+S)"
          >
            <Save size={14} />
          </button>
          <button
            className="p-1.5 rounded hover:bg-white/5 text-nexus-500 hover:text-nexus-300 transition-colors"
            title="Download"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={activeFileContent}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 12 },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            bracketPairColorization: { enabled: true },
            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("nexusoc-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "keyword", foreground: "A855F7", fontStyle: "bold" },
                { token: "string", foreground: "14B8A6" },
                { token: "number", foreground: "F59E0B" },
                { token: "type", foreground: "3B82F6" },
                { token: "function", foreground: "F472B6" },
                { token: "variable", foreground: "E2E8F0" },
                { token: "comment", foreground: "64748B", fontStyle: "italic" },
              ],
              colors: {
                "editor.background": "#0B0F19",
                "editor.foreground": "#E2E8F0",
                "editor.lineHighlightBackground": "#1E293B55",
                "editor.selectionBackground": "#A855F733",
                "editorCursor.foreground": "#A855F7",
                "editor.inactiveSelectionBackground": "#33415555",
                "editorLineNumber.foreground": "#475569",
                "editorLineNumber.activeForeground": "#94A3B8",
                "editorGutter.background": "#0B0F19",
                "editorWidget.background": "#1E293B",
                "editorWidget.border": "#334155",
              },
            });
            monaco.editor.setTheme("nexusoc-dark");
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-6 px-3 border-t border-white/5 bg-black/20 gap-3 shrink-0">
        <span className="text-[10px] text-nexus-500 uppercase tracking-wider">
          {language}
        </span>
        <span className="text-[10px] text-nexus-600">|</span>
        <span className="text-[10px] text-nexus-500">
          Lines: {activeFileContent.split("\n").length}
        </span>
        <span className="text-[10px] text-nexus-600">|</span>
        <span className="text-[10px] text-nexus-500">
          {new Blob([activeFileContent]).size} B
        </span>
        {saved && (
          <>
            <span className="text-[10px] text-nexus-600">|</span>
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <Check size={10} />
              Saved
            </span>
          </>
        )}
      </div>
    </div>
  );
}
