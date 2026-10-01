# System Architecture & Technical Specification

The **Self-Improving Agentic Task Automation System** is an enterprise-grade autonomous agent platform featuring dual-layer memory storage, Celery background automation, LangGraph stateful multi-agent orchestration, closed-loop performance self-improvement, and observability.

---

## 1. System Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            API ENDPOINT LAYER                           │
 │     /auth • /agents • /memories • /tasks • /workflows • /multi-agent    │
 │                /self-improvement • /health • /metrics                   │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
 ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
 │ Agent System &    │      │ Memory System     │      │ Multi-Agent       │
 │ Dynamic Registry  │      │ PostgreSQL +      │      │ Stateful Graph    │
 │ (Role & Tool Auth)│      │ Chroma Vector DB  │      │ Orchestrator      │
 └─────────┬─────────┘      └─────────┬─────────┘      └─────────┬─────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                         SELF-IMPROVEMENT ENGINE                         │
 │ Evaluation ──► Feedback Analysis ──► Strategy Proposal ──► Versioning   │
 │           ──► Performance Experiment ──► Rollback Safety Guard          │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Platform Component Breakdown

### A. Authentication & User Isolation
- **JWT Authentication** (`PyJWT` / `python-jose`) with bcrypt password hashing (`passlib`/`argon2`).
- **Multi-Tenant Security Enforcement**: All API requests validate ownership (`user_id == current_user.id`). Cross-tenant access attempts return `404 Not Found`.

### B. Core Agent System
- **Agent Registry** (`AgentRegistry`): Dynamic agent discovery by `role` (`planner`, `researcher`, `analyst`, `executor`, `reviewer`, `coordinator`) and JSON capability tags.

### C. Hybrid Memory Architecture
- **PostgreSQL**: Relational storage for short-term, long-term, and episodic memory metadata.
- **ChromaDB**: Vector store for cosine similarity semantic memory search, with in-memory fallback.

### D. Task & Workflow Automation Engine
- **Celery Workers + Redis**: Asynchronous background task queue processing.
- **DAG Workflow Engine**: Acyclic multi-step node graph evaluation (`agent_task`, `condition`, `delay`, `transform`).

### E. Multi-Agent Orchestration
- **StateGraph Execution Pipeline**: Multi-stage graph orchestration (Planner decomposition -> Coordinator dispatch -> Specialized execution -> Reviewer validation -> Aggregator synthesis).
- **Inter-Agent Message Protocol**: Structured message logging (`delegation`, `request`, `response`, `feedback`).

### F. Self-Improvement System
- **Closed Loop**: `Execute -> Evaluate -> Analyze Feedback -> Formulate Proposal -> Snapshot Version -> Experiment -> Compare & Promote / Rollback`.

### G. Telemetry, Observability & Security
- **Correlation ID Tracing**: `X-Request-ID` attached to all logs & responses.
- **Prometheus Telemetry**: `/metrics` endpoint collecting request latency, error counts, execution throughput.
- **Grafana Dashboards**: Real-time visualization dashboard on port `3000`.
- **Security Middleware**: HSTS, X-Content-Type-Options, X-Frame-Options, XSS Protection, and Rate Limiting.

---

## 3. Complete API Endpoint Sitemap (`/api/v1`)

- **Authentication**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- **Agents**: `POST /agents`, `GET /agents`, `GET /agents/{id}`, `PUT /agents/{id}`, `DELETE /agents/{id}`
- **Memory**: `POST /memories`, `GET /memories`, `GET /memories/{id}`, `PUT /memories/{id}`, `DELETE /memories/{id}`, `POST /memories/search`
- **Tasks**: `POST /tasks`, `GET /tasks`, `GET /tasks/{id}`, `PUT /tasks/{id}`, `DELETE /tasks/{id}`, `POST /tasks/{id}/execute`, `POST /tasks/{id}/cancel`, `GET /tasks/{id}/history`
- **Workflows**: `POST /workflows`, `GET /workflows`, `GET /workflows/{id}`, `PUT /workflows/{id}`, `DELETE /workflows/{id}`, `POST /workflows/{id}/nodes`, `PUT /workflows/{id}/nodes/{id}`, `DELETE /workflows/{id}/nodes/{id}`, `POST /workflows/{id}/activate`, `POST /workflows/{id}/deactivate`, `POST /workflows/{id}/execute`, `GET /workflows/{id}/history`
- **Multi-Agent**: `POST /multi-agent/execute`, `GET /multi-agent/executions`, `GET /multi-agent/executions/{id}`, `GET /multi-agent/executions/{id}/messages`
- **Self-Improvement**: `POST /self-improvement/evaluate`, `GET /self-improvement/evaluations/{target_id}`, `POST /self-improvement/proposals`, `GET /self-improvement/proposals`, `POST /self-improvement/proposals/{id}/apply`, `POST /self-improvement/agents/{id}/rollback/{ver}`, `GET /self-improvement/agents/{id}/versions`, `POST /self-improvement/experiments/run`
- **Health & Telemetry**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`, `GET /metrics`
- **Admin System (`/admin`)**: `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/users/{user_id}`, `PUT /admin/users/{user_id}/status`, `PUT /admin/users/{user_id}/role`, `GET /admin/agents`, `GET /admin/tasks`, `GET /admin/workflows`, `GET /admin/multi-agent/executions`, `GET /admin/self-improvement`, `GET /admin/audit-logs`, `GET /admin/security-events`, `GET /admin/system-health`, `GET /admin/system-metrics`

---

## 4. Administration & RBAC Security Model

### A. Server-Side Authorization (`require_admin`)
All administrative requests are strictly validated on the backend. The `require_admin` dependency verifies:
1. Valid JWT Access Token in the `Authorization: Bearer <token>` header.
2. Active user status (`is_active == True`).
3. Administrative privileges (`role == "admin"` OR `is_superuser == True`).

### B. Frontend Route Protection (`AdminGuard`)
The Next.js client enforces `AdminGuard` on all `/admin/*` routes. Unauthenticated users are redirected to `/login`, and authenticated non-admin users attempting to access `/admin/*` receive an access denied card.

### C. Audit Trail Logging (`AuditLog`)
Security-sensitive administrative mutations (`USER_ROLE_CHANGE`, `USER_STATUS_CHANGE`, `ADMIN_LOGIN`) trigger immutable audit log entries recording actor identity, action type, resource ID, and timestamp while redacting secrets.

