from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    agent_id: UUID | None = None
    workflow_id: UUID | None = None
    priority: str = Field(default="medium")
    input_data: str | None = None
    scheduled_at: datetime | None = None
    cron_expression: str | None = None
    max_retries: int = Field(default=3, ge=0)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    agent_id: UUID | None = None
    workflow_id: UUID | None = None
    priority: str | None = None
    input_data: str | None = None
    status: str | None = None
    scheduled_at: datetime | None = None
    cron_expression: str | None = None
    max_retries: int | None = Field(default=None, ge=0)


class TaskExecuteRequest(BaseModel):
    input_data: str | None = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: str
    output_data: str | None = None
    retry_count: int = 0
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
