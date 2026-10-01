from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.core.logging import configure_logging
from app.db.session import SessionLocal
from app.services.admin_bootstrap import bootstrap_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()

    logger.info("Application starting")

    try:
        db = SessionLocal()
        bootstrap_admin(db)
        db.close()
    except Exception as e:
        logger.warning(f"Startup admin bootstrap warning: {e}")

    yield

    logger.info("Application shutting down")