# Self-Improving Agentic Task Automation System

An autonomous multi-agent AI platform featuring long-term vector memory, dynamic workflow engine pipelines, interactive team orchestrations, self-improvement evaluation loops, complete RBAC administration, and enterprise observability.

---

## 🎯 Overview & Problem Statement

Modern AI automation requires more than simple single-prompt calls. Complex enterprise workflows demand continuous learning, execution resilience, cross-agent coordination, persistent memory, and strict administrative oversight. 

The **Self-Improving Agentic Task Automation System** addresses this by providing a unified full-stack platform:
- **Autonomous Multi-Agent Teams:** Orchestrate specialised agents (Planner, Researcher, Analyst, Executor, Reviewer) working in sync.
- **Dynamic Workflow Pipelines:** Graph-based topology execution engine powered by React Flow.
- **Persistent Long-Term Memory:** Semantic vector embedding memory backed by ChromaDB with cosine distance indexing.
- **Self-Improvement Engine:** Automatic execution trace evaluation, proposal generation, versioning, and policy optimization.
- **Full-Stack Administration:** Server-side RBAC, user management, audit logging, security controls, and Prometheus/Grafana telemetry.

---

## 🏗️ Production Deployment Architecture

```
                       +-------------------------+
                       |   GitHub Repository     |
                       |  (Main Branch CI/CD)    |
                       +------------+------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+------------------+                                +-------------------+
|  Vercel Hosting  |                                |  Railway Cloud    |
|                  |                                |                   |
|  Next.js 15      |  === HTTPS / API Requests ===> |  FastAPI Async    |
|  Frontend Portal |                                |  Backend Service  |
+------------------+                                +---------+---------+
                                                              |
                                      +-----------------------+-----------------------+
                                      |                       |                       |
                                      v                       v                       v
                              +---------------+       +---------------+       +---------------+
                              |  PostgreSQL   |       |  Redis 7      |       |  ChromaDB     |
                              |  Database     |       |  Broker/Store |       |  Vector Store |
                              +---------------+       +-------+-------+       +---------------+
                                                              |
                                                              v
                                                      +---------------+
                                                      | Celery Worker |
                                                      | Execution     |
                                                      +---------------+
```

---

## 💻 Technical Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Standalone Output)
- **UI & Components:** React 19, Tailwind CSS, shadcn/ui, Lucide Icons
- **State & Data Fetching:** Zustand, TanStack Query (React Query)
- **Workflow Canvas:** React Flow
- **Forms & Validation:** React Hook Form, Zod

### Backend
- **Framework:** Python 3.11+ / 3.13, FastAPI (Async ASGI)
- **Database & ORM:** PostgreSQL 16, SQLAlchemy 2.0 (Async Session), Alembic Migrations
- **Security & Auth:** Argon2id Password Hashing, JWT (HS256) with Refresh Tokens
- **Task Queue & Cache:** Celery, Redis 7

### AI & Vector Memory
- **Vector Database:** ChromaDB (Persistent Storage & Cosine Similarity)
- **LLM Integrations:** OpenAI, Google Gemini API, LangChain / LangGraph, Model Context Protocol (MCP)

### Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **Observability:** Prometheus Metrics (`/metrics`), Grafana Dashboards, Loguru Tracing with `X-Request-ID`
- **CI/CD:** GitHub Actions (Backend & Frontend Linting, Typecheck, Pytest, Docker Build Verification)

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/v1/endpoints/   # Auth, Agents, Memories, Tasks, Workflows, Admin, etc.
│   │   ├── core/               # App configuration, Security, Lifespan, Metrics
│   │   ├── db/                 # Database engine & session initialization
│   │   ├── memory/             # ChromaDB vector store wrapper & fallback index
│   │   ├── middleware/         # CORS, Rate Limiter, Security Headers, Tracing
│   │   ├── models/             # SQLAlchemy ORM models
│   │   └── services/           # Business logic & admin bootstrap
│   ├── Dockerfile
│   ├── requirements.txt
│   └── tests/                  # Pytest unit & integration test suite
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages (Auth, Dashboard, Admin)
│   │   ├── components/         # Reusable UI components & Admin Guard
│   │   ├── lib/                # API client, Zustand stores, Utilities
│   │   └── types/              # TypeScript type definitions
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # Multi-container orchestration
├── .github/workflows/ci.yml    # CI/CD pipeline
├── .env.example
└── README.md
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` in both `frontend` and `backend` services.

### Backend (`backend/.env`)
```env
APP_NAME=Self-Improving Agentic Task Automation System
ENVIRONMENT=production
DEBUG=false
API_V1_PREFIX=/api/v1

# Security & CORS
SECRET_KEY=generate_a_secure_random_key_here
BACKEND_CORS_ORIGINS=["https://your-frontend.vercel.app","http://localhost:3001"]

# Database & Storage
DATABASE_URL=postgresql+psycopg://agentic_user:agentic_password@db:5432/agentic_automation
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
CHROMA_PERSIST_DIRECTORY=./chroma_db

# Admin Bootstrap
ADMIN_EMAIL=admin@local.dev
ADMIN_PASSWORD=AdminPassword123!
```

### Frontend (`frontend/.env`)
```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

---

## 🛠️ Local Setup & Docker Instructions

### 1. Direct Docker Compose Deployment
```bash
docker-compose up --build -d
```
- **Frontend App:** `http://localhost:3001`
- **Backend Swagger API:** `http://localhost:8000/docs`
- **Prometheus Telemetry:** `http://localhost:9090`
- **Grafana Monitoring:** `http://localhost:3000`

### 2. Manual Backend Development Setup
```bash
cd backend
python -m venv .venv
# Activate virtual environment
source .venv/bin/activate  # On Linux/macOS
# .venv\Scripts\Activate.ps1  # On Windows

pip install -r requirements.txt
pytest -v
uvicorn app.main:app --reload --port 8000
```

### 3. Manual Frontend Development Setup
```bash
cd frontend
npm install
npm run type-check
npm run lint
npm run dev -p 3001
```

---

## 🧪 Testing & CI/CD Pipeline

The project includes automated quality checks triggered on every push and pull request via GitHub Actions (`.github/workflows/ci.yml`):
- **Backend Suite:** Pytest execution across all endpoints (41/41 tests passing).
- **Frontend Verification:** `tsc --noEmit` (TypeScript static analysis) and ESLint execution.
- **Docker Verification:** Multi-stage image build verification for both backend and frontend.

To execute tests manually:
```bash
# Run backend test suite
cd backend && pytest -v

# Run frontend type check and linting
cd frontend && npm run type-check && npm run lint
```

---

## 🔒 Security & RBAC Governance

- **Argon2id Password Hashing:** Secure password hashing applied across user registration and authentication.
- **Server-Side RBAC (`require_admin`):** Dependency checking `role == "admin"` on all administrative endpoints.
- **Client-Side Admin Guard (`AdminGuard`):** Route wrapper restricting `/admin/*` pages to authenticated administrators.
- **Tenant Isolation:** User ID scoping enforced on all memory query and task execution paths (`user_id == current_user.id`).
- **Security Headers & CORS:** Configured with custom security headers and environment-driven CORS origin filtering.

---

## 🔮 Future Roadmap & Limitations

- **Multi-Cloud Vector Store Adapters:** Add optional adapters for Pinecone and Qdrant.
- **Fine-Grained Agent Permissions:** Per-agent capability scopes and API key token limits.
- **Distributed Celery Clusters:** Multi-region task worker execution support.
