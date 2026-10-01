from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.execution import ExecutionHistoryResponse
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowExecuteRequest,
    WorkflowNodeCreate,
    WorkflowNodeResponse,
    WorkflowNodeUpdate,
    WorkflowResponse,
    WorkflowUpdate,
)
from app.services.workflow_service import WorkflowService
from app.tasks.workflow_engine import WorkflowExecutionEngine

router = APIRouter(
    prefix="/workflows",
    tags=["Workflows"],
)


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow(
    workflow_in: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Create a new workflow with optional initial nodes."""
    return WorkflowService.create_workflow(db=db, user_id=current_user.id, workflow_in=workflow_in)


@router.get(
    "",
    response_model=List[WorkflowResponse],
)
def list_workflows(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by workflow status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[WorkflowResponse]:
    """List all workflows owned by current user."""
    return WorkflowService.list_workflows(db=db, user_id=current_user.id, status=status_filter)


@router.get(
    "/{workflow_id}",
    response_model=WorkflowResponse,
)
def get_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Get a workflow by ID with its execution nodes."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return workflow


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
)
def update_workflow(
    workflow_id: UUID,
    workflow_in: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Update workflow details."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return WorkflowService.update_workflow(db=db, workflow=workflow, workflow_in=workflow_in)


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a workflow."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    WorkflowService.delete_workflow(db=db, workflow=workflow)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Node Endpoints
@router.post(
    "/{workflow_id}/nodes",
    response_model=WorkflowNodeResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_workflow_node(
    workflow_id: UUID,
    node_in: WorkflowNodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowNodeResponse:
    """Add a node to a workflow."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return WorkflowService.add_node(db=db, workflow_id=workflow_id, node_in=node_in)


@router.put(
    "/{workflow_id}/nodes/{node_id}",
    response_model=WorkflowNodeResponse,
)
def update_workflow_node(
    workflow_id: UUID,
    node_id: UUID,
    node_in: WorkflowNodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowNodeResponse:
    """Update a workflow node."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    nodes = WorkflowService.get_workflow_nodes(db=db, workflow_id=workflow_id)
    target_node = next((n for n in nodes if n.id == node_id), None)
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow node not found",
        )
    return WorkflowService.update_node(db=db, node=target_node, node_in=node_in)


@router.delete(
    "/{workflow_id}/nodes/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workflow_node(
    workflow_id: UUID,
    node_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a workflow node."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    nodes = WorkflowService.get_workflow_nodes(db=db, workflow_id=workflow_id)
    target_node = next((n for n in nodes if n.id == node_id), None)
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow node not found",
        )
    WorkflowService.delete_node(db=db, node=target_node)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{workflow_id}/activate",
    response_model=WorkflowResponse,
)
def activate_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Activate a workflow."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return WorkflowService.activate_workflow(db=db, workflow=workflow)


@router.post(
    "/{workflow_id}/deactivate",
    response_model=WorkflowResponse,
)
def deactivate_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Deactivate/pause a workflow."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return WorkflowService.deactivate_workflow(db=db, workflow=workflow)


@router.post(
    "/{workflow_id}/execute",
    response_model=WorkflowResponse,
)
def execute_workflow(
    workflow_id: UUID,
    req: Optional[WorkflowExecuteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkflowResponse:
    """Execute a workflow pipeline."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    initial_input = req.input_data if req else None
    return WorkflowExecutionEngine.execute_workflow(
        db=db,
        workflow_id=workflow.id,
        user_id=current_user.id,
        initial_input=initial_input,
    )


@router.get(
    "/{workflow_id}/history",
    response_model=List[ExecutionHistoryResponse],
)
def get_workflow_history(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ExecutionHistoryResponse]:
    """Retrieve execution history records for a workflow."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return WorkflowService.get_workflow_history(db=db, workflow_id=workflow_id, user_id=current_user.id)
