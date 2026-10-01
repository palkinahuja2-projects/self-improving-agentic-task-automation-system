import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.agent import Agent  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.user import User

# Use SQLite in-memory database for fast, isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create all tables before each test and drop them afterwards."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Provide a transactional database session for tests."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db):
    """Provide a FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user_a(db):
    """Create and return primary test user A."""
    user = User(
        id=uuid.uuid4(),
        email="user_a@example.com",
        username="usera",
        password_hash=hash_password("Password123!"),
        role="user",
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers_a(user_a):
    """Provide Bearer auth headers for user A."""
    token = create_access_token(subject=str(user_a.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_b(db):
    """Create and return secondary test user B for isolation testing."""
    user = User(
        id=uuid.uuid4(),
        email="user_b@example.com",
        username="userb",
        password_hash=hash_password("Password123!"),
        role="user",
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers_b(user_b):
    """Provide Bearer auth headers for user B."""
    token = create_access_token(subject=str(user_b.id))
    return {"Authorization": f"Bearer {token}"}
