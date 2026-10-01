from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


def create_refresh_token_record(
    db: Session,
    user_id,
    token: str,
    expires_at: datetime,
) -> RefreshToken:
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        is_revoked=False,
    )

    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return refresh_token


def get_refresh_token(
    db: Session,
    token: str,
) -> RefreshToken | None:
    return db.scalar(
        select(RefreshToken).where(
            RefreshToken.token == token
        )
    )


def revoke_refresh_token(
    db: Session,
    token: str,
) -> bool:
    refresh_token = get_refresh_token(db, token)

    if not refresh_token:
        return False

    refresh_token.is_revoked = True
    db.commit()

    return True


def is_refresh_token_valid(
    refresh_token: RefreshToken,
) -> bool:
    now = datetime.now(timezone.utc)

    return (
        not refresh_token.is_revoked
        and refresh_token.expires_at > now
    )