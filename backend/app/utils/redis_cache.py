import os
import json
from typing import Optional, Dict, Any

import redis


def _get_client() -> Optional[redis.Redis]:
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        client = redis.Redis.from_url(url, decode_responses=True)
        # ping to verify connection
        client.ping()
        return client
    except Exception:
        return None


def get_summary(content_hash: str) -> Optional[str]:
    client = _get_client()
    if not client:
        return None
    try:
        return client.get(f"summary:{content_hash}")
    except Exception:
        return None


def set_summary(content_hash: str, summary: str, ttl_seconds: int = 7 * 24 * 3600) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.setex(f"summary:{content_hash}", ttl_seconds, summary)
    except Exception:
        pass


def get_tree(job_id: str) -> Optional[Dict[str, Any]]:
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(f"tree:{job_id}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def set_tree(job_id: str, tree: Dict[str, Any], ttl_seconds: int = 24 * 3600) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.setex(f"tree:{job_id}", ttl_seconds, json.dumps(tree))
    except Exception:
        pass
