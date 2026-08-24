#!/usr/bin/env python3
"""Transport-only executor for scholar-acquire-chatgpt v0.4.3 Prompt 2.

Input and output implement the same JSON contract used by the Python runtime.
No identifier resolution, provider choice, OA policy, scholarly validation,
terminal-state assignment, or acquisition-manifest writing occurs here.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

MAX_BYTES = 128 * 1024 * 1024
ALLOWED_METHODS = {"GET", "HEAD"}


def _error(request_doc: dict, *, started, exc: Exception) -> dict:
    finished = datetime.now(timezone.utc)
    return {
        "schema_version": "2",
        "request_id": request_doc.get("request_id"),
        "correlation_id": request_doc.get("correlation_id"),
        "transport_name": "github_actions_remote",
        "transport_kind": "remote",
        "transport_state": "error",
        "requested_url": request_doc.get("url"),
        "final_url": None,
        "status_code": None,
        "headers": {},
        "body_base64": None,
        "materialized_path": None,
        "byte_count": None,
        "transport_checksum": None,
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "elapsed_ms": max(0, round((finished - started).total_seconds() * 1000)),
        "error_type": type(exc).__name__,
        "error_message": str(exc),
    }


def execute(request_doc: dict) -> dict:
    url = str(request_doc.get("url") or "")
    method = str(request_doc.get("method") or "GET").upper()
    if not request_doc.get("request_id") or not request_doc.get("correlation_id"):
        raise ValueError("request_id and correlation_id are required")
    if method not in ALLOWED_METHODS:
        raise ValueError(f"method not allowed: {method}")
    parts = urlsplit(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("url must be absolute http(s)")
    headers = {str(k): str(v) for k, v in (request_doc.get("headers") or {}).items()}
    timeout = int(request_doc.get("timeout_seconds") or 60)
    limit = request_doc.get("max_bytes")
    limit = min(int(limit), MAX_BYTES) if limit is not None else MAX_BYTES
    req = Request(url=url, headers=headers, method=method)
    started = datetime.now(timezone.utc)
    try:
        try:
            response = urlopen(req, timeout=timeout)
        except HTTPError as exc:
            response = exc
        with response:
            body = response.read(limit + 1) if method != "HEAD" else b""
            if len(body) > limit:
                raise ValueError(f"response exceeds authorized {limit} byte limit")
            status = int(getattr(response, "status", None) or response.getcode())
            response_headers = {k: v for k, v in response.headers.items()}
            final_url = response.geturl()
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        return _error(request_doc, started=started, exc=exc)
    finished = datetime.now(timezone.utc)
    return {
        "schema_version": "2",
        "request_id": request_doc["request_id"],
        "correlation_id": request_doc["correlation_id"],
        "transport_name": "github_actions_remote",
        "transport_kind": "remote",
        "transport_state": "response",
        "requested_url": url,
        "final_url": final_url,
        "status_code": status,
        "headers": response_headers,
        "body_base64": base64.b64encode(body).decode("ascii"),
        "materialized_path": None,
        "byte_count": len(body),
        "transport_checksum": hashlib.sha256(body).hexdigest(),
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "elapsed_ms": max(0, round((finished - started).total_seconds() * 1000)),
        "error_type": None,
        "error_message": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("request_json", type=Path)
    parser.add_argument("response_json", type=Path)
    args = parser.parse_args()
    request_doc = json.loads(args.request_json.read_text(encoding="utf-8"))
    started = datetime.now(timezone.utc)
    try:
        result = execute(request_doc)
    except Exception as exc:
        result = _error(request_doc, started=started, exc=exc)
    args.response_json.parent.mkdir(parents=True, exist_ok=True)
    args.response_json.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0 if result.get("transport_state") == "response" else 2


if __name__ == "__main__":
    raise SystemExit(main())
