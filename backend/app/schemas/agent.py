from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AgentBase(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )
    description: str | None = None
    agent_type: str = Field(
        default="general",
        max_length=50,
    )
    role: str = Field(
        default="executor",
        max_length=50,
    )
    capabilities: str | None = None
    model_config_json: str | None = None
    tools_config: str | None = None
    is_active: bool = True


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    description: str | None = None
    agent_type: str | None = Field(
        default=None,
        max_length=50,
    )
    role: str | None = Field(
        default=None,
        max_length=50,
    )
    capabilities: str | None = None
    model_config_json: str | None = None
    tools_config: str | None = None
    is_active: bool | None = None


class AgentResponse(AgentBase):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime