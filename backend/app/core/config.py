from functools import lru_cache
from typing import Any, List, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Self-Improving Agentic Task Automation System"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    backend_cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    return json.loads(v_str)
                except Exception:
                    pass
            return [i.strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item) for item in v]
        return []

    # Database
    postgres_user: str = "agentic_user"
    postgres_password: str = "agentic_password"
    postgres_db: str = "agentic_automation"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url: str = (
        "postgresql+psycopg://agentic_user:agentic_password"
        "@localhost:5432/agentic_automation"
    )

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    # Authentication
    secret_key: str = "O7b7MJ_8Hh1xsN5zNfFfHU9QGqnJCy5-bXEzWlyeoV9aghwUlAqneuFOVUC6cVOV"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    admin_email: str = "admin@local.dev"
    admin_password: str = "AdminPassword123!"

    # Memory & Vector Database
    chroma_persist_directory: str = "./chroma_db"
    embedding_provider: str = "default"
    default_similarity_threshold: float = 0.0

    # Redis & Celery Automation
    redis_host: str = "localhost"
    redis_port: int = 6379
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()