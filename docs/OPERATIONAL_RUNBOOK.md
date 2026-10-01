# Operational Runbook & Production Guide

This runbook provides deployment instructions, configuration management, backup/recovery procedures, database migration guides, monitoring alert procedures, and troubleshooting steps for the **Self-Improving Agentic Task Automation System**.

---

## 1. Quick Start & Deployment

### Prerequisites
- Docker Engine 24.0+ and Docker Compose v2.20+
- Python 3.11+ (for local development)
- PostgreSQL 16+ & Redis 7+

### Launch Production Stack
```bash
# 1. Clone repository & navigate to root
git clone <repository_url>
cd Self-Improving-Agentic-Task-Automation-System

# 2. Build and start container services in background
docker compose build
docker compose up -d

# 3. Apply database migrations
docker compose exec backend alembic upgrade head

# 4. Verify deployment health
curl http://localhost:8000/api/v1/health
```

---

## 2. Infrastructure & Service Map

| Service | Container Name | Port | Description |
| :--- | :--- | :--- | :--- |
| **Backend API** | `agentic_backend` | `8000` | FastAPI application backend & REST endpoints |
| **Celery Worker** | `agentic_celery_worker` | N/A | Asynchronous task execution worker |
| **PostgreSQL DB** | `agentic_postgres` | `5432` | Relational storage for users, agents, tasks, workflows, evaluations |
| **Redis Broker** | `agentic_redis` | `6379` | Celery message broker & rate limiting storage |
| **Prometheus** | `agentic_prometheus` | `9090` | Telemetry & metrics collector |
| **Grafana** | `agentic_grafana` | `3000` | Real-time monitoring & visualization dashboard |

---

## 3. Database Migration Runbook

Alembic handles all PostgreSQL database schema migrations.

### Check Current Migration Status
```bash
docker compose exec backend alembic current
docker compose exec backend alembic check
```

### Apply New Migrations
```bash
docker compose exec backend alembic upgrade head
```

### Rollback Migration (1 step)
```bash
docker compose exec backend alembic downgrade -1
```

---

## 4. Backup & Disaster Recovery Procedures

### PostgreSQL Database Backup
```bash
# Export compressed timestamped database dump
docker exec -t agentic_postgres pg_dump -U agentic_user -d agentic_automation -F c -b -v -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump
docker cp agentic_postgres:/tmp/backup_*.dump ./backups/
```

### Database Restore Procedure
```bash
# Restore from dump file
docker cp ./backups/target_backup.dump agentic_postgres:/tmp/
docker exec -t agentic_postgres pg_restore -U agentic_user -d agentic_automation --clean /tmp/target_backup.dump
```

---

## 5. Monitoring, Telemetry & Dashboards

- **Health Probes**:
  - `GET /api/v1/health`: Deep component status (PostgreSQL, Redis, Celery, Vector Store).
  - `GET /api/v1/health/liveness`: Kubernetes/Docker liveness probe.
  - `GET /api/v1/health/readiness`: Database readiness probe.
- **Metrics**: `http://localhost:8000/metrics` or `http://localhost:9090` (Prometheus).
- **Grafana Dashboard**: Open `http://localhost:3000` (User: `admin`, Pass: `admin`). Access the pre-configured **Self-Improving Agentic System Overview** dashboard.

---

## 6. Troubleshooting & Incident Runbook

| Incident | Cause | Resolution |
| :--- | :--- | :--- |
| **Backend 500 Connection Timeout** | PostgreSQL container starting or unhealthy | Verify `docker ps`, run `docker compose logs db`, ensure port 5432 is clear. |
| **Celery Tasks Pending** | Redis broker offline or Celery worker dead | Restart Celery worker: `docker compose restart celery_worker`. |
| **Alembic Drift** | Unapplied schema revision | Run `docker compose exec backend alembic upgrade head`. |
| **ChromaDB Lock Error** | Concurrent process lock on sqlite chroma | Clear lock or restart backend container: `docker compose restart backend`. |

---

## 7. Administrative System & Emergency Management

### Admin Account Bootstrap & Seed
The default administrative account is initialized on lifespan startup. If manual bootstrap is required:

```bash
# Execute idempotent admin bootstrap script inside container
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.services.admin_bootstrap import bootstrap_admin; db = SessionLocal(); bootstrap_admin(db); db.close()"
```

### Emergency Admin Recovery
If the primary administrative account is locked out or demoted:

```bash
# Force-promote a user to admin role
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.query(User).filter(User.email == 'admin@local.dev').first(); u.role = 'admin'; u.is_superuser = True; u.is_active = True; db.commit(); db.close()"
```

### Audit Log Inspection
Administrative actions (`USER_ROLE_CHANGE`, `USER_STATUS_CHANGE`, `ADMIN_LOGIN`) are stored in the `audit_logs` table with sensitive details sanitized. To query security logs via CLI:

```bash
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.models.audit_log import AuditLog; db = SessionLocal(); logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all(); print('\n'.join([f'{l.timestamp} | {l.action} | {l.username} | {l.resource_id}' for l in logs]))"
```
| **API 503 Service Unavailable** | Database or Redis container down | Check `docker compose ps`. Restart database via `docker compose restart db`. |
| **Celery Tasks Pending** | Celery worker crash or broker disconnect | Inspect worker logs: `docker compose logs -f celery_worker`. Restart worker: `docker compose restart celery_worker`. |
| **Rate Limit 429 Too Many Requests** | Client exceeded 300 req/min threshold | Wait 60s or adjust `max_requests` setting in `main.py`. |
| **High API Latency (> 5s)** | Slow database query or Chroma vector query | Inspect Prometheus dashboard at `http://localhost:3000` for latency buckets. |

