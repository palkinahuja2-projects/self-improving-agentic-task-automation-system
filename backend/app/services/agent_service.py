from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate


def create_agent(
    db: Session,
    agent_data: AgentCreate,
    owner_id: UUID,
) -> Agent:
    agent = Agent(
        name=agent_data.name,
        description=agent_data.description,
        agent_type=agent_data.agent_type,
        is_active=agent_data.is_active,
        owner_id=owner_id,
    )

    db.add(agent)
    db.commit()
    db.refresh(agent)

    return agent


def get_agent(
    db: Session,
    agent_id: UUID,
    owner_id: UUID,
) -> Agent | None:
    return db.scalar(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.owner_id == owner_id,
        )
    )


def get_agents(
    db: Session,
    owner_id: UUID,
) -> list[Agent]:
    return list(
        db.scalars(
            select(Agent)
            .where(Agent.owner_id == owner_id)
            .order_by(Agent.created_at.desc())
        ).all()
    )


def update_agent(
    db: Session,
    agent: Agent,
    agent_data: AgentUpdate,
) -> Agent:
    update_data = agent_data.model_dump(
        exclude_unset=True,
    )

    for field, value in update_data.items():
        setattr(agent, field, value)

    db.commit()
    db.refresh(agent)

    return agent


def delete_agent(
    db: Session,
    agent: Agent,
) -> None:
    db.delete(agent)
    db.commit()


def retrieve_agent_context_memories(
    db: Session,
    agent: Agent,
    query: str,
    limit: int = 5,
):
    """Retrieve relevant semantic memories for an agent given a task or query context."""
    from app.schemas.memory import MemorySearchQuery
    from app.services.memory_service import search_memories

    search_query = MemorySearchQuery(
        query=query,
        limit=limit,
        agent_id=agent.id,
    )
    return search_memories(
        db=db,
        search_query=search_query,
        owner_id=agent.owner_id,
    )


def create_agent_memory(
    db: Session,
    agent: Agent,
    content: str,
    memory_type: str = "long_term",
    metadata: dict | None = None,
):
    """Store a new memory associated with a specific agent."""
    from app.schemas.memory import MemoryCreate
    from app.services.memory_service import create_memory

    memory_data = MemoryCreate(
        content=content,
        memory_type=memory_type,
        agent_id=agent.id,
        metadata=metadata,
    )
    return create_memory(
        db=db,
        memory_data=memory_data,
        owner_id=agent.owner_id,
    )