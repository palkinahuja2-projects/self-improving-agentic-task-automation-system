import uuid
import pytest


def test_multi_agent_orchestration_flow(client, auth_headers_a, auth_headers_b):
    # 1. Create specialized agents for User A
    roles = ["planner", "researcher", "analyst", "executor", "reviewer", "coordinator"]
    for role in roles:
        res = client.post(
            "/api/v1/agents",
            json={
                "name": f"User A {role.capitalize()} Agent",
                "description": f"Specialized agent for {role}",
                "role": role,
                "agent_type": "specialized",
                "capabilities": f'["{role}", "task_processing"]',
            },
            headers=auth_headers_a,
        )
        assert res.status_code == 201

    # 2. Initiate Multi-Agent Execution Session
    exec_req = {
        "objective": "Perform market analysis on cloud AI services and recommend architecture",
        "required_roles": ["planner", "researcher", "analyst", "executor", "reviewer"],
    }
    exec_res = client.post("/api/v1/multi-agent/execute", json=exec_req, headers=auth_headers_a)
    assert exec_res.status_code == 201
    exec_data = exec_res.json()
    exec_id = exec_data["id"]

    assert exec_data["status"] == "completed"
    assert "MULTI-AGENT COLLABORATION FINAL RESULT" in exec_data["final_result"]
    assert exec_data["plan_json"] is not None

    # 3. List User Executions
    list_res = client.get("/api/v1/multi-agent/executions", headers=auth_headers_a)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Get Execution Details
    get_res = client.get(f"/api/v1/multi-agent/executions/{exec_id}", headers=auth_headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == exec_id

    # 5. Fetch Inter-Agent Message Logs
    msg_res = client.get(f"/api/v1/multi-agent/executions/{exec_id}/messages", headers=auth_headers_a)
    assert msg_res.status_code == 200
    messages = msg_res.json()
    assert len(messages) >= 3  # planner, dispatcher, executor, reviewer messages logged
    assert any(m["message_type"] == "delegation" for m in messages)
    assert any(m["message_type"] == "feedback" for m in messages)

    # 6. Multi-Tenant Security Isolation (User B cannot access User A's session or messages)
    get_b = client.get(f"/api/v1/multi-agent/executions/{exec_id}", headers=auth_headers_b)
    assert get_b.status_code == 404

    msg_b = client.get(f"/api/v1/multi-agent/executions/{exec_id}/messages", headers=auth_headers_b)
    assert msg_b.status_code == 404
