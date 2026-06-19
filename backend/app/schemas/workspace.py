import uuid
from datetime import datetime

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    description: str | None = None


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    active_file_path: str | None = None


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    active_file_path: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceList(BaseModel):
    workspaces: list[WorkspaceOut]
    total: int


class FileOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    path: str
    original_name: str
    mime_type: str
    file_type: str
    size_bytes: int
    content_text: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
