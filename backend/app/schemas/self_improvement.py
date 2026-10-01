from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EvaluationCreateRequest(BaseModel):
    target_type: str = Field(pattern="^(task|workflow|multi_agent)$")
    target_id: UUID
    execution_time_ms: float = Field(default=0.0, ge=0.0)
    success: bool = Field(default=True)
    error_count: int = Field(default=0, ge=0)
    retry_count: int = Field(default=0, ge=0)
    output_text: str | None = None
    reviewer_feedback: str | None = None


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    target_type: str
    target_id: UUID
    score: float
    execution_time_ms: float
    success: bool
    error_count: int
    retry_count: int
    output_quality_score: float
    weaknesses: str | None = None
    feedback_summary: str | None = None
    created_at: datetime


class ProposalCreateRequest(BaseModel):
    evaluation_id: UUID
    agent_id: UUID | None = None
    workflow_id: UUID | None = None


class ProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    evaluation_id: UUID
    agent_id: UUID | None = None
    workflow_id: UUID | None = None
    category: str
    title: str
    description: str | None = None
    proposed_changes: str
    status: str
    applied_version: int | None = None
    created_at: datetime
    updated_at: datetime


class AgentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    version_number: int
    name: str
    description: str | None = None
    agent_type: str
    role: str
    capabilities: str | None = None
    model_config_json: str | None = None
    tools_config: str | None = None
    change_summary: str | None = None
    is_active: bool
    created_at: datetime


class ExperimentRunRequest(BaseModel):
    proposal_id: UUID
    baseline_execution_id: UUID


class ExperimentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    proposal_id: UUID
    baseline_execution_id: UUID
    baseline_score: float
    candidate_execution_id: UUID | None = None
    candidate_score: float | None = None
    improvement_ratio: float | None = None
    outcome: str
    created_at: datetime

