import json
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MemoryBase(BaseModel):
    content: str = Field(
        min_length=1,
        description="Text content of the memory",
    )

    memory_type: str = Field(
        default="long_term",
        max_length=50,
        description="Type of memory: short_term, long_term, or episodic",
    )

    importance_score: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Importance weight of the memory (0.0 to 1.0)",
    )

    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Arbitrary structured metadata tags",
    )


class MemoryCreate(MemoryBase):
    agent_id: UUID | None = Field(
        default=None,
        description="Optional ID of the associated agent",
    )


class MemoryUpdate(BaseModel):
    content: str | None = Field(
        default=None,
        min_length=1,
    )

    memory_type: str | None = Field(
        default=None,
        max_length=50,
    )

    importance_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    metadata: dict[str, Any] | None = None


class MemoryResponse(MemoryBase):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    user_id: UUID
    agent_id: UUID | None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def extract_metadata(cls, data: Any) -> Any:
        if hasattr(data, "metadata_json"):
            raw_meta = getattr(data, "metadata_json")
            parsed_meta = None
            if isinstance(raw_meta, str) and raw_meta.strip():
                try:
                    parsed_meta = json.loads(raw_meta)
                except Exception:
                    parsed_meta = None
            elif isinstance(raw_meta, dict):
                parsed_meta = raw_meta

            return {
                "id": getattr(data, "id"),
                "user_id": getattr(data, "user_id"),
                "agent_id": getattr(data, "agent_id"),
                "content": getattr(data, "content"),
                "memory_type": getattr(data, "memory_type"),
                "importance_score": getattr(data, "importance_score"),
                "metadata": parsed_meta,
                "created_at": getattr(data, "created_at"),
                "updated_at": getattr(data, "updated_at"),
            }
        return data


class MemorySearchQuery(BaseModel):
    query: str = Field(
        min_length=1,
        description="Natural language query for semantic vector search",
    )

    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of memories to return",
    )

    memory_type: str | None = Field(
        default=None,
        description="Optional filter by memory_type",
    )

    agent_id: UUID | None = Field(
        default=None,
        description="Optional filter by agent_id",
    )

    min_similarity: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Minimum relevance similarity threshold",
    )


class MemorySearchResult(BaseModel):
    memory: MemoryResponse
    score: float = Field(
        description="Relevance similarity score (0.0 to 1.0)",
    )
