import json
from uuid import UUID
from sqlalchemy.orm import Session
from loguru import logger

from app.models.audit_log import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    user_id: UUID | None = None,
    username: str | None = None,
    resource_id: str | None = None,
    status: str = "success",
    ip_address: str | None = None,
    details: dict | None = None,
) -> AuditLog:
    """
    Log an administrative or security audit event into DB safely.
    NEVER logs passwords, password hashes, JWT tokens, or secret keys.
    """
    safe_details_str = None
    if details:
        # Sanitize sensitive fields if present
        sanitized = {
            k: ("***" if k.lower() in ("password", "password_hash", "token", "secret", "authorization") else v)
            for k, v in details.items()
        }
        try:
            safe_details_str = json.dumps(sanitized)
        except Exception:
            safe_details_str = str(sanitized)

    audit_entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        status=status,
        ip_address=ip_address,
        details_json=safe_details_str,
    )

    try:
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to record audit log: {e}")

    return audit_entry
