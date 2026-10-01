import json
import time
from typing import Dict, List


class RateLimiterMiddleware:
    def __init__(self, app, max_requests: int = 300, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.client_records: Dict[str, List[float]] = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if (
            path.startswith("/api/v1/health")
            or path == "/health"
            or path.startswith("/health/")
            or path == "/metrics"
        ):
            await self.app(scope, receive, send)
            return

        client_tuple = scope.get("client")
        client_ip = client_tuple[0] if client_tuple else "127.0.0.1"
        now = time.time()

        timestamps = self.client_records.get(client_ip, [])
        valid_timestamps = [ts for ts in timestamps if now - ts < self.window_seconds]

        if len(valid_timestamps) >= self.max_requests:
            body = json.dumps(
                {"detail": f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s allowed."}
            ).encode("utf-8")
            response_headers = [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("latin1")),
                (b"retry-after", str(self.window_seconds).encode("latin1")),
            ]
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": response_headers,
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })
            return

        valid_timestamps.append(now)
        self.client_records[client_ip] = valid_timestamps

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-ratelimit-limit", str(self.max_requests).encode("latin1")))
                headers.append(
                    (b"x-ratelimit-remaining", str(self.max_requests - len(valid_timestamps)).encode("latin1"))
                )
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

