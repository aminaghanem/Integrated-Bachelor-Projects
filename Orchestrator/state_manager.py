import json
import time
from enum import Enum
from redis_client import r
from states import ControlState


class RedisStateManager:
    def create_request(self, request_id, user_id, url):
        state = {
            "control_state": ControlState.REQUEST_INITIATED.value,
            "data_state": {
                "request_id": request_id,
                "user_id": user_id,
                "url": url
            },
            "execution_state": {
                "retry_count": 0,
                "timestamps": {}
            }
        }
        r.set(f"request:{request_id}", json.dumps(state))

    def get_state(self, request_id):
        data = r.get(f"request:{request_id}")
        return json.loads(data) if data else None

    def update_state(self, request_id, new_state):
        state = self.get_state(request_id)
        if state is None:
            return

        state_value = new_state.value if isinstance(new_state, ControlState) else str(new_state)
        state["control_state"] = state_value
        state["execution_state"]["timestamps"][state_value] = time.time()
        r.set(f"request:{request_id}", json.dumps(state))