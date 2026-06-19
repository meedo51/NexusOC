import os
import uuid
import logging
from pathlib import Path

from app.config import settings
from app.models.workspace import FileType

logger = logging.getLogger(__name__)

FILE_TYPE_MAP: dict[str, FileType] = {
    ".py": FileType.code,
    ".js": FileType.code,
    ".ts": FileType.code,
    ".tsx": FileType.code,
    ".jsx": FileType.code,
    ".rs": FileType.code,
    ".go": FileType.code,
    ".java": FileType.code,
    ".c": FileType.code,
    ".cpp": FileType.code,
    ".h": FileType.code,
    ".hpp": FileType.code,
    ".cs": FileType.code,
    ".rb": FileType.code,
    ".php": FileType.code,
    ".swift": FileType.code,
    ".kt": FileType.code,
    ".scala": FileType.code,
    ".zig": FileType.code,
    ".svelte": FileType.code,
    ".vue": FileType.code,
    ".astro": FileType.code,
    ".json": FileType.code,
    ".yaml": FileType.code,
    ".yml": FileType.code,
    ".toml": FileType.code,
    ".xml": FileType.code,
    ".sql": FileType.code,
    ".sh": FileType.code,
    ".bash": FileType.code,
    ".zsh": FileType.code,
    ".fish": FileType.code,
    ".css": FileType.code,
    ".scss": FileType.code,
    ".less": FileType.code,
    ".html": FileType.code,
    ".htm": FileType.code,
    ".md": FileType.code,
    ".txt": FileType.document,
    ".pdf": FileType.pdf,
    ".png": FileType.image,
    ".jpg": FileType.image,
    ".jpeg": FileType.image,
    ".gif": FileType.image,
    ".svg": FileType.image,
    ".webp": FileType.image,
    ".ico": FileType.image,
    ".bmp": FileType.image,
}

TEXT_EXTENSIONS: set[str] = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".rs", ".go", ".java", ".c", ".cpp",
    ".h", ".hpp", ".cs", ".rb", ".php", ".swift", ".kt", ".scala", ".zig",
    ".svelte", ".vue", ".astro", ".json", ".yaml", ".yml", ".toml", ".xml",
    ".sql", ".sh", ".bash", ".zsh", ".fish", ".css", ".scss", ".less",
    ".html", ".htm", ".md", ".txt", ".env", ".ini", ".cfg", ".conf",
    ".gradle", ".properties", ".lock", ".gitignore", ".dockerignore",
    ".dockerfile", ".proto", ".graphql", ".prisma",
}

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024


class FileService:
    def __init__(self):
        self.storage_dir = Path(settings.storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def get_workspace_dir(self, workspace_id: uuid.UUID) -> Path:
        path = self.storage_dir / str(workspace_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def get_file_path(self, workspace_id: uuid.UUID, file_id: uuid.UUID, original_name: str) -> Path:
        ext = Path(original_name).suffix
        return self.get_workspace_dir(workspace_id) / f"{file_id}{ext}"

    def determine_file_type(self, filename: str) -> FileType:
        ext = Path(filename).suffix.lower()
        return FILE_TYPE_MAP.get(ext, FileType.other)

    def is_text_file(self, filename: str) -> bool:
        ext = Path(filename).suffix.lower()
        return ext in TEXT_EXTENSIONS

    async def save_file(
        self,
        workspace_id: uuid.UUID,
        file_id: uuid.UUID,
        original_name: str,
        content: bytes,
    ) -> tuple[str, int, str | None]:
        file_path = self.get_file_path(workspace_id, file_id, original_name)
        file_path.write_bytes(content)
        size = len(content)

        content_text = None
        if self.is_text_file(original_name):
            try:
                content_text = content.decode("utf-8")
            except UnicodeDecodeError:
                content_text = content.decode("utf-8", errors="replace")

        mime_type = self._guess_mime(original_name)
        return mime_type, size, content_text

    def read_file_content(self, workspace_id: uuid.UUID, file_id: uuid.UUID, original_name: str) -> bytes | None:
        file_path = self.get_file_path(workspace_id, file_id, original_name)
        if file_path.exists():
            return file_path.read_bytes()
        return None

    def delete_file(self, workspace_id: uuid.UUID, file_id: uuid.UUID, original_name: str) -> bool:
        file_path = self.get_file_path(workspace_id, file_id, original_name)
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    def _guess_mime(self, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        mime_map = {
            ".py": "text/x-python",
            ".js": "text/javascript",
            ".ts": "text/typescript",
            ".tsx": "text/typescript-jsx",
            ".jsx": "text/jsx",
            ".rs": "text/x-rust",
            ".go": "text/x-go",
            ".java": "text/x-java",
            ".json": "application/json",
            ".html": "text/html",
            ".css": "text/css",
            ".md": "text/markdown",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".yaml": "text/yaml",
            ".yml": "text/yaml",
            ".toml": "text/toml",
            ".sh": "text/x-shellscript",
            ".sql": "text/x-sql",
        }
        return mime_map.get(ext, "application/octet-stream")


file_service = FileService()
