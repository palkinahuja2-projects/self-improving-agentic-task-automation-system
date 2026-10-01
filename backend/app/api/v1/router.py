from fastapi import APIRouter

from app.api.v1.endpoints import (
    agents,
    auth,
    health,
    memories,
    multi_agent,
    self_improvement,
    tasks,
    workflows,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(agents.router)
api_router.include_router(memories.router)
api_router.include_router(tasks.router)
api_router.include_router(workflows.router)
api_router.include_router(multi_agent.router)
api_router.include_router(self_improvement.router)