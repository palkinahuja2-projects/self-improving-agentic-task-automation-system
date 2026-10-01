from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentResponse, AgentUpdate
from app.services.agent_service import (
    create_agent,
    delete_agent,
    get_agent,
    get_agents,
    update_agent,
)

router = APIRouter(
    prefix="/agents",
    tags=["Agents"],
)


@router.post(
    "",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_agent(
    agent_data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentResponse:
    return create_agent(
        db=db,
        agent_data=agent_data,
        owner_id=current_user.id,
    )


@router.get(
    "",
    response_model=list[AgentResponse],
)
def list_user_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AgentResponse]:
    return get_agents(
        db=db,
        owner_id=current_user.id,
    )


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
)
def get_agent_by_id(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentResponse:
    agent = get_agent(
        db=db,
        agent_id=agent_id,
        owner_id=current_user.id,
    )

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    return agent


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
)
def update_existing_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentResponse:
    agent = get_agent(
        db=db,
        agent_id=agent_id,
        owner_id=current_user.id,
    )

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    return update_agent(
        db=db,
        agent=agent,
        agent_data=agent_data,
    )


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    agent = get_agent(
        db=db,
        agent_id=agent_id,
        owner_id=current_user.id,
    )

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    delete_agent(
        db=db,
        agent=agent,
    )
