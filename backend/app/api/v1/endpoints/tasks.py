from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.execution import ExecutionHistoryResponse
from app.schemas.task import (
    TaskCreate,
    TaskExecuteRequest,
    TaskResponse,
    TaskUpdate,
)
from app.services.task_service import TaskService
from app.tasks.execution_engine import TaskExecutionEngine

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Create a new automation task for current user."""
    return TaskService.create_task(db=db, user_id=current_user.id, task_in=task_in)


@router.get(
    "",
    response_model=List[TaskResponse],
)
def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by task status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[TaskResponse]:
    """List all tasks owned by current user."""
    return TaskService.list_tasks(db=db, user_id=current_user.id, status=status_filter)


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Get a task by ID."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Update a task owned by current user."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskService.update_task(db=db, task=task, task_in=task_in)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a task owned by current user."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    TaskService.delete_task(db=db, task=task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{task_id}/execute",
    response_model=TaskResponse,
)
def execute_task(
    task_id: UUID,
    req: Optional[TaskExecuteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Execute a task synchronously or trigger background execution."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    override_input = req.input_data if req else None
    updated_task = TaskExecutionEngine.execute_task(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        override_input=override_input,
    )
    return updated_task


@router.post(
    "/{task_id}/cancel",
    response_model=TaskResponse,
)
def cancel_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Cancel a pending or running task."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskService.cancel_task(db=db, task=task)


@router.get(
    "/{task_id}/history",
    response_model=List[ExecutionHistoryResponse],
)
def get_task_history(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ExecutionHistoryResponse]:
    """Retrieve execution history records for a task."""
    task = TaskService.get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return TaskService.get_task_history(db=db, task_id=task_id, user_id=current_user.id)
