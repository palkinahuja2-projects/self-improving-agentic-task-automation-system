import uuid

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.tasks.execution_engine import TaskExecutionEngine
from app.tasks.workflow_engine import WorkflowExecutionEngine


@celery_app.task(name="app.tasks.run_task_async")
def run_task_async(task_id_str: str, user_id_str: str, input_data: str | None = None) -> dict:
    task_id = uuid.UUID(task_id_str)
    user_id = uuid.UUID(user_id_str)

    db = SessionLocal()
    try:
        task = TaskExecutionEngine.execute_task(
            db=db,
            task_id=task_id,
            user_id=user_id,
            override_input=input_data,
        )
        return {
            "task_id": str(task.id),
            "status": task.status,
            "output_data": task.output_data,
            "error_message": task.error_message,
        }
    finally:
        db.close()


@celery_app.task(name="app.tasks.run_workflow_async")
def run_workflow_async(workflow_id_str: str, user_id_str: str, input_data: str | None = None) -> dict:
    workflow_id = uuid.UUID(workflow_id_str)
    user_id = uuid.UUID(user_id_str)

    db = SessionLocal()
    try:
        workflow = WorkflowExecutionEngine.execute_workflow(
            db=db,
            workflow_id=workflow_id,
            user_id=user_id,
            initial_input=input_data,
        )
        return {
            "workflow_id": str(workflow.id),
            "status": workflow.status,
        }
    finally:
        db.close()
