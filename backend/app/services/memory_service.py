import json
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.memory.vector_store import vector_store
from app.models.memory import Memory
from app.schemas.memory import (
    MemoryCreate,
    MemorySearchQuery,
    MemorySearchResult,
    MemoryUpdate,
)
from app.services.embedding_service import embedding_service


def create_memory(
    db: Session,
    memory_data: MemoryCreate,
    owner_id: UUID,
) -> Memory:
    """Create a memory record in PostgreSQL and upsert its vector into ChromaDB."""
    metadata_json_str = (
        json.dumps(memory_data.metadata) if memory_data.metadata else None
    )

    memory = Memory(
        user_id=owner_id,
        agent_id=memory_data.agent_id,
        content=memory_data.content,
        memory_type=memory_data.memory_type,
        metadata_json=metadata_json_str,
        importance_score=memory_data.importance_score,
    )

    db.add(memory)
    db.commit()
    db.refresh(memory)

    # Generate vector embedding and store in ChromaDB
    embedding = embedding_service.generate_embedding(memory.content)
    vector_store.add_vector(
        memory_id=str(memory.id),
        embedding=embedding,
        metadata={
            "user_id": str(owner_id),
            "agent_id": str(memory.agent_id) if memory.agent_id else "",
            "memory_type": memory.memory_type,
            "importance_score": memory.importance_score,
        },
        document_text=memory.content,
    )

    return memory


def get_memory(
    db: Session,
    memory_id: UUID,
    owner_id: UUID,
) -> Optional[Memory]:
    """Retrieve a single memory owned by owner_id."""
    return db.scalar(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.user_id == owner_id,
        )
    )


def list_memories(
    db: Session,
    owner_id: UUID,
    agent_id: Optional[UUID] = None,
    memory_type: Optional[str] = None,
) -> List[Memory]:
    """List memories belonging to owner_id, with optional agent_id and memory_type filters."""
    query = select(Memory).where(Memory.user_id == owner_id)

    if agent_id is not None:
        query = query.where(Memory.agent_id == agent_id)

    if memory_type is not None:
        query = query.where(Memory.memory_type == memory_type)

    query = query.order_by(Memory.created_at.desc())
    return list(db.scalars(query).all())


def search_memories(
    db: Session,
    search_query: MemorySearchQuery,
    owner_id: UUID,
) -> List[MemorySearchResult]:
    """Perform semantic vector similarity search and retrieve corresponding PostgreSQL records."""
    query_vector = embedding_service.generate_embedding(search_query.query)

    agent_id_str = str(search_query.agent_id) if search_query.agent_id else None

    # Search ChromaDB
    similar_matches = vector_store.query_similar(
        query_embedding=query_vector,
        user_id=str(owner_id),
        agent_id=agent_id_str,
        memory_type=search_query.memory_type,
        limit=search_query.limit,
        min_similarity=search_query.min_similarity,
    )

    if not similar_matches:
        return []

    # Map memory_id to similarity score
    score_map = {mid: score for mid, score in similar_matches}
    uuid_list = []
    for mid, _ in similar_matches:
        try:
            uuid_list.append(UUID(mid))
        except ValueError:
            pass

    if not uuid_list:
        return []

    # Fetch corresponding records from PostgreSQL
    records = list(
        db.scalars(
            select(Memory).where(
                Memory.id.in_(uuid_list),
                Memory.user_id == owner_id,
            )
        ).all()
    )

    # Build results sorted by similarity score
    results = []
    for record in records:
        score = score_map.get(str(record.id), 0.0)
        results.append(
            MemorySearchResult(
                memory=record,  # Pydantic will convert from attributes
                score=round(score, 4),
            )
        )

    results.sort(key=lambda r: r.score, reverse=True)
    return results


def update_memory(
    db: Session,
    memory: Memory,
    update_data: MemoryUpdate,
) -> Memory:
    """Update a memory record in PostgreSQL and update vector store if content changed."""
    content_changed = False

    if update_data.content is not None:
        memory.content = update_data.content
        content_changed = True

    if update_data.memory_type is not None:
        memory.memory_type = update_data.memory_type

    if update_data.importance_score is not None:
        memory.importance_score = update_data.importance_score

    if update_data.metadata is not None:
        memory.metadata_json = json.dumps(update_data.metadata)

    db.commit()
    db.refresh(memory)

    # Update vector store record
    embedding = embedding_service.generate_embedding(memory.content)
    vector_store.add_vector(
        memory_id=str(memory.id),
        embedding=embedding,
        metadata={
            "user_id": str(memory.user_id),
            "agent_id": str(memory.agent_id) if memory.agent_id else "",
            "memory_type": memory.memory_type,
            "importance_score": memory.importance_score,
        },
        document_text=memory.content,
    )

    return memory


def delete_memory(
    db: Session,
    memory: Memory,
) -> None:
    """Delete a memory record from PostgreSQL and ChromaDB."""
    memory_id_str = str(memory.id)
    db.delete(memory)
    db.commit()
    vector_store.delete_vector(memory_id_str)


def clear_short_term_memories(
    db: Session,
    owner_id: UUID,
    agent_id: Optional[UUID] = None,
) -> int:
    """Clear short-term memories for a user and optional agent."""
    query = select(Memory).where(
        Memory.user_id == owner_id,
        Memory.memory_type == "short_term",
    )
    if agent_id is not None:
        query = query.where(Memory.agent_id == agent_id)

    short_memories = list(db.scalars(query).all())
    count = len(short_memories)

    for mem in short_memories:
        vector_store.delete_vector(str(mem.id))
        db.delete(mem)

    db.commit()
    return count
