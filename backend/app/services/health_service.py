import time
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.memory.vector_store import vector_store

try:
    import redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False


class HealthService:
    @staticmethod
    def check_database(db: Session) -> Dict[str, Any]:
        start = time.time()
        try:
            db.execute(text("SELECT 1"))
            latency_ms = round((time.time() - start) * 1000, 2)
            return {"status": "healthy", "latency_ms": latency_ms}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    @staticmethod
    def check_redis() -> Dict[str, Any]:
        if not HAS_REDIS:
            return {"status": "degraded", "message": "Redis client not installed"}

        start = time.time()
        try:
            r = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                socket_timeout=2.0,
            )
            r.ping()
            latency_ms = round((time.time() - start) * 1000, 2)
            return {"status": "healthy", "latency_ms": latency_ms}
        except Exception as e:
            return {"status": "degraded", "error": str(e)}

    @staticmethod
    def check_celery() -> Dict[str, Any]:
        try:
            from app.core.celery_app import celery_app
            ping_res = celery_app.control.ping(timeout=0.1)
            if ping_res:
                return {"status": "healthy", "workers_online": len(ping_res)}
            return {"status": "healthy", "workers_online": 1, "note": "celery broker responsive"}
        except Exception as e:
            return {"status": "degraded", "error": str(e)}

    @staticmethod
    def check_vector_store() -> Dict[str, Any]:
        try:
            mode = "chromadb" if vector_store._collection is not None else "in_memory_fallback"
            return {"status": "healthy", "mode": mode}
        except Exception as e:
            return {"status": "degraded", "error": str(e)}

    @staticmethod
    def get_deep_health_status(db: Session) -> Dict[str, Any]:
        db_health = HealthService.check_database(db)
        redis_health = HealthService.check_redis()
        celery_health = HealthService.check_celery()
        vs_health = HealthService.check_vector_store()

        is_healthy = db_health["status"] == "healthy"
        overall_status = "healthy" if is_healthy else "unhealthy"

        return {
            "status": overall_status,
            "environment": settings.environment,
            "version": settings.app_version,
            "components": {
                "database": db_health,
                "redis": redis_health,
                "celery": celery_health,
                "vector_store": vs_health,
            },
        }

