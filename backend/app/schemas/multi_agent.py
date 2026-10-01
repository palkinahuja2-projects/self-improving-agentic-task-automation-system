from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SubTaskSchema(BaseModel):
    id: str = Field(default_factory=lambda: str(UUID(int=0)))
    title: str
    assigned_role: str
    assigned_agent_id: UUID | None = None
    input_data: str | None = None
    status: str = Field(default="pending")
    output: str | None = None
    on_failure: str = Field(default="retry")


class AgentMessageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    execution_id: UUID
    sender_agent_id: UUID | None = None
    receiver_agent_id: UUID | None = None
    sender_role: str
    receiver_role: str
    message_type: str
    payload: str | None = None
    correlation_id: str | None = None
    created_at: datetime


class MultiAgentExecutionRequest(BaseModel):
    objective: str = Field(min_length=1)
    initial_input: str | None = None
    required_roles: list[str] = Field(default=["planner", "researcher", "executor", "reviewer"])


class MultiAgentExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    objective: str
    status: str
    plan_json: str | None = None
    final_result: str | None = None
    error_message: str | None = None
    duration_ms: float | None = None
    created_at: datetime
    updated_at: datetime
