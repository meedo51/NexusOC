const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Workspaces
  listWorkspaces: () =>
    request<{ workspaces: any[]; total: number }>("/workspaces"),

  getWorkspace: (id: string) =>
    request<any>(`/workspaces/${id}`),

  createWorkspace: (data: { name: string; description?: string }) =>
    request<any>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateWorkspace: (id: string, data: any) =>
    request<any>(`/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteWorkspace: (id: string) =>
    request<void>(`/workspaces/${id}`, { method: "DELETE" }),

  getWorkspaceContext: (id: string) =>
    request<{ workspace_id: string; file_count: number; context: string }>(
      `/workspaces/${id}/context`
    ),

  // Chat Sessions
  createSession: (workspaceId: string, title?: string) =>
    request<any>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, title: title || "New Chat" }),
    }),

  listSessions: (workspaceId: string) =>
    request<any[]>(`/chat/sessions/${workspaceId}`),

  getMessages: (sessionId: string) =>
    request<any[]>(`/chat/sessions/${sessionId}/messages`),

  // Files
  listFiles: (workspaceId: string) =>
    request<any[]>(`/files/${workspaceId}`),

  uploadFile: async (workspaceId: string, file: File, path?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (path) formData.append("path", path);

    const url = `${API_BASE}/files/${workspaceId}/upload`;
    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },

  updateFileContent: (workspaceId: string, fileId: string, content: string) =>
    request<any>(`/files/${workspaceId}/${fileId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  deleteFile: (workspaceId: string, fileId: string) =>
    request<void>(`/files/${workspaceId}/${fileId}`, { method: "DELETE" }),

  health: () => request<any>("/health"),
};

export function streamChat(
  sessionId: string,
  message: string,
  includeContext: boolean = true,
  onDelta: (content: string) => void,
  onDone: (fullContent: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): () => void {
  const url = `${API_BASE}/chat/stream`;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, include_context: includeContext }),
    signal,
  })
    .then(async (response) => {
      if (!response.body) {
        onError("No response body");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEvent === "delta") {
                onDelta(data.content);
                fullContent += data.content;
              } else if (currentEvent === "done") {
                onDone(fullContent);
              } else if (currentEvent === "error") {
                onError(data.content);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message);
      }
    });

  return () => {};
}
