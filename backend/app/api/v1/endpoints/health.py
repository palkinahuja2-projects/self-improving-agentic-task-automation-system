from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.metrics import get_metrics_response
from app.db.session import get_db
from app.services.health_service import HealthService

router = APIRouter(tags=["Health & Telemetry"])


@router.get("/health")
def deep_health_check(db: Session = Depends(get_db)):
    """Deep component health check verifying database, redis, celery, and vector store."""
    health_report = HealthService.get_deep_health_status(db)
    if health_report["status"] != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_report,
        )
    return health_report


@router.get("/health/liveness")
def liveness_probe():
    """Liveness probe for container orchestration."""
    return {"status": "alive", "timestamp_ms": round(settings.app_version.__hash__() % 1000, 2)}


@router.get("/health/readiness")
def readiness_probe(db: Session = Depends(get_db)):
    """Readiness probe verifying core database availability."""
    db_check = HealthService.check_database(db)
    if db_check["status"] != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "database": db_check},
        )
    return {"status": "ready", "database": db_check}


@router.get("/metrics")
def metrics_endpoint():
    """Prometheus metrics telemetry export endpoint."""
    return get_metrics_response()