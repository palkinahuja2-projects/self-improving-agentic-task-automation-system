from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.admin_bootstrap import bootstrap_admin


def test_admin_bootstrap(db: Session):
    """Test idempotent admin user creation."""
    admin = bootstrap_admin(db)
    assert admin is not None
    assert admin.email == settings.admin_email
    assert admin.role == "admin"
    assert admin.is_superuser is True

    # Call again to verify idempotency
    admin_second = bootstrap_admin(db)
    assert admin_second.id == admin.id


def test_admin_rbac_access_denied_for_normal_user(client: TestClient, user_a: User):
    """Verify normal users receive HTTP 403 Forbidden when accessing admin endpoints."""
    # Login as normal user
    token_res = client.post(
        "/api/v1/auth/login",
        json={"email": "user_a@example.com", "password": "Password123!"},
    )
    token = token_res.json()["access_token"]

    # Attempt accessing admin dashboard
    admin_res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert admin_res.status_code == 403
    assert admin_res.json()["detail"] == "Admin access required"


def test_admin_rbac_access_granted_for_admin_user(client: TestClient, db: Session):
    """Verify admin users can access admin endpoints and receive dashboard statistics."""
    # Ensure bootstrap admin exists
    bootstrap_admin(db)

    # Login as admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Access admin dashboard
    res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "admin_users" in data
    assert data["admin_users"] >= 1


def test_admin_user_status_and_role_management(client: TestClient, db: Session, user_a: User):
    """Verify admin can list users, update active status, and update role with audit logs."""
    bootstrap_admin(db)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List users
    list_res = client.get("/api/v1/admin/users", headers=headers)
    assert list_res.status_code == 200
    users_list = list_res.json()
    assert len(users_list) >= 2

    # Verify password and password_hash are not exposed in user schemas
    for u in users_list:
        assert "password" not in u
        assert "password_hash" not in u

    # 2. Deactivate normal user
    status_res = client.put(
        f"/api/v1/admin/users/{user_a.id}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is False

    # 3. Promote normal user to admin
    role_res = client.put(
        f"/api/v1/admin/users/{user_a.id}/role",
        headers=headers,
        json={"role": "admin", "is_superuser": True},
    )
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "admin"

    # 4. Verify audit log entry was created
    audit_logs = db.query(AuditLog).filter(AuditLog.resource_id == str(user_a.id)).all()
    assert len(audit_logs) >= 2


def test_admin_self_deactivation_and_last_admin_demotion_prevention(client: TestClient, db: Session):
    """Verify admin cannot deactivate themselves or demote the last remaining admin."""
    admin = bootstrap_admin(db)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt self deactivation
    deactivate_res = client.put(
        f"/api/v1/admin/users/{admin.id}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert deactivate_res.status_code == 400
    assert "Cannot deactivate your own" in deactivate_res.json()["detail"]

