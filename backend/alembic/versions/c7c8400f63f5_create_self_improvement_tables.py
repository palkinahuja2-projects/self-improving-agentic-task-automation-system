"""create self improvement tables

Revision ID: c7c8400f63f5
Revises: c6b7399f52e4
Create Date: 2026-09-16 22:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c7c8400f63f5"
down_revision: Union[str, Sequence[str], None] = "c6b7399f52e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. execution_evaluations
    op.create_table(
        "execution_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("execution_time_ms", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_quality_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("weaknesses", sa.Text(), nullable=True),
        sa.Column("feedback_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_execution_evaluations_user_id", "execution_evaluations", ["user_id"])
    op.create_index("ix_execution_evaluations_target_type", "execution_evaluations", ["target_type"])
    op.create_index("ix_execution_evaluations_target_id", "execution_evaluations", ["target_id"])

    # 2. improvement_proposals
    op.create_table(
        "improvement_proposals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("evaluation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("proposed_changes", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="proposed"),
        sa.Column("applied_version", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evaluation_id"], ["execution_evaluations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflows.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_improvement_proposals_user_id", "improvement_proposals", ["user_id"])
    op.create_index("ix_improvement_proposals_evaluation_id", "improvement_proposals", ["evaluation_id"])
    op.create_index("ix_improvement_proposals_agent_id", "improvement_proposals", ["agent_id"])
    op.create_index("ix_improvement_proposals_workflow_id", "improvement_proposals", ["workflow_id"])
    op.create_index("ix_improvement_proposals_status", "improvement_proposals", ["status"])

    # 3. agent_versions
    op.create_table(
        "agent_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("agent_type", sa.String(length=50), nullable=False, server_default="general"),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="executor"),
        sa.Column("capabilities", sa.Text(), nullable=True),
        sa.Column("model_config_json", sa.Text(), nullable=True),
        sa.Column("tools_config", sa.Text(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_agent_versions_agent_id", "agent_versions", ["agent_id"])

    # 4. performance_experiments
    op.create_table(
        "performance_experiments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("baseline_execution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("baseline_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("candidate_execution_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("candidate_score", sa.Float(), nullable=True),
        sa.Column("improvement_ratio", sa.Float(), nullable=True),
        sa.Column("outcome", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["proposal_id"], ["improvement_proposals.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_performance_experiments_user_id", "performance_experiments", ["user_id"])
    op.create_index("ix_performance_experiments_proposal_id", "performance_experiments", ["proposal_id"])


def downgrade() -> None:
    op.drop_table("performance_experiments")
    op.drop_table("agent_versions")
    op.drop_table("improvement_proposals")
    op.drop_table("execution_evaluations")

