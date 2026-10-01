import re
import sys
from loguru import logger

from app.core.config import settings
from app.middleware.tracing import get_request_id

SENSITIVE_PATTERNS = [
    (r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*", r"\1[REDACTED]"),
    (r'("password"\s*:\s*")([^"]+)(")', r'\1[REDACTED]\3'),
    (r'("secret"\s*:\s*")([^"]+)(")', r'\1[REDACTED]\3'),
    (r'("access_token"\s*:\s*")([^"]+)(")', r'\1[REDACTED]\3'),
]


def redact_sensitive_text(text: str) -> str:
    for pattern, repl in SENSITIVE_PATTERNS:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


def patch_record(record):
    req_id = get_request_id()
    record["extra"]["req_id"] = f" [{req_id[:8]}]" if req_id else ""
    record["message"] = redact_sensitive_text(record["message"])


def configure_logging() -> None:
    logger.remove()
    log_level = "DEBUG" if settings.debug else "INFO"

    logger.configure(patcher=patch_record)

    logger.add(
        sys.stdout,
        level=log_level,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level>{extra[req_id]} | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        colorize=True,
    )


# Specialized component loggers for telemetry context
agent_logger = logger.bind(component="agent")
task_logger = logger.bind(component="task")
workflow_logger = logger.bind(component="workflow")
multi_agent_logger = logger.bind(component="multi_agent")
memory_logger = logger.bind(component="memory")
self_improvement_logger = logger.bind(component="self_improvement")