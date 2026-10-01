from fastapi import FastAPI

from app.api.v1.endpoints import (
    admin,
    agents,
    auth,
    health,
    memories,
    multi_agent,
    self_improvement,
    tasks,
    workflows,
)
from app.core.config import settings
from app.core.lifespan import lifespan
from app.core.metrics import PrometheusMetricsMiddleware, get_metrics_response
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import RateLimiterMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.tracing import RequestTracingMiddleware


app = FastAPI(
    title=settings.app_name,
    description=(
        "An autonomous multi-agent AI platform with memory, "
        "workflows, and self-improvement capabilities."
    ),
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)


# Production Middlewares (CORSMiddleware configured last so it is outermost in ASGI stack)
app.add_middleware(RequestTracingMiddleware)
app.add_middleware(PrometheusMetricsMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware, max_requests=300, window_seconds=60)
setup_cors(app)


# ─────────────────────────────────────────────
# Endpoints / Routers
# ─────────────────────────────────────────────

app.include_router(
    admin.router,
    prefix="/api/v1",
)

app.include_router(
    auth.router,
    prefix="/api/v1",
)

app.include_router(
    health.router,
    prefix="/api/v1",
)

app.include_router(
    agents.router,
    prefix="/api/v1",
)

app.include_router(
    memories.router,
    prefix="/api/v1",
)

app.include_router(
    tasks.router,
    prefix="/api/v1",
)

app.include_router(
    workflows.router,
    prefix="/api/v1",
)

app.include_router(
    multi_agent.router,
    prefix="/api/v1",
)

app.include_router(
    self_improvement.router,
    prefix="/api/v1",
)



# ─────────────────────────────────────────────
# Root & Telemetry Metrics
# ─────────────────────────────────────────────

@app.get("/metrics")
async def metrics():
    return get_metrics_response()


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "environment": settings.environment,
        "status": "running",
    }