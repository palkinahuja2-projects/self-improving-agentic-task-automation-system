from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.orchestration.orchestrator import MultiAgentOrchestrator
from app.schemas.multi_agent import (
    AgentMessageSchema,
    MultiAgentExecutionRequest,
    MultiAgentExecutionResponse,
)

router = APIRouter(
    prefix="/multi-agent",
    tags=["Multi-Agent System"],
)


@router.post(
    "/execute",
    response_model=MultiAgentExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
def execute_multi_agent_objective(
    req: MultiAgentExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MultiAgentExecutionResponse:
    """Initiate and run a stateful multi-agent execution pipeline for an objective."""
    return MultiAgentOrchestrator.create_and_execute_session(
        db=db, user_id=current_user.id, req=req
    )


@router.get(
    "/executions",
    response_model=List[MultiAgentExecutionResponse],
)
def list_multi_agent_executions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MultiAgentExecutionResponse]:
    """List all multi-agent execution sessions owned by current user."""
    return MultiAgentOrchestrator.list_executions(db=db, user_id=current_user.id)


@router.get(
    "/executions/{execution_id}",
    response_model=MultiAgentExecutionResponse,
)
def get_multi_agent_execution(
    execution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MultiAgentExecutionResponse:
    """Get details of a multi-agent execution session by ID."""
    execution = MultiAgentOrchestrator.get_execution(
        db=db, execution_id=execution_id, user_id=current_user.id
    )
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-agent execution session not found",
        )
    return execution


@router.get(
    "/executions/{execution_id}/messages",
    response_model=List[AgentMessageSchema],
)
def get_multi_agent_messages(
    execution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AgentMessageSchema]:
    """Retrieve inter-agent message logs for a multi-agent execution session."""
    execution = MultiAgentOrchestrator.get_execution(
        db=db, execution_id=execution_id, user_id=current_user.id
    )
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multi-agent execution session not found",
        )
    return MultiAgentOrchestrator.get_execution_messages(
        db=db, execution_id=execution_id, user_id=current_user.id
    )
