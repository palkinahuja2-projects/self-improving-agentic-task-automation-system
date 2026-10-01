import json
import time
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.execution import ExecutionHistory
from app.models.task import Task
from app.services.agent_service import (
    create_agent_memory,
    retrieve_agent_context_memories,
)


class TaskExecutionEngine:
    @staticmethod
    def execute_task(
        db: Session,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        override_input: str | None = None,
    ) -> Task:
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found for user {user_id}")

        input_data = override_input if override_input is not None else task.input_data

        start_time = time.time()
        started_at = datetime.now(timezone.utc)

        # Mark task and execution history as running
        task.status = "running"
        task.updated_at = started_at
        db.commit()

        history = ExecutionHistory(
            user_id=user_id,
            task_id=task.id,
            workflow_id=task.workflow_id,
            status="running",
            input_data=input_data,
            started_at=started_at,
        )
        db.add(history)
        db.commit()

        try:
            # 1. Recall Agent Context Memories if agent attached
            agent_context = []
            agent = None
            if task.agent_id:
                agent = db.query(Agent).filter(Agent.id == task.agent_id).first()
                if agent:
                    agent_context = retrieve_agent_context_memories(
                        db=db,
                        agent=agent,
                        query=input_data or task.title,
                        limit=3,
                    )

            # 2. Execute Task Logic
            context_str = "\n".join([str(m) for m in agent_context]) if agent_context else "None"
            agent_name = agent.name if agent else "General System Agent"

            output_content = (
                f"Completed task '{task.title}' using {agent_name}.\n"
                f"Input: {input_data or 'No input provided'}\n"
                f"Recalled Context Memories: {len(agent_context)} entries.\n"
                f"Result: Successfully processed task payload."
            )

            # 3. Store Episodic Memory of Execution
            if agent:
                create_agent_memory(
                    db=db,
                    agent=agent,
                    content=f"Task Execution Result for '{task.title}': {output_content}",
                    memory_type="episodic",
                )

            end_time = time.time()
            duration_ms = round((end_time - start_time) * 1000, 2)
            completed_at = datetime.now(timezone.utc)

            # Update Task
            task.status = "completed"
            task.output_data = output_content
            task.error_message = None
            task.updated_at = completed_at
            db.commit()

            # Update Execution History
            history.status = "completed"
            history.output_data = output_content
            history.duration_ms = duration_ms
            history.completed_at = completed_at
            db.commit()

            db.refresh(task)
            return task

        except Exception as e:
            end_time = time.time()
            duration_ms = round((end_time - start_time) * 1000, 2)
            completed_at = datetime.now(timezone.utc)

            error_msg = str(e)
            task.retry_count += 1
            task.error_message = error_msg
            task.updated_at = completed_at

            if task.retry_count < task.max_retries:
                task.status = "pending"  # Retry state
            else:
                task.status = "failed"

            db.commit()

            history.status = "failed"
            history.error_message = error_msg
            history.retry_count = task.retry_count
            history.duration_ms = duration_ms
            history.completed_at = completed_at
            db.commit()

            db.refresh(task)
            return task
