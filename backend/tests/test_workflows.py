import uuid
import pytest


def test_workflow_crud_nodes_and_execution(client, auth_headers_a, auth_headers_b):
    # 1. Create Workflow
    wf_payload = {
        "name": "Customer Support Pipeline",
        "description": "Automated ticket processing and response workflow",
        "status": "draft",
        "nodes": [
            {
                "name": "Initial Triage Node",
                "node_type": "agent_task",
                "step_order": 1,
            },
            {
                "name": "Condition Check Node",
                "node_type": "condition",
                "step_order": 2,
            },
        ],
    }
    response = client.post("/api/v1/workflows", json=wf_payload, headers=auth_headers_a)
    assert response.status_code == 201
    wf_data = response.json()
    wf_id = wf_data["id"]
    assert wf_data["name"] == "Customer Support Pipeline"
    assert len(wf_data["nodes"]) == 2

    # 2. Add Node to Workflow
    add_node_payload = {
        "name": "Transform Node",
        "node_type": "transform",
        "step_order": 3,
    }
    add_res = client.post(f"/api/v1/workflows/{wf_id}/nodes", json=add_node_payload, headers=auth_headers_a)
    assert add_res.status_code == 201
    new_node = add_res.json()
    assert new_node["name"] == "Transform Node"

    # 3. Get Workflow
    get_res = client.get(f"/api/v1/workflows/{wf_id}", headers=auth_headers_a)
    assert get_res.status_code == 200
    assert len(get_res.json()["nodes"]) == 3

    # 4. Activate Workflow
    act_res = client.post(f"/api/v1/workflows/{wf_id}/activate", headers=auth_headers_a)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 5. Execute Workflow Pipeline
    exec_res = client.post(f"/api/v1/workflows/{wf_id}/execute", json={"input_data": "Support Ticket Payload"}, headers=auth_headers_a)
    assert exec_res.status_code == 200
    executed_wf = exec_res.json()
    assert executed_wf["status"] == "active"

    # 6. Workflow History
    hist_res = client.get(f"/api/v1/workflows/{wf_id}/history", headers=auth_headers_a)
    assert hist_res.status_code == 200
    histories = hist_res.json()
    assert len(histories) >= 1

    # 7. Multi-tenant Isolation Test
    get_b = client.get(f"/api/v1/workflows/{wf_id}", headers=auth_headers_b)
    assert get_b.status_code == 404

    add_node_b = client.post(f"/api/v1/workflows/{wf_id}/nodes", json=add_node_payload, headers=auth_headers_b)
    assert add_node_b.status_code == 404

    exec_b = client.post(f"/api/v1/workflows/{wf_id}/execute", headers=auth_headers_b)
    assert exec_b.status_code == 404

    del_b = client.delete(f"/api/v1/workflows/{wf_id}", headers=auth_headers_b)
    assert del_b.status_code == 404

    # 8. Deactivate Workflow
    deact_res = client.post(f"/api/v1/workflows/{wf_id}/deactivate", headers=auth_headers_a)
    assert deact_res.status_code == 200
    assert deact_res.json()["status"] == "paused"

    # 9. Delete Workflow
    del_res = client.delete(f"/api/v1/workflows/{wf_id}", headers=auth_headers_a)
    assert del_res.status_code == 204

    get_del = client.get(f"/api/v1/workflows/{wf_id}", headers=auth_headers_a)
    assert get_del.status_code == 404
