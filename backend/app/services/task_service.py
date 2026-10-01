from datetime import datetime, timezone
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import ExecutionHistory
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    @staticmethod
    def create_task(db: Session, user_id: uuid.UUID, task_in: TaskCreate) -> Task:
        task = Task(
            user_id=user_id,
            agent_id=task_in.agent_id,
            workflow_id=task_in.workflow_id,
            title=task_in.title,
            description=task_in.description,
            priority=task_in.priority,
            input_data=task_in.input_data,
            scheduled_at=task_in.scheduled_at,
            cron_expression=task_in.cron_expression,
            max_retries=task_in.max_retries,
            status="pending",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_task(db: Session, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
        stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        return db.scalars(stmt).first()

    @staticmethod
    def list_tasks(
        db: Session, user_id: uuid.UUID, status: str | None = None
    ) -> Sequence[Task]:
        stmt = select(Task).where(Task.user_id == user_id)
        if status:
            stmt = stmt.where(Task.status == status)
        stmt = stmt.order_by(Task.created_at.desc())
        return db.scalars(stmt).all()

    @staticmethod
    def update_task(
        db: Session, task: Task, task_in: TaskUpdate
    ) -> Task:
        update_data = task_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete_task(db: Session, task: Task) -> None:
        db.delete(task)
        db.commit()

    @staticmethod
    def cancel_task(db: Session, task: Task) -> Task:
        task.status = "cancelled"
        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)

        # Record cancellation in execution history
        history = ExecutionHistory(
            user_id=task.user_id,
            task_id=task.id,
            status="cancelled",
            error_message="Task execution was manually cancelled by user.",
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(history)
        db.commit()
        return task

    @staticmethod
    def get_task_history(
        db: Session, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> Sequence[ExecutionHistory]:
        stmt = (
            select(ExecutionHistory)
            .where(ExecutionHistory.task_id == task_id, ExecutionHistory.user_id == user_id)
            .order_by(ExecutionHistory.created_at.desc())
        )
        return db.scalars(stmt).all()
