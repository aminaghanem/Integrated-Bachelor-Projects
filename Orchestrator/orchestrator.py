from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

from redis_client import r
from state_manager import RedisStateManager


def _today_start_ts() -> float:
	return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


def _normalize_request_id(value: Any) -> str:
	if isinstance(value, bytes):
		return value.decode("utf-8")
	return str(value)


def _load_recent_trails(state_manager: RedisStateManager, request_ids: Iterable[Any]) -> List[Dict[str, Any]]:
	trails: List[Dict[str, Any]] = []
	for request_id in request_ids:
		trail = state_manager.get_audit_trail(_normalize_request_id(request_id))
		if trail is not None:
			trails.append(trail)
	return trails


def register_audit_routes(app: FastAPI, state_manager: RedisStateManager) -> None:
	@app.get("/audit/recent")
	def audit_recent(limit: int = 50) -> List[Dict[str, Any]]:
		clamped_limit = max(1, min(limit, 500))
		request_ids = r.zrevrange("audit:requests", 0, clamped_limit - 1)
		return _load_recent_trails(state_manager, request_ids)

	@app.get("/audit/stats")
	def audit_stats() -> Dict[str, int]:
		today_start = _today_start_ts()
		total_today = int(r.zcount("audit:requests", today_start, "+inf"))
		request_ids = r.zrevrange("audit:requests", 0, -1)
		trails = _load_recent_trails(state_manager, request_ids)

		total_blocked = 0
		total_allowed = 0
		fail_safe_blocks = 0
		cache_hits = 0
		ai_hits = 0

		for trail in trails:
			if trail.get("current_state") != "COMPLETED":
				continue

			decision = str(trail.get("decision") or "").lower()
			source = str(trail.get("source") or "").lower()

			if decision == "blocked":
				total_blocked += 1
				if source == "fail-safe":
					fail_safe_blocks += 1
			elif decision == "allowed":
				total_allowed += 1

			if source == "cache":
				cache_hits += 1
			elif source == "ai":
				ai_hits += 1

		return {
			"total_today": total_today,
			"total_blocked": total_blocked,
			"total_allowed": total_allowed,
			"fail_safe_blocks": fail_safe_blocks,
			"cache_hits": cache_hits,
			"ai_hits": ai_hits,
		}

	@app.get("/audit/stream")
	async def audit_stream(request: Request) -> StreamingResponse:
		async def event_generator():
			pubsub = r.pubsub(ignore_subscribe_messages=True)
			pubsub.subscribe("audit:events")
			try:
				while True:
					if await request.is_disconnected():
						break

					message = await asyncio.to_thread(pubsub.get_message, timeout=1.0)
					if message and message.get("type") == "message":
						data = message.get("data")
						if isinstance(data, bytes):
							data = data.decode("utf-8")
						yield f"data: {data}\n\n"
					else:
						yield ": keep-alive\n\n"
			finally:
				pubsub.close()

		return StreamingResponse(event_generator(), media_type="text/event-stream")
