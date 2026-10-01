import json
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.multi_agent import AgentMessageLog, MultiAgentExecution
from app.orchestration.graph_engine import MultiAgentGraphEngine
from app.orchestration.state import MultiAgentState
from app.schemas.multi_agent import MultiAgentExecutionRequest


class MultiAgentOrchestrator:
    @staticmethod
    def create_and_execute_session(
        db: Session, user_id: uuid.UUID, req: MultiAgentExecutionRequest
    ) -> MultiAgentExecution:
        execution = MultiAgentExecution(
            user_id=user_id,
            objective=req.objective,
            status="pending",
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        state = MultiAgentState(
            execution_id=execution.id,
            user_id=user_id,
            objective=req.objective,
        )

        MultiAgentGraphEngine.run_graph(db=db, execution=execution, state=state)
        db.refresh(execution)
        return execution

    @staticmethod
    def list_executions(
        db: Session, user_id: uuid.UUID
    ) -> Sequence[MultiAgentExecution]:
        stmt = (
            select(MultiAgentExecution)
            .where(MultiAgentExecution.user_id == user_id)
            .order_by(MultiAgentExecution.created_at.desc())
        )
        return db.scalars(stmt).all()

    @staticmethod
    def get_execution(
        db: Session, execution_id: uuid.UUID, user_id: uuid.UUID
    ) -> MultiAgentExecution | None:
        stmt = select(MultiAgentExecution).where(
            MultiAgentExecution.id == execution_id,
            MultiAgentExecution.user_id == user_id,
        )
        return db.scalars(stmt).first()

    @staticmethod
    def get_execution_messages(
        db: Session, execution_id: uuid.UUID, user_id: uuid.UUID
    ) -> Sequence[AgentMessageLog]:
        # Verify ownership of parent execution first
        execution = MultiAgentOrchestrator.get_execution(db, execution_id, user_id)
        if not execution:
            return []

        stmt = (
            select(AgentMessageLog)
            .where(AgentMessageLog.execution_id == execution_id)
            .order_by(AgentMessageLog.created_at.asc())
        )
        return db.scalars(stmt).all()
