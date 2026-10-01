from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ExecutionHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    task_id: UUID | None = None
    workflow_id: UUID | None = None
    workflow_node_id: UUID | None = None
    status: str
    input_data: str | None = None
    output_data: str | None = None
    error_message: str | None = None
    retry_count: int = 0
    duration_ms: float | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
