import json
import time
import hashlib
import redis
from enum import Enum
from redis_client import r
from states import ControlState


class InvalidStateTransitionError(Exception):
	"""Raised when an illegal state transition is attempted."""
	pass


# Valid state transitions: maps each ControlState to the set of states it can transition to
VALID_TRANSITIONS = {
	ControlState.REQUEST_INITIATED: {
		ControlState.PROFILE_RETRIEVED,
		ControlState.FAILED,
	},
	ControlState.PROFILE_RETRIEVED: {
		ControlState.KEYWORD_FILTER_CHECK,
		ControlState.FAILED,
	},
	ControlState.KEYWORD_FILTER_CHECK: {
		ControlState.CACHE_CHECK,
		ControlState.ACCESS_DECIDED,
		ControlState.FAILED,
	},
	ControlState.CACHE_CHECK: {
		ControlState.AI_ANALYSIS,
		ControlState.ACCESS_DECIDED,
		ControlState.FAILED,
	},
	ControlState.AI_ANALYSIS: {
		ControlState.ACCESS_DECIDED,
		ControlState.FAILED,
	},
	ControlState.ACCESS_DECIDED: {
		ControlState.COMPLETED,
		ControlState.FAILED,
	},
	ControlState.COMPLETED: set(),
	ControlState.FAILED: {
		ControlState.COMPLETED,
	},
}


class RedisStateManager:
	def create_request(self, request_id, user_id, url):
		"""
		Create a new request state in Redis with initialized tracking structures.
		
		Args:
			request_id: Unique request identifier
			user_id: Student user ID
			url: The URL being requested
		"""
		current_time = time.time()
		state = {
			"control_state": ControlState.REQUEST_INITIATED.value,
			"data_state": {
				"request_id": request_id,
				"user_id": user_id,
				"url": url,
			},
			"execution_state": {
				"retry_count": 0,
				"result_metadata": {},
				"timestamps": {
					ControlState.REQUEST_INITIATED.value: current_time,
				},
				"transition_log": [
					{
						"from": None,
						"to": ControlState.REQUEST_INITIATED.value,
						"at": current_time,
					},
				],
				"errors": [],
			},
		}
		r.setex(f"request:{request_id}", 3600, json.dumps(state))
		r.zadd("audit:requests", {request_id: current_time})

	def get_state(self, request_id):
		"""Get the current state of a request from Redis."""
		data = r.get(f"request:{request_id}")
		return json.loads(data) if data else None

	def update_state(self, request_id, new_state, error=None, result_metadata=None):
		"""
		Update the control state with optimistic locking via Redis WATCH.
		
		Validates the state transition before applying the update. If an error
		is provided, it is logged in the errors list.
		
		Args:
			request_id: The request ID to update
			new_state: The new ControlState value
			error: Optional error message to log
			result_metadata: Optional final metadata to merge into the audit trail
			
		Raises:
			InvalidStateTransitionError: If the transition is illegal
		"""
		key = f"request:{request_id}"
		state_value = new_state.value if isinstance(new_state, ControlState) else str(new_state)
		pipe = r.pipeline()
		max_retries = 3
		for attempt in range(max_retries):
			try:
				pipe.watch(key)
				data = r.get(key)
				if data is None:
					pipe.unwatch()
					return

				state = json.loads(data)
				current_state = state.get("control_state")

				current_state_enum = ControlState(current_state) if current_state else ControlState.REQUEST_INITIATED
				if state_value != current_state and state_value != ControlState.FAILED.value:
					if state_value not in VALID_TRANSITIONS.get(current_state_enum, set()):
						pipe.unwatch()
						raise InvalidStateTransitionError(
							f"Cannot transition from {current_state} to {state_value}"
						)

				current_time = time.time()
				state["control_state"] = state_value
				state["execution_state"]["timestamps"][state_value] = current_time

				state["execution_state"]["transition_log"].append({
					"from": current_state,
					"to": state_value,
					"at": current_time,
				})

				if error:
					state["execution_state"]["errors"].append({
						"state": state_value,
						"error": error,
						"at": current_time,
					})

				if result_metadata:
					state["execution_state"].setdefault("result_metadata", {}).update(result_metadata)

				pipe.multi()
				pipe.setex(key, 3600, json.dumps(state))
				pipe.execute()

				if state_value in {ControlState.COMPLETED.value, ControlState.FAILED.value}:
					try:
						audit_trail = self.get_audit_trail(request_id)
						if audit_trail is not None:
							r.publish("audit:events", json.dumps(audit_trail, default=str))
					except Exception:
						pass

				break
			except redis.WatchError:
				pipe.unwatch()
				if attempt == max_retries - 1:
					raise
				time.sleep(0.01 * (attempt + 1))
			except Exception:
				pipe.unwatch()
				if attempt == max_retries - 1:
					raise
				time.sleep(0.01 * (attempt + 1))

	def increment_retry(self, request_id):
		"""
		Increment the retry count for a request.
		
		Args:
			request_id: The request ID to increment
			
		Returns:
			The new retry count value
		"""
		state = self.get_state(request_id)
		if state is None:
			return 0
		new_count = state["execution_state"]["retry_count"] + 1
		state["execution_state"]["retry_count"] = new_count
		r.setex(f"request:{request_id}", 3600, json.dumps(state))
		return new_count

	def get_retry_count(self, request_id):
		"""
		Get the current retry count for a request.
		
		Args:
			request_id: The request ID to check
			
		Returns:
			The retry count, or None if request not found
		"""
		state = self.get_state(request_id)
		if state is None:
			return None
		return state["execution_state"]["retry_count"]

	def get_audit_trail(self, request_id):
		"""
		Get the complete audit trail for a request.
		
		Args:
			request_id: The request ID to retrieve
			
		Returns:
			A dict with request_id, current_state, url, user_id, transition_log,
			timestamps, retry_count, errors, and duration_seconds.
			Returns None if request not found.
		"""
		state = self.get_state(request_id)
		if state is None:
			return None

		data_state = state.get("data_state", {})
		exec_state = state.get("execution_state", {})
		timestamps = exec_state.get("timestamps", {})
		metadata = exec_state.get("result_metadata", {})

		start_time = timestamps.get(ControlState.REQUEST_INITIATED.value)
		end_time = None
		if ControlState.COMPLETED.value in timestamps:
			end_time = timestamps[ControlState.COMPLETED.value]
		elif ControlState.FAILED.value in timestamps:
			end_time = timestamps[ControlState.FAILED.value]

		duration_seconds = (end_time - start_time) if (start_time and end_time) else None

		return {
			"request_id": data_state.get("request_id"),
			"current_state": state.get("control_state"),
			"url": data_state.get("url"),
			"user_id": data_state.get("user_id"),
			"decision": metadata.get("decision"),
			"source": metadata.get("source"),
			"ai_used": metadata.get("ai_used"),
			"cache_lookup_status": metadata.get("cache_lookup_status"),
			"cache_update_status": metadata.get("cache_update_status"),
			"transition_log": exec_state.get("transition_log", []),
			"timestamps": timestamps,
			"retry_count": exec_state.get("retry_count", 0),
			"errors": exec_state.get("errors", []),
			"duration_seconds": duration_seconds,
			"result_metadata": metadata,
		}
