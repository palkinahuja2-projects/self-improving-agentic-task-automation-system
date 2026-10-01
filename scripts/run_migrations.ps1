# Helper script to execute Alembic migration commands inside the backend Docker container
param (
    [Parameter(Position=0)]
    [string]$Action = "upgrade head"
)

Write-Host "Executing Alembic in backend container: alembic $Action" -ForegroundColor Cyan
docker compose exec backend alembic $Action
