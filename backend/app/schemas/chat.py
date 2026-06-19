import uuid
from datetime import datetime

from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    workspace_id: uuid.UUID
    title: str = "New Chat"


class ChatSessionOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    meta_data: dict | None
    token_count: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    session_id: uuid.UUID
    message: str
    include_context: bool = True


class ChatStreamEvent(BaseModel):
    type: str  # "delta" | "done" | "error"
    content: str = ""
