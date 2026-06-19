import uuid
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_session
from app.models.chat import ChatSession, Message, MessageRole
from app.models.workspace import File
from app.schemas.chat import ChatSessionCreate, ChatSessionOut, MessageOut, ChatRequest
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: ChatSessionCreate,
    session: AsyncSession = Depends(get_session),
):
    chat_session = ChatSession(
        workspace_id=payload.workspace_id,
        title=payload.title,
    )
    session.add(chat_session)
    await session.flush()
    await session.refresh(chat_session)
    return ChatSessionOut.model_validate(chat_session)


@router.get("/sessions/{workspace_id}", response_model=list[ChatSessionOut])
async def list_sessions(
    workspace_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ChatSession)
        .where(ChatSession.workspace_id == workspace_id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [ChatSessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def get_messages(
    session_id: uuid.UUID,
    db_session: AsyncSession = Depends(get_session),
):
    result = await db_session.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [MessageOut.model_validate(m) for m in messages]


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    db_session: AsyncSession = Depends(get_session),
):
    # Verify session exists
    result = await db_session.execute(
        select(ChatSession).where(ChatSession.id == payload.session_id)
    )
    chat_session = result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = Message(
        session_id=payload.session_id,
        role=MessageRole.user,
        content=payload.message,
    )
    db_session.add(user_msg)
    await db_session.flush()

    # Get message history
    result = await db_session.execute(
        select(Message)
        .where(Message.session_id == payload.session_id)
        .order_by(Message.created_at)
    )
    history = result.scalars().all()

    messages_for_ai = [
        {"role": m.role.value, "content": m.content} for m in history
    ]

    # Build workspace context if requested
    context = None
    if payload.include_context:
        files_result = await db_session.execute(
            select(File).where(File.workspace_id == chat_session.workspace_id)
        )
        files = files_result.scalars().all()
        context_parts = []
        for f in files:
            if f.content_text:
                context_parts.append(f"--- File: {f.path} ---\n{f.content_text}\n")
        if context_parts:
            context = "\n".join(context_parts)

    async def event_generator():
        full_response = []
        async for event in ai_service.stream_chat(messages_for_ai, context):
            if event["type"] == "delta":
                full_response.append(event["content"])
                yield {"event": "delta", "data": json.dumps({"content": event["content"]})}
            elif event["type"] == "done":
                # Save assistant message
                assistant_content = "".join(full_response)
                assistant_msg = Message(
                    session_id=payload.session_id,
                    role=MessageRole.assistant,
                    content=assistant_content,
                    metadata={"model": ai_service.model},
                )
                db_session.add(assistant_msg)
                await db_session.commit()

                # Update session title if this is the first exchange
                if len(messages_for_ai) <= 1:
                    title_result = await db_session.execute(
                        select(ChatSession).where(ChatSession.id == payload.session_id)
                    )
                    sess = title_result.scalar_one()
                    # Use first ~50 chars of response as title
                    first_line = assistant_content.split("\n")[0][:50]
                    if first_line:
                        sess.title = first_line.strip().strip("#").strip() or "Chat"
                    await db_session.commit()

                yield {"event": "done", "data": json.dumps({"content": assistant_content})}
            elif event["type"] == "error":
                yield {"event": "error", "data": json.dumps({"content": event["content"]})}
            else:
                yield {"event": event["type"], "data": json.dumps({"content": event.get("content", "")})}

    return EventSourceResponse(event_generator())
