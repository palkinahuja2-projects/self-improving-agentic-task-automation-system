import time
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# 1. Prometheus Telemetry Counters & Histograms
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total count of HTTP requests",
    ["method", "endpoint", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

AGENT_EXECUTIONS_TOTAL = Counter(
    "agent_executions_total",
    "Total count of agent executions",
    ["role", "status"],
)

TASK_EXECUTIONS_TOTAL = Counter(
    "task_executions_total",
    "Total count of task executions",
    ["status"],
)

WORKFLOW_EXECUTIONS_TOTAL = Counter(
    "workflow_executions_total",
    "Total count of workflow executions",
    ["status"],
)

MULTI_AGENT_EXECUTIONS_TOTAL = Counter(
    "multi_agent_executions_total",
    "Total count of multi-agent executions",
    ["status"],
)

MEMORY_OPERATIONS_TOTAL = Counter(
    "memory_operations_total",
    "Total count of memory operations",
    ["operation", "memory_type"],
)

SELF_IMPROVEMENT_EXPERIMENTS_TOTAL = Counter(
    "self_improvement_experiments_total",
    "Total count of self-improvement experiments",
    ["outcome"],
)


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        endpoint = request.url.path
        method = request.method
        status_code = str(response.status_code)

        HTTP_REQUESTS_TOTAL.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(method=method, endpoint=endpoint).observe(duration)

        return response


def get_metrics_response() -> Response:
    """Generate raw Prometheus metrics payload."""
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

