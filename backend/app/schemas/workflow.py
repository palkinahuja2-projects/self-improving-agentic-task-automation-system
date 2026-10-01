from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkflowNodeBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    node_type: str = Field(default="agent_task")
    agent_id: UUID | None = None
    step_order: int = Field(default=1, ge=1)
    config: str | None = None
    next_node_id: UUID | None = None
    on_failure: str = Field(default="stop")


class WorkflowNodeCreate(WorkflowNodeBase):
    pass


class WorkflowNodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    node_type: str | None = None
    agent_id: UUID | None = None
    step_order: int | None = Field(default=None, ge=1)
    config: str | None = None
    next_node_id: UUID | None = None
    on_failure: str | None = None


class WorkflowNodeResponse(WorkflowNodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    created_at: datetime
    updated_at: datetime


class WorkflowBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default="draft")
    configuration: str | None = None


class WorkflowCreate(WorkflowBase):
    nodes: list[WorkflowNodeCreate] = []


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
    configuration: str | None = None


class WorkflowExecuteRequest(BaseModel):
    input_data: str | None = None


class WorkflowResponse(WorkflowBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    nodes: list[WorkflowNodeResponse] = []
    created_at: datetime
    updated_at: datetime
