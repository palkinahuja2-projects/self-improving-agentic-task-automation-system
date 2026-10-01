import uuid
import pytest


def test_task_crud_and_execution(client, auth_headers_a, auth_headers_b):
    # 1. Create Task
    task_payload = {
        "title": "Data Aggregation Task",
        "description": "Fetch and aggregate quarterly stats",
        "priority": "high",
        "input_data": '{"target": "sales_q3"}',
        "max_retries": 2,
    }
    response = client.post("/api/v1/tasks", json=task_payload, headers=auth_headers_a)
    assert response.status_code == 201
    task_data = response.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Data Aggregation Task"
    assert task_data["status"] == "pending"

    # 2. List Tasks
    response = client.get("/api/v1/tasks", headers=auth_headers_a)
    assert response.status_code == 200
    assert len(response.json()) == 1

    # 3. Get Task
    response = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert response.status_code == 200
    assert response.json()["id"] == task_id

    # 4. Update Task
    update_payload = {"title": "Updated Aggregation Task", "priority": "urgent"}
    response = client.put(f"/api/v1/tasks/{task_id}", json=update_payload, headers=auth_headers_a)
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Aggregation Task"
    assert response.json()["priority"] == "urgent"

    # 5. Execute Task
    exec_response = client.post(f"/api/v1/tasks/{task_id}/execute", json={"input_data": '{"custom":"input"}'}, headers=auth_headers_a)
    assert exec_response.status_code == 200
    executed_task = exec_response.json()
    assert executed_task["status"] == "completed"
    assert "Completed task" in executed_task["output_data"]

    # 6. Task Execution History
    history_response = client.get(f"/api/v1/tasks/{task_id}/history", headers=auth_headers_a)
    assert history_response.status_code == 200
    histories = history_response.json()
    assert len(histories) >= 1
    assert histories[0]["status"] == "completed"

    # 7. Multi-tenant Isolation Test (User B cannot access or modify User A's task)
    get_b = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_b)
    assert get_b.status_code == 404

    put_b = client.put(f"/api/v1/tasks/{task_id}", json={"title": "Hacked"}, headers=auth_headers_b)
    assert put_b.status_code == 404

    exec_b = client.post(f"/api/v1/tasks/{task_id}/execute", headers=auth_headers_b)
    assert exec_b.status_code == 404

    delete_b = client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers_b)
    assert delete_b.status_code == 404

    # 8. Cancel Task
    task_2_res = client.post("/api/v1/tasks", json={"title": "To be cancelled"}, headers=auth_headers_a)
    task_2_id = task_2_res.json()["id"]
    cancel_res = client.post(f"/api/v1/tasks/{task_2_id}/cancel", headers=auth_headers_a)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # 9. Delete Task
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert del_res.status_code == 204

    get_del = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers_a)
    assert get_del.status_code == 404
