from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.memory import (
    MemoryCreate,
    MemoryResponse,
    MemorySearchQuery,
    MemorySearchResult,
    MemoryUpdate,
)
from app.services.memory_service import (
    clear_short_term_memories,
    create_memory,
    delete_memory,
    get_memory,
    list_memories,
    search_memories,
    update_memory,
)

router = APIRouter(
    prefix="/memories",
    tags=["Memories"],
)


@router.post(
    "",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def store_memory(
    memory_data: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemoryResponse:
    """Store a new memory in PostgreSQL and index vector in ChromaDB."""
    return create_memory(
        db=db,
        memory_data=memory_data,
        owner_id=current_user.id,
    )


@router.get(
    "",
    response_model=List[MemoryResponse],
)
def list_user_memories(
    agent_id: Optional[UUID] = Query(None, description="Filter by associated agent_id"),
    memory_type: Optional[str] = Query(None, description="Filter by memory_type (short_term, long_term, episodic)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MemoryResponse]:
    """List all memories belonging to current user."""
    return list_memories(
        db=db,
        owner_id=current_user.id,
        agent_id=agent_id,
        memory_type=memory_type,
    )


@router.post(
    "/search",
    response_model=List[MemorySearchResult],
)
def search_user_memories(
    search_query: MemorySearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MemorySearchResult]:
    """Perform semantic vector similarity search on current user's memories."""
    return search_memories(
        db=db,
        search_query=search_query,
        owner_id=current_user.id,
    )


@router.delete(
    "/short-term",
    status_code=status.HTTP_200_OK,
)
def clear_user_short_term_memories(
    agent_id: Optional[UUID] = Query(None, description="Optional agent_id filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear short-term memories for current user."""
    cleared_count = clear_short_term_memories(
        db=db,
        owner_id=current_user.id,
        agent_id=agent_id,
    )
    return {"message": "Short-term memories cleared", "cleared_count": cleared_count}


@router.get(
    "/{memory_id}",
    response_model=MemoryResponse,
)
def get_memory_by_id(
    memory_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemoryResponse:
    """Retrieve a single memory by ID."""
    memory = get_memory(
        db=db,
        memory_id=memory_id,
        owner_id=current_user.id,
    )

    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    return memory


@router.put(
    "/{memory_id}",
    response_model=MemoryResponse,
)
def update_existing_memory(
    memory_id: UUID,
    update_data: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemoryResponse:
    """Update a memory record by ID."""
    memory = get_memory(
        db=db,
        memory_id=memory_id,
        owner_id=current_user.id,
    )

    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    return update_memory(
        db=db,
        memory=memory,
        update_data=update_data,
    )


@router.delete(
    "/{memory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_memory(
    memory_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a memory record by ID."""
    memory = get_memory(
        db=db,
        memory_id=memory_id,
        owner_id=current_user.id,
    )

    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    delete_memory(
        db=db,
        memory=memory,
    )
