export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  active_file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  path: string;
  original_name: string;
  mime_type: string;
  file_type: string;
  size_bytes: number;
  content_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta_data: Record<string, unknown> | null;
  token_count: number | null;
  created_at: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  file?: WorkspaceFile;
}
