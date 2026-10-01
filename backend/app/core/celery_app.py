import os
from celery import Celery
from app.core.config import settings

broker_url = os.getenv("CELERY_BROKER_URL", settings.celery_broker_url)
result_backend = os.getenv("CELERY_RESULT_BACKEND", settings.celery_result_backend)

celery_app = Celery(
    "agentic_tasks",
    broker=broker_url,
    backend=result_backend,
    include=["app.tasks.async_tasks"],
)

is_testing = os.getenv("TESTING", "false").lower() in ("true", "1")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_always_eager=is_testing,
    task_eager_propagates=is_testing,
)
