from fastapi import Depends, HTTPException, status

from app.api.dependencies import get_current_user
from app.models.user import User


def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Allow access only to administrators.
    """

    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


def require_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Allow access to regular users and administrators.
    """

    if current_user.role not in {"user", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return current_user