#!/usr/bin/env bash
# Helper script to execute Alembic migration commands inside the backend Docker container
ACTION="${1:-upgrade head}"

echo "Executing Alembic in backend container: alembic $ACTION"
docker compose exec backend alembic $ACTION
