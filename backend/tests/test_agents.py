import uuid

import pytest


def test_create_agent_success(client, auth_headers_a, user_a):
    payload = {
        "name": "Research Agent",
        "description": "Performs deep web research",
        "agent_type": "researcher",
        "is_active": True,
    }

    response = client.post(
        "/api/v1/agents",
        json=payload,
        headers=auth_headers_a,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Research Agent"
    assert data["description"] == "Performs deep web research"
    assert data["agent_type"] == "researcher"
    assert data["is_active"] is True
    assert data["owner_id"] == str(user_a.id)
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_agent_default_values(client, auth_headers_a, user_a):
    payload = {
        "name": "Minimal Agent",
    }

    response = client.post(
        "/api/v1/agents",
        json=payload,
        headers=auth_headers_a,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Minimal Agent"
    assert data["description"] is None
    assert data["agent_type"] == "general"
    assert data["is_active"] is True
    assert data["owner_id"] == str(user_a.id)


def test_list_agents(client, auth_headers_a):
    # Create two agents
    client.post(
        "/api/v1/agents",
        json={"name": "Agent 1"},
        headers=auth_headers_a,
    )
    client.post(
        "/api/v1/agents",
        json={"name": "Agent 2"},
        headers=auth_headers_a,
    )

    response = client.get(
        "/api/v1/agents",
        headers=auth_headers_a,
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    names = [agent["name"] for agent in data]
    assert "Agent 1" in names
    assert "Agent 2" in names


def test_get_agent_by_id_success(client, auth_headers_a):
    create_resp = client.post(
        "/api/v1/agents",
        json={"name": "Target Agent"},
        headers=auth_headers_a,
    )
    agent_id = create_resp.json()["id"]

    response = client.get(
        f"/api/v1/agents/{agent_id}",
        headers=auth_headers_a,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == agent_id
    assert data["name"] == "Target Agent"


def test_get_agent_by_id_not_found(client, auth_headers_a):
    random_id = str(uuid.uuid4())

    response = client.get(
        f"/api/v1/agents/{random_id}",
        headers=auth_headers_a,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Agent not found"


def test_update_agent_success(client, auth_headers_a):
    create_resp = client.post(
        "/api/v1/agents",
        json={"name": "Old Name", "description": "Old desc"},
        headers=auth_headers_a,
    )
    agent_id = create_resp.json()["id"]

    update_payload = {
        "name": "Updated Name",
        "description": "Updated desc",
        "agent_type": "coding",
        "is_active": False,
    }

    response = client.put(
        f"/api/v1/agents/{agent_id}",
        json=update_payload,
        headers=auth_headers_a,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == agent_id
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated desc"
    assert data["agent_type"] == "coding"
    assert data["is_active"] is False


def test_delete_agent_success(client, auth_headers_a):
    create_resp = client.post(
        "/api/v1/agents",
        json={"name": "To Be Deleted"},
        headers=auth_headers_a,
    )
    agent_id = create_resp.json()["id"]

    delete_resp = client.delete(
        f"/api/v1/agents/{agent_id}",
        headers=auth_headers_a,
    )
    assert delete_resp.status_code == 204

    get_resp = client.get(
        f"/api/v1/agents/{agent_id}",
        headers=auth_headers_a,
    )
    assert get_resp.status_code == 404


def test_authentication_required(client):
    fake_id = str(uuid.uuid4())

    assert client.post("/api/v1/agents", json={"name": "Test"}).status_code == 401
    assert client.get("/api/v1/agents").status_code == 401
    assert client.get(f"/api/v1/agents/{fake_id}").status_code == 401
    assert client.put(f"/api/v1/agents/{fake_id}", json={"name": "Test"}).status_code == 401
    assert client.delete(f"/api/v1/agents/{fake_id}").status_code == 401


def test_user_isolation_get_update_delete(client, auth_headers_a, auth_headers_b):
    # User A creates an agent
    create_resp = client.post(
        "/api/v1/agents",
        json={"name": "User A Private Agent"},
        headers=auth_headers_a,
    )
    agent_id = create_resp.json()["id"]

    # User B should not see User A's agent in list
    list_resp_b = client.get("/api/v1/agents", headers=auth_headers_b)
    assert list_resp_b.status_code == 200
    assert len(list_resp_b.json()) == 0

    # User B attempting to GET User A's agent -> 404
    get_resp_b = client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers_b)
    assert get_resp_b.status_code == 404
    assert get_resp_b.json()["detail"] == "Agent not found"

    # User B attempting to PUT User A's agent -> 404
    put_resp_b = client.put(
        f"/api/v1/agents/{agent_id}",
        json={"name": "Hacked Agent Name"},
        headers=auth_headers_b,
    )
    assert put_resp_b.status_code == 404

    # User B attempting to DELETE User A's agent -> 404
    del_resp_b = client.delete(f"/api/v1/agents/{agent_id}", headers=auth_headers_b)
    assert del_resp_b.status_code == 404

    # Verify agent still exists for User A
    get_resp_a = client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers_a)
    assert get_resp_a.status_code == 200
    assert get_resp_a.json()["name"] == "User A Private Agent"


def test_invalid_uuid_format(client, auth_headers_a):
    invalid_id = "invalid-uuid-string"

    assert client.get(f"/api/v1/agents/{invalid_id}", headers=auth_headers_a).status_code == 422
    assert client.put(f"/api/v1/agents/{invalid_id}", json={"name": "Test"}, headers=auth_headers_a).status_code == 422
    assert client.delete(f"/api/v1/agents/{invalid_id}", headers=auth_headers_a).status_code == 422


def test_invalid_payload_validation(client, auth_headers_a):
    # Missing name
    res1 = client.post("/api/v1/agents", json={}, headers=auth_headers_a)
    assert res1.status_code == 422

    # Empty name (min_length=1)
    res2 = client.post("/api/v1/agents", json={"name": ""}, headers=auth_headers_a)
    assert res2.status_code == 422

    # Name too long (> 100 chars)
    res3 = client.post(
        "/api/v1/agents",
        json={"name": "A" * 101},
        headers=auth_headers_a,
    )
    assert res3.status_code == 422

    # Agent type too long (> 50 chars)
    res4 = client.post(
        "/api/v1/agents",
        json={"name": "Valid Name", "agent_type": "T" * 51},
        headers=auth_headers_a,
    )
    assert res4.status_code == 422


def test_delete_nonexistent_agent(client, auth_headers_a):
    random_id = str(uuid.uuid4())
    res = client.delete(f"/api/v1/agents/{random_id}", headers=auth_headers_a)
    assert res.status_code == 404
    assert res.json()["detail"] == "Agent not found"
