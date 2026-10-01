from collections.abc import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

def _create_db_engine():
    try:
        db_url = settings.sync_database_url
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to primary database.")
        from app.db.base import Base
        Base.metadata.create_all(bind=engine)
        return engine
    except Exception as e:
        logger.warning(
            "Primary database connection failed (%s). Falling back to SQLite local database.", e
        )
        fallback_url = "sqlite:///./agentic_automation.db"
        engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
        )
        from app.db.base import Base
        Base.metadata.create_all(bind=engine)
        return engine

engine = _create_db_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()