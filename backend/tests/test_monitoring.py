import pytest


def test_correlation_id_header(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert "x-request-id" in res.headers
    assert len(res.headers["x-request-id"]) > 0


def test_liveness_and_readiness_probes(client):
    live_res = client.get("/api/v1/health/liveness")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    ready_res = client.get("/api/v1/health/readiness")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"


def test_prometheus_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    text_content = res.text
    assert "http_requests_total" in text_content
    assert "http_request_duration_seconds" in text_content


def test_security_headers_middleware(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert "max-age=" in headers.get("strict-transport-security", "")

