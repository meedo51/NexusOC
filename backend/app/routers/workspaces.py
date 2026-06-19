import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.workspace import Workspace, File
from app.models.chat import ChatSession, Message
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceOut, WorkspaceList

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=WorkspaceList)
async def list_workspaces(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Workspace).order_by(Workspace.updated_at.desc()))
    workspaces = result.scalars().all()
    return WorkspaceList(
        workspaces=[WorkspaceOut.model_validate(w) for w in workspaces],
        total=len(workspaces),
    )


@router.post("/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    session: AsyncSession = Depends(get_session),
):
    workspace = Workspace(name=payload.name, description=payload.description)
    session.add(workspace)
    await session.flush()
    await session.refresh(workspace)
    logger.info(f"Created workspace: {workspace.id} ({workspace.name})")
    return WorkspaceOut.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceOut.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)

    await session.flush()
    await session.refresh(workspace)
    return WorkspaceOut.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    await session.delete(workspace)
    logger.info(f"Deleted workspace: {workspace_id}")


@router.get("/{workspace_id}/context")
async def get_workspace_context(
    workspace_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(File).where(File.workspace_id == workspace_id).order_by(File.path)
    )
    files = result.scalars().all()

    context_parts = []
    for f in files:
        if f.content_text:
            context_parts.append(f"--- File: {f.path} ---\n{f.content_text}\n")

    return {
        "workspace_id": str(workspace_id),
        "file_count": len(files),
        "context": "\n".join(context_parts) if context_parts else "No files in workspace.",
    }
