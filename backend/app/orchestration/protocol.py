from datetime import datetime, timezone
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.multi_agent import AgentMessageLog


class AgentMessageProtocol:
    @staticmethod
    def create_and_log_message(
        db: Session,
        execution_id: uuid.UUID,
        sender_role: str,
        receiver_role: str,
        message_type: str,
        payload: Any,
        sender_agent_id: uuid.UUID | None = None,
        receiver_agent_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> AgentMessageLog:
        payload_str = payload if isinstance(payload, str) else str(payload)
        log = AgentMessageLog(
            execution_id=execution_id,
            sender_agent_id=sender_agent_id,
            receiver_agent_id=receiver_agent_id,
            sender_role=sender_role,
            receiver_role=receiver_role,
            message_type=message_type,
            payload=payload_str,
            correlation_id=correlation_id or str(uuid.uuid4())[:8],
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
