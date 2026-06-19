import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    js: "🟨", ts: "🔵", tsx: "🔵", jsx: "🟨",
    py: "🐍", rs: "🦀", go: "🔷", java: "☕",
    json: "📋", yaml: "📋", yml: "📋", toml: "📋",
    md: "📝", txt: "📄", html: "🌐", css: "🎨",
    sql: "🗃️", sh: "⚡", dockerfile: "🐳",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", svg: "🖼️",
    pdf: "📕",
  };
  return icons[ext] || "📄";
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}
