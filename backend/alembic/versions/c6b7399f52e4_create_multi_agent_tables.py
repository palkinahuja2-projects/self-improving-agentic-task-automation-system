"""create multi agent tables and extend agents table

Revision ID: c6b7399f52e4
Revises: c5a6299f52e3
Create Date: 2026-09-16 22:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c6b7399f52e4"
down_revision: Union[str, Sequence[str], None] = "c5a6299f52e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extend agents table
    op.add_column("agents", sa.Column("role", sa.String(length=50), nullable=False, server_default="executor"))
    op.add_column("agents", sa.Column("capabilities", sa.Text(), nullable=True))
    op.add_column("agents", sa.Column("model_config_json", sa.Text(), nullable=True))
    op.add_column("agents", sa.Column("tools_config", sa.Text(), nullable=True))
    op.create_index("ix_agents_role", "agents", ["role"])

    # 2. Create multi_agent_executions table
    op.create_table(
        "multi_agent_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("plan_json", sa.Text(), nullable=True),
        sa.Column("final_result", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_multi_agent_executions_user_id", "multi_agent_executions", ["user_id"])
    op.create_index("ix_multi_agent_executions_status", "multi_agent_executions", ["status"])

    # 3. Create agent_message_logs table
    op.create_table(
        "agent_message_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("execution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_agent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("receiver_agent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sender_role", sa.String(length=50), nullable=False),
        sa.Column("receiver_role", sa.String(length=50), nullable=False),
        sa.Column("message_type", sa.String(length=50), nullable=False, server_default="request"),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("correlation_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["execution_id"], ["multi_agent_executions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_agent_id"], ["agents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["receiver_agent_id"], ["agents.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_agent_message_logs_execution_id", "agent_message_logs", ["execution_id"])


def downgrade() -> None:
    op.drop_table("agent_message_logs")
    op.drop_table("multi_agent_executions")
    op.drop_index("ix_agents_role", table_name="agents")
    op.drop_column("agents", "tools_config")
    op.drop_column("agents", "model_config_json")
    op.drop_column("agents", "capabilities")
    op.drop_column("agents", "role")
