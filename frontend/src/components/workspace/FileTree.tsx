"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { getFileIcon, formatFileSize, cn } from "@/lib/utils";
import {
  Folder,
  FolderOpen,
  File,
  Upload,
  X,
  Trash2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { WorkspaceFile, FileTreeNode } from "@/types";

function buildTree(files: WorkspaceFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map = new Map<string, FileTreeNode>();

  for (const file of files) {
    const parts = file.path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      if (!map.has(currentPath)) {
        map.set(currentPath, {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
          file: isFile ? file : undefined,
        });
      }
    }
  }

  for (const [path, node] of map) {
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) {
      root.push(node);
    } else {
      const parentPath = path.slice(0, lastSlash);
      const parent = map.get(parentPath);
      if (parent?.children) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

function FileTreeNodeItem({
  node,
  depth = 0,
}: {
  node: FileTreeNode;
  depth?: number;
}) {
  const { activeFileId, setActiveFileId, setActiveFileContent, files, activeWorkspaceId } = useStore();
  const [expanded, setExpanded] = useState(depth < 1);

  const isActive = activeFileId === node.file?.id;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else if (node.file) {
      setActiveFileId(node.file.id);
      if (node.file.content_text) {
        setActiveFileContent(node.file.content_text);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.file || !activeWorkspaceId) return;
    try {
      await api.deleteFile(activeWorkspaceId, node.file.id);
      if (activeFileId === node.file.id) {
        setActiveFileId(null);
        setActiveFileContent("");
      }
    } catch {}
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "file-tree-item flex items-center gap-1.5 text-sm",
          isActive && "active",
          depth > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {isFolder ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-4 text-center text-xs">{getFileIcon(node.name)}</span>
        )}

        {isFolder ? (
          expanded ? (
            <FolderOpen size={14} className="text-nexus-accent-blue shrink-0" />
          ) : (
            <Folder size={14} className="text-nexus-500 shrink-0" />
          )
        ) : (
          <File size={14} className="text-nexus-500 shrink-0" />
        )}

        <span className="truncate flex-1">{node.name}</span>

        {node.file && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover/file-item:opacity-100 p-0.5 rounded hover:bg-white/10 text-nexus-600 hover:text-red-400 transition-all"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {isFolder && expanded && node.children?.map((child) => (
        <FileTreeNodeItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FileTree() {
  const { activeWorkspaceId, files, setFiles } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const workspaceFiles = activeWorkspaceId ? files[activeWorkspaceId] || [] : [];

  useEffect(() => {
    if (!activeWorkspaceId) return;
    api.listFiles(activeWorkspaceId).then((data) => setFiles(activeWorkspaceId!, data)).catch(() => {});
  }, [activeWorkspaceId, setFiles]);

  const handleUpload = useCallback(async (file: File) => {
    if (!activeWorkspaceId) return;
    setIsUploading(true);
    try {
      const uploaded = await api.uploadFile(activeWorkspaceId, file);
      useStore.getState().addFile(activeWorkspaceId, uploaded);
    } catch {}
    setIsUploading(false);
  }, [activeWorkspaceId]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleUpload(file);
    }
  }, [handleUpload]);

  const tree = buildTree(workspaceFiles);

  return (
    <div
      className={`w-56 glass-sidebar border-r border-white/5 flex flex-col shrink-0 transition-colors ${
        dragOver ? "border-nexus-accent-purple/50" : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-medium text-nexus-400 uppercase tracking-wider">Files</span>
        <label className="cursor-pointer p-1 rounded hover:bg-white/5 text-nexus-500 hover:text-nexus-300 transition-colors">
          <Upload size={14} />
          <input
            type="file"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(handleUpload);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {workspaceFiles.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-nexus-500 mb-2">Drop files here</p>
            {isUploading && (
              <div className="flex justify-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeNodeItem key={node.path} node={node} />
          ))
        )}
      </div>
    </div>
  );
}
