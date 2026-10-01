import uuid
from typing import Any
from pydantic import BaseModel, Field


class SubTaskState(BaseModel):
    id: str
    title: str
    assigned_role: str
    assigned_agent_id: str | None = None
    input_data: str | None = None
    status: str = "pending"
    output: str | None = None


class MultiAgentState(BaseModel):
    execution_id: uuid.UUID
    user_id: uuid.UUID
    objective: str
    plan: list[SubTaskState] = Field(default_factory=list)
    current_step_index: int = 0
    results: dict[str, Any] = Field(default_factory=dict)
    reviewer_feedback: str | None = None
    status: str = "pending"
    final_summary: str | None = None
    errors: list[str] = Field(default_factory=list)
