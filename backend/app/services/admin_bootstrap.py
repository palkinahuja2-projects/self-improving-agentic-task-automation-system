from sqlalchemy import select
from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def bootstrap_admin(db: Session) -> User | None:
    """
    Idempotent admin user creation mechanism.
    If an admin user exists (role == 'admin' or email == admin_email), returns existing admin.
    Otherwise, creates the admin user safely without logging sensitive passwords.
    """
    try:
        # Check if an admin user already exists
        existing_admin = db.scalar(
            select(User).where(
                (User.role == "admin") | (User.is_superuser == True) | (User.email == settings.admin_email)
            )
        )
        if existing_admin:
            # Ensure existing admin has role='admin' and is_superuser=True
            if existing_admin.role != "admin" or not existing_admin.is_superuser:
                existing_admin.role = "admin"
                existing_admin.is_superuser = True
                db.commit()
                db.refresh(existing_admin)
                logger.info(f"Promoted existing user {existing_admin.email} to admin role.")
            return existing_admin

        # Create new default development admin user
        admin_user = User(
            email=settings.admin_email,
            username="admin",
            password_hash=hash_password(settings.admin_password),
            first_name="System",
            last_name="Administrator",
            role="admin",
            is_active=True,
            is_verified=True,
            is_superuser=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        logger.info(f"Admin bootstrap completed successfully. Created admin user: {settings.admin_email}")
        return admin_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error during admin bootstrap: {e}")
        return None
