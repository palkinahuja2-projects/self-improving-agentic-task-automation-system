from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserResponse


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminUserRoleUpdate(BaseModel):
    role: str = Field(min_length=1, max_length=50)
    is_superuser: bool | None = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    timestamp: datetime
    user_id: UUID | None = None
    username: str | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    status: str
    ip_address: str | None = None
    details_json: str | None = None


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_agents: int
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    total_workflows: int
    total_multi_agent_executions: int
    total_self_improvement_proposals: int
    total_audit_logs: int


class SystemMetricsResponse(BaseModel):
    uptime_seconds: float
    total_api_requests: int
    error_rate_percentage: float
    active_db_connections: int
    active_celery_tasks: int
    chroma_vector_count: int
