import uuid
import pytest

from app.services.agent_service import create_agent_memory, retrieve_agent_context_memories


def test_store_memory_success(client, auth_headers_a, user_a):
    payload = {
        "content": "User prefers dark mode and concise summaries",
        "memory_type": "long_term",
        "importance_score": 0.9,
        "metadata": {"category": "preference", "source": "user_settings"},
    }

    response = client.post(
        "/api/v1/memories",
        json=payload,
        headers=auth_headers_a,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["memory_type"] == "long_term"
    assert data["importance_score"] == 0.9
    assert data["metadata"] == {"category": "preference", "source": "user_settings"}
    assert data["user_id"] == str(user_a.id)
    assert data["agent_id"] is None
    assert "id" in data


def test_list_memories_with_filters(client, auth_headers_a):
    # Store long_term memory
    client.post(
        "/api/v1/memories",
        json={"content": "Long term preference", "memory_type": "long_term"},
        headers=auth_headers_a,
    )
    # Store short_term memory
    client.post(
        "/api/v1/memories",
        json={"content": "Temporary session goal", "memory_type": "short_term"},
        headers=auth_headers_a,
    )

    # List all
    res_all = client.get("/api/v1/memories", headers=auth_headers_a)
    assert res_all.status_code == 200
    assert len(res_all.json()) == 2

    # Filter short_term
    res_short = client.get("/api/v1/memories?memory_type=short_term", headers=auth_headers_a)
    assert res_short.status_code == 200
    assert len(res_short.json()) == 1
    assert res_short.json()[0]["memory_type"] == "short_term"


def test_get_and_update_memory(client, auth_headers_a):
    create_resp = client.post(
        "/api/v1/memories",
        json={"content": "Initial facts"},
        headers=auth_headers_a,
    )
    memory_id = create_resp.json()["id"]

    # Get by ID
    get_resp = client.get(f"/api/v1/memories/{memory_id}", headers=auth_headers_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["content"] == "Initial facts"

    # Update
    update_resp = client.put(
        f"/api/v1/memories/{memory_id}",
        json={"content": "Updated facts and preferences", "importance_score": 0.95},
        headers=auth_headers_a,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["content"] == "Updated facts and preferences"
    assert update_resp.json()["importance_score"] == 0.95


def test_delete_memory(client, auth_headers_a):
    create_resp = client.post(
        "/api/v1/memories",
        json={"content": "Temporary record"},
        headers=auth_headers_a,
    )
    memory_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/v1/memories/{memory_id}", headers=auth_headers_a)
    assert del_resp.status_code == 204

    get_resp = client.get(f"/api/v1/memories/{memory_id}", headers=auth_headers_a)
    assert get_resp.status_code == 404


def test_semantic_memory_search(client, auth_headers_a):
    client.post(
        "/api/v1/memories",
        json={"content": "Python and FastAPI are used for backend microservices"},
        headers=auth_headers_a,
    )
    client.post(
        "/api/v1/memories",
        json={"content": "Cooking recipes for Italian pasta and lasagna"},
        headers=auth_headers_a,
    )

    search_payload = {
        "query": "backend microservices with Python",
        "limit": 5,
    }
    search_resp = client.post("/api/v1/memories/search", json=search_payload, headers=auth_headers_a)
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert isinstance(results, list)
    assert len(results) > 0
    top_result = results[0]
    assert "memory" in top_result
    assert "score" in top_result
    assert "Python" in top_result["memory"]["content"]


def test_clear_short_term_memories(client, auth_headers_a):
    client.post(
        "/api/v1/memories",
        json={"content": "Active task step 1", "memory_type": "short_term"},
        headers=auth_headers_a,
    )
    client.post(
        "/api/v1/memories",
        json={"content": "Permanent user profile", "memory_type": "long_term"},
        headers=auth_headers_a,
    )

    clear_resp = client.delete("/api/v1/memories/short-term", headers=auth_headers_a)
    assert clear_resp.status_code == 200
    assert clear_resp.json()["cleared_count"] == 1

    remaining = client.get("/api/v1/memories", headers=auth_headers_a).json()
    assert len(remaining) == 1
    assert remaining[0]["memory_type"] == "long_term"


def test_agent_memory_integration(client, auth_headers_a, db, user_a):
    # Create an agent
    agent_resp = client.post("/api/v1/agents", json={"name": "Memory Agent"}, headers=auth_headers_a)
    agent_id = uuid.UUID(agent_resp.json()["id"])

    # Fetch agent from DB
    from app.models.agent import Agent
    agent = db.get(Agent, agent_id)

    # Add memory for agent
    mem = create_agent_memory(
        db=db,
        agent=agent,
        content="Agent specialized context: Database query optimization",
        memory_type="long_term",
    )
    assert mem.agent_id == agent_id

    # Retrieve context
    results = retrieve_agent_context_memories(db=db, agent=agent, query="query optimization")
    assert len(results) > 0
    assert "Database query optimization" in results[0].memory.content


def test_multi_tenant_isolation(client, auth_headers_a, auth_headers_b):
    # User A creates a memory
    create_resp = client.post(
        "/api/v1/memories",
        json={"content": "User A secret notes"},
        headers=auth_headers_a,
    )
    mem_id_a = create_resp.json()["id"]

    # User B GET User A's memory -> 404
    assert client.get(f"/api/v1/memories/{mem_id_a}", headers=auth_headers_b).status_code == 404

    # User B PUT User A's memory -> 404
    assert client.put(f"/api/v1/memories/{mem_id_a}", json={"content": "Hack"}, headers=auth_headers_b).status_code == 404

    # User B DELETE User A's memory -> 404
    assert client.delete(f"/api/v1/memories/{mem_id_a}", headers=auth_headers_b).status_code == 404

    # User B search -> 0 results matching User A's secret
    search_b = client.post("/api/v1/memories/search", json={"query": "secret notes"}, headers=auth_headers_b)
    assert search_b.status_code == 200
    assert len(search_b.json()) == 0


def test_unauthenticated_access(client):
    fake_id = str(uuid.uuid4())
    assert client.post("/api/v1/memories", json={"content": "test"}).status_code == 401
    assert client.get("/api/v1/memories").status_code == 401
    assert client.post("/api/v1/memories/search", json={"query": "test"}).status_code == 401
    assert client.get(f"/api/v1/memories/{fake_id}").status_code == 401
    assert client.put(f"/api/v1/memories/{fake_id}", json={"content": "test"}).status_code == 401
    assert client.delete(f"/api/v1/memories/{fake_id}").status_code == 401


def test_invalid_payload_and_uuid_validation(client, auth_headers_a):
    # Missing content
    assert client.post("/api/v1/memories", json={}, headers=auth_headers_a).status_code == 422
    # Empty content
    assert client.post("/api/v1/memories", json={"content": ""}, headers=auth_headers_a).status_code == 422
    # Invalid UUID
    assert client.get("/api/v1/memories/invalid-uuid", headers=auth_headers_a).status_code == 422
