import uuid
import pytest


def test_evaluate_execution(client, auth_headers_a):
    target_id = str(uuid.uuid4())
    eval_req = {
        "target_type": "task",
        "target_id": target_id,
        "execution_time_ms": 1250.0,
        "success": True,
        "error_count": 0,
        "retry_count": 0,
        "output_text": "Successfully processed market intelligence data and generated financial report.",
        "reviewer_feedback": "Quality Review PASSED: Verified all outputs.",
    }

    res = client.post("/api/v1/self-improvement/evaluate", json=eval_req, headers=auth_headers_a)
    assert res.status_code == 201
    data = res.json()

    assert data["target_id"] == target_id
    assert data["score"] > 80.0
    assert data["success"] is True
    assert data["output_quality_score"] >= 80.0
    eval_id = data["id"]

    # Retrieve evaluation
    get_res = client.get(f"/api/v1/self-improvement/evaluations/{target_id}", headers=auth_headers_a)
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1
    assert get_res.json()[0]["id"] == eval_id


def test_generate_proposal_apply_and_versioning(client, auth_headers_a):
    # 1. Create an Agent for User A
    agent_res = client.post(
        "/api/v1/agents",
        json={
            "name": "Self-Improving Analyst Agent",
            "description": "Base analyst agent",
            "role": "analyst",
            "capabilities": "data_analysis",
            "is_active": True,
        },
        headers=auth_headers_a,
    )
    assert agent_res.status_code == 201
    agent_data = agent_res.json()
    agent_id = agent_data["id"]

    # 2. Create an Evaluation with failure/quality issues
    eval_res = client.post(
        "/api/v1/self-improvement/evaluate",
        json={
            "target_type": "task",
            "target_id": str(uuid.uuid4()),
            "execution_time_ms": 6200.0,
            "success": False,
            "error_count": 2,
            "retry_count": 1,
            "output_text": "Error: Partial failure occurred during computation.",
            "reviewer_feedback": "Quality Review WARNING: Missing expected fields.",
        },
        headers=auth_headers_a,
    )
    assert eval_res.status_code == 201
    eval_id = eval_res.json()["id"]

    # 3. Generate Proposal
    prop_res = client.post(
        "/api/v1/self-improvement/proposals",
        json={
            "evaluation_id": eval_id,
            "agent_id": agent_id,
        },
        headers=auth_headers_a,
    )
    assert prop_res.status_code == 201
    prop_data = prop_res.json()
    proposal_id = prop_data["id"]
    assert prop_data["status"] == "proposed"
    assert prop_data["agent_id"] == agent_id

    # 4. Apply Proposal
    apply_res = client.post(
        f"/api/v1/self-improvement/proposals/{proposal_id}/apply",
        headers=auth_headers_a,
    )
    assert apply_res.status_code == 200
    applied_data = apply_res.json()
    assert applied_data["status"] == "applied"
    assert applied_data["applied_version"] is not None

    # 5. List Agent Versions
    ver_res = client.get(
        f"/api/v1/self-improvement/agents/{agent_id}/versions",
        headers=auth_headers_a,
    )
    assert ver_res.status_code == 200
    versions = ver_res.json()
    assert len(versions) >= 2


def test_rollback_agent_version(client, auth_headers_a):
    # 1. Create agent
    agent_res = client.post(
        "/api/v1/agents",
        json={
            "name": "Version Rollback Test Agent",
            "role": "executor",
            "capabilities": "original_capability",
        },
        headers=auth_headers_a,
    )
    agent_id = agent_res.json()["id"]

    # 2. Evaluate & Apply Proposal
    eval_res = client.post(
        "/api/v1/self-improvement/evaluate",
        json={
            "target_type": "task",
            "target_id": str(uuid.uuid4()),
            "success": False,
            "error_count": 1,
        },
        headers=auth_headers_a,
    )
    eval_id = eval_res.json()["id"]

    prop_res = client.post(
        "/api/v1/self-improvement/proposals",
        json={"evaluation_id": eval_id, "agent_id": agent_id},
        headers=auth_headers_a,
    )
    proposal_id = prop_res.json()["id"]

    client.post(f"/api/v1/self-improvement/proposals/{proposal_id}/apply", headers=auth_headers_a)

    # 3. Rollback to Version 1
    rollback_res = client.post(
        f"/api/v1/self-improvement/agents/{agent_id}/rollback/1",
        headers=auth_headers_a,
    )
    assert rollback_res.status_code == 200
    rollback_data = rollback_res.json()
    assert rollback_data["agent_id"] == agent_id
    assert "Rollback to version 1" in rollback_data["change_summary"]


def test_run_performance_experiment(client, auth_headers_a):
    # 1. Evaluate baseline
    eval_res = client.post(
        "/api/v1/self-improvement/evaluate",
        json={
            "target_type": "workflow",
            "target_id": str(uuid.uuid4()),
            "execution_time_ms": 2000.0,
            "success": True,
            "error_count": 0,
        },
        headers=auth_headers_a,
    )
    eval_id = eval_res.json()["id"]

    # 2. Generate and apply proposal
    prop_res = client.post(
        "/api/v1/self-improvement/proposals",
        json={"evaluation_id": eval_id},
        headers=auth_headers_a,
    )
    proposal_id = prop_res.json()["id"]

    client.post(f"/api/v1/self-improvement/proposals/{proposal_id}/apply", headers=auth_headers_a)

    # 3. Run Experiment
    exp_res = client.post(
        "/api/v1/self-improvement/experiments/run",
        json={
            "proposal_id": proposal_id,
            "baseline_execution_id": eval_id,
        },
        headers=auth_headers_a,
    )
    assert exp_res.status_code == 201
    exp_data = exp_res.json()
    assert exp_data["outcome"] == "promoted"
    assert exp_data["candidate_score"] > exp_data["baseline_score"]
    assert exp_data["improvement_ratio"] > 0.0


def test_self_improvement_multi_tenant_isolation(client, auth_headers_a, auth_headers_b):
    # 1. User A creates evaluation
    target_id = str(uuid.uuid4())
    eval_res = client.post(
        "/api/v1/self-improvement/evaluate",
        json={"target_type": "task", "target_id": target_id, "success": True},
        headers=auth_headers_a,
    )
    eval_id = eval_res.json()["id"]

    # User B cannot access User A's evaluation
    u2_get = client.get(f"/api/v1/self-improvement/evaluations/{target_id}", headers=auth_headers_b)
    assert u2_get.status_code == 404

    # User B cannot generate proposal for User A's evaluation
    u2_prop = client.post(
        "/api/v1/self-improvement/proposals",
        json={"evaluation_id": eval_id},
        headers=auth_headers_b,
    )
    assert u2_prop.status_code == 404

