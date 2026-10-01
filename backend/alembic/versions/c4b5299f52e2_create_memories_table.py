"""create memories table

Revision ID: c4b5299f52e2
Revises: c3a4189e41d1
Create Date: 2026-09-16 14:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c4b5299f52e2"
down_revision: Union[str, Sequence[str], None] = "c3a4189e41d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "memories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "memory_type",
            sa.String(length=50),
            nullable=False,
            server_default="long_term",
        ),
        sa.Column(
            "metadata_json",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "importance_score",
            sa.Float(),
            nullable=False,
            server_default="1.0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["agent_id"],
            ["agents.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        "ix_memories_user_id",
        "memories",
        ["user_id"],
    )
    op.create_index(
        "ix_memories_agent_id",
        "memories",
        ["agent_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_memories_agent_id",
        table_name="memories",
    )
    op.drop_index(
        "ix_memories_user_id",
        table_name="memories",
    )
    op.drop_table("memories")
