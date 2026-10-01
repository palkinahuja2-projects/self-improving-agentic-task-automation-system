# Troubleshooting & Deployment Notes

This document logs environment setup and deployment issues encountered during project initialization and their resolutions.

---

## Environment & Deployment Incidents

### 1. Docker Desktop Startup Failure (WSL 2 & Virtualization)

During the project setup, Docker Desktop failed to start because the Windows Subsystem for Linux (WSL 2) and the Virtual Machine Platform were not fully configured on the host system, preventing the Docker Engine from running.

**Resolution:**
- Enabled the required Windows features (`VirtualMachinePlatform` and `Microsoft-Windows-Subsystem-Linux`).
- Installed/updated WSL 2 kernel package.
- Restarted the host system and launched Docker Desktop successfully.

---

### 2. FastAPI Backend Startup Failure (`IndentationError` in `config.py`)

During the project setup, two major environment-related issues were encountered. Initially, Docker Desktop failed to start because the Windows Subsystem for Linux (WSL 2) and the Virtual Machine Platform were not fully configured, preventing the Docker Engine from running. After enabling the required Windows features, installing WSL 2, and restarting the system, Docker Desktop started successfully. Subsequently, while deploying the FastAPI backend, the application failed with an **`IndentationError: unexpected indent`** in the `config.py` file. The incorrect indentation prevented Python from importing the configuration module, causing the FastAPI application to terminate during startup. Since the backend container was configured with an automatic restart policy, Docker continuously restarted the container. The issue was resolved by correcting the Python indentation, rebuilding the Docker image, and restarting the containers, allowing the backend service to start normally.

---

### 3. Alembic Database Connection Configuration Mismatch

When running Alembic directly from the Windows virtual environment on the host, the process attempted to connect to PostgreSQL using `localhost:5432`, which timed out. The PostgreSQL instance runs inside Docker where the backend service communicates via the Docker service name (`db:5432`). Running Alembic directly inside the backend Docker container succeeded because it shares the Docker network context and environment variables (`POSTGRES_HOST=db`).

**Resolution & Standardized Practice:**
- Standardized executing Alembic migrations exclusively inside the `backend` Docker container using `docker compose exec backend alembic <command>`.
- Created helper scripts [`scripts/run_migrations.ps1`](file:///f:/Self-Improving-Agentic-Task-Automation-System/scripts/run_migrations.ps1) and [`scripts/run_migrations.sh`](file:///f:/Self-Improving-Agentic-Task-Automation-System/scripts/run_migrations.sh) for consistent cross-platform execution.

---

## Diagnostic & Resolution Summary

| Issue | Root Cause | Impact | Fix Applied |
| :--- | :--- | :--- | :--- |
| **Docker Engine Not Running** | WSL 2 & Virtual Machine Platform disabled | Docker Desktop could not start | Enabled WSL 2 features & updated Linux kernel |
| **`IndentationError: unexpected indent`** | Bad indentation in `config.py` (`Settings` class) | FastAPI import failed, container crash loop | Standardized Python 4-space indentation, updated defaults |
| **`requirements.txt` Encoding** | File saved with UTF-16LE BOM | Pip install failure in Docker | Converted `requirements.txt` to UTF-8 without BOM |
| **Database Connection Mismatch** | Local Alembic uses `localhost:5432` vs Docker backend using `db:5432` | Local host migrations time out | Standardized executing Alembic inside backend container via `docker compose exec` |

