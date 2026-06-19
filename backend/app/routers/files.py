import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.workspace import Workspace, File as FileModel
from app.schemas.workspace import FileOut
from app.services.file_service import file_service, MAX_FILE_SIZE

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{workspace_id}", response_model=list[FileOut])
async def list_files(
    workspace_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(FileModel).where(FileModel.workspace_id == workspace_id).order_by(FileModel.path)
    )
    files = result.scalars().all()
    return [FileOut.model_validate(f) for f in files]


@router.post("/{workspace_id}/upload", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    workspace_id: uuid.UUID,
    file: UploadFile = FastAPIFile(...),
    path: str = "",
    session: AsyncSession = Depends(get_session),
):
    # Verify workspace exists
    ws_result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    file_id = uuid.uuid4()
    file_type = file_service.determine_file_type(file.filename or "unknown.bin")
    mime_type, size, content_text = await file_service.save_file(
        workspace_id, file_id, file.filename or "unknown", content
    )

    storage_path = path or file.filename or file_id.hex

    db_file = FileModel(
        id=file_id,
        workspace_id=workspace_id,
        path=storage_path,
        original_name=file.filename or "unknown",
        mime_type=mime_type,
        file_type=file_type,
        size_bytes=size,
        content_text=content_text,
    )
    session.add(db_file)
    await session.flush()
    await session.refresh(db_file)

    logger.info(f"Uploaded file {file.filename} ({size} bytes) to workspace {workspace_id}")
    return FileOut.model_validate(db_file)


@router.put("/{workspace_id}/{file_id}/content", response_model=FileOut)
async def update_file_content(
    workspace_id: uuid.UUID,
    file_id: uuid.UUID,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.workspace_id == workspace_id,
        )
    )
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    content = payload.get("content", "")
    db_file.content_text = content

    # Persist to disk
    file_service.save_file(
        workspace_id, file_id, db_file.original_name, content.encode("utf-8")
    )

    await session.flush()
    await session.refresh(db_file)
    return FileOut.model_validate(db_file)


@router.get("/{workspace_id}/{file_id}/download")
async def download_file(
    workspace_id: uuid.UUID,
    file_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.workspace_id == workspace_id,
        )
    )
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    content = file_service.read_file_content(workspace_id, file_id, db_file.original_name)
    if content is None:
        raise HTTPException(status_code=404, detail="File content not found on disk")

    from fastapi.responses import Response
    return Response(
        content=content,
        media_type=db_file.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{db_file.original_name}"'},
    )


@router.delete("/{workspace_id}/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    workspace_id: uuid.UUID,
    file_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.workspace_id == workspace_id,
        )
    )
    db_file = result.scalar_one_or_none()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    file_service.delete_file(workspace_id, file_id, db_file.original_name)
    await session.delete(db_file)
    logger.info(f"Deleted file {db_file.original_name} from workspace {workspace_id}")
