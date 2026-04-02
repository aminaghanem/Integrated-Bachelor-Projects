import json
import os
import uuid
from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import uvicorn
import validators
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from state_manager import RedisStateManager
from states import ControlState


class Decision(str, Enum):
	ALLOWED = "Allowed"
	BLOCKED = "Blocked"


@dataclass
class StudentProfile:
	user_id: str
	age: int
	grade_level: int


@dataclass
class AccessPolicy:
	url: str
	category: str
	reason: str
	allowed_for_user_ids: List[str]
	min_age: Optional[int]
	max_age: Optional[int]
	min_grade_level: Optional[int]
	max_grade_level: Optional[int]


@dataclass
class OrchestrationResult:
	request_id: str
	normalized_url: str
	profile: StudentProfile
	policy: AccessPolicy
	decision: Decision
	ui_message: str
	retrigger_browser: bool
	source: str


class InvalidUrlError(ValueError):
	def __init__(self, request_id: str, message: str) -> None:
		super().__init__(message)
		self.request_id = request_id


class CacheApiClient:
	def __init__(self, get_endpoint: str, post_endpoint: str, timeout_seconds: int = 4) -> None:
		self.get_endpoint = get_endpoint.strip()
		self.post_endpoint = post_endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def get_policy(self, url: str) -> Optional[AccessPolicy]:
		if not self.get_endpoint:
			return None

		endpoint = self._append_query(self.get_endpoint, {"url": url})
		try:
			payload = self._request_json("GET", endpoint)
		except (HTTPError, URLError, TimeoutError, ValueError):
			return None

		policy_payload = payload.get("policy") if isinstance(payload, dict) else None
		if policy_payload is None and isinstance(payload, dict):
			policy_payload = payload

		if not isinstance(policy_payload, dict):
			return None

		return self._policy_from_payload(url, policy_payload)

	def post_policy(self, policy: AccessPolicy) -> None:
		if not self.post_endpoint:
			return

		payload = {"url": policy.url, "policy": asdict(policy)}
		try:
			self._request_json("POST", self.post_endpoint, payload)
		except (HTTPError, URLError, TimeoutError, ValueError):
			return

	def _request_json(self, method: str, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
		data = None
		headers = {"Accept": "application/json"}
		if payload is not None:
			data = json.dumps(payload).encode("utf-8")
			headers["Content-Type"] = "application/json"

		request = Request(endpoint, data=data, headers=headers, method=method)
		with urlopen(request, timeout=self.timeout_seconds) as response:
			content = response.read().decode("utf-8").strip()
			if not content:
				return {}
			parsed = json.loads(content)
			if not isinstance(parsed, dict):
				raise ValueError("Expected JSON object response")
			return parsed

	@staticmethod
	def _append_query(base_url: str, params: Dict[str, str]) -> str:
		joiner = "&" if "?" in base_url else "?"
		return f"{base_url}{joiner}{urlencode(params)}"

	@staticmethod
	def _policy_from_payload(url: str, payload: Dict[str, Any]) -> AccessPolicy:
		return AccessPolicy(
			url=payload.get("url", url),
			category=str(payload.get("category", "General")),
			reason=str(payload.get("reason", "No reason provided.")),
			allowed_for_user_ids=[str(user_id) for user_id in payload.get("allowed_for_user_ids", [])],
			min_age=_to_optional_int(payload.get("min_age")),
			max_age=_to_optional_int(payload.get("max_age")),
			min_grade_level=_to_optional_int(payload.get("min_grade_level")),
			max_grade_level=_to_optional_int(payload.get("max_grade_level")),
		)


class AIServiceClient:
	def __init__(self, endpoint: str, timeout_seconds: int = 8) -> None:
		self.endpoint = endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def classify_url(self, url: str) -> AccessPolicy:
		if self.endpoint:
			try:
				payload = self._request_json("POST", self.endpoint, {"url": url})
				policy_payload = payload.get("policy") if isinstance(payload, dict) else None
				if policy_payload is None and isinstance(payload, dict):
					policy_payload = payload
				if isinstance(policy_payload, dict):
					return CacheApiClient._policy_from_payload(url, policy_payload)
			except (HTTPError, URLError, TimeoutError, ValueError):
				pass

		# Fallback behavior for local testing when AI endpoint is unavailable.
		lowered = url.lower()
		if any(keyword in lowered for keyword in ["adult", "gambling", "violence"]):
			return AccessPolicy(
				url=url,
				category="Sensitive Content",
				reason="AI fallback: restricted keyword detected.",
				allowed_for_user_ids=[],
				min_age=18,
				max_age=None,
				min_grade_level=None,
				max_grade_level=None,
			)

		return AccessPolicy(
			url=url,
			category="General",
			reason="AI fallback: allowed for all profiles.",
			allowed_for_user_ids=[],
			min_age=None,
			max_age=None,
			min_grade_level=None,
			max_grade_level=None,
		)

	def _request_json(self, method: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
		data = json.dumps(payload).encode("utf-8")
		request = Request(
			endpoint,
			data=data,
			headers={"Accept": "application/json", "Content-Type": "application/json"},
			method=method,
		)
		with urlopen(request, timeout=self.timeout_seconds) as response:
			content = response.read().decode("utf-8").strip()
			if not content:
				return {}
			parsed = json.loads(content)
			if not isinstance(parsed, dict):
				raise ValueError("Expected JSON object response")
			return parsed


class Orchestrator:
	def __init__(
		self,
		cache_client: CacheApiClient,
		ai_client: AIServiceClient,
		state_manager: RedisStateManager,
	) -> None:
		self.cache_client = cache_client
		self.ai_client = ai_client
		self.state_manager = state_manager

	def handle_url_request(self, profile: StudentProfile, raw_url: str) -> OrchestrationResult:
		request_id = str(uuid.uuid4())
		self.state_manager.create_request(request_id, profile.user_id, raw_url)
		self.state_manager.update_state(request_id, ControlState.PROFILE_RETRIEVED)

		try:
			normalized_url = self._normalize_url(raw_url)
		except ValueError:
			self.state_manager.update_state(request_id, ControlState.FAILED)
			raise InvalidUrlError(request_id=request_id, message="URL is not valid")

		self.state_manager.update_state(request_id, ControlState.CACHE_CHECK)
		policy = self.cache_client.get_policy(normalized_url)
		source = "cache"

		if policy is None:
			self.state_manager.update_state(request_id, ControlState.AI_ANALYSIS)
			policy = self.ai_client.classify_url(normalized_url)
			self.cache_client.post_policy(policy)
			source = "ai"

		decision = self._decide(profile, policy)
		self.state_manager.update_state(request_id, ControlState.ACCESS_DECIDED)
		self.state_manager.update_state(request_id, ControlState.COMPLETED)

		return OrchestrationResult(
			request_id=request_id,
			normalized_url=normalized_url,
			profile=profile,
			policy=policy,
			decision=decision,
			ui_message=self._build_ui_feedback(decision, policy),
			retrigger_browser=False,
			source=source,
		)

	@staticmethod
	def _normalize_url(raw_url: str) -> str:
		url = raw_url.strip()
		if not url:
			raise ValueError("URL cannot be empty.")

		if "://" not in url:
			url = f"https://{url}"

		parsed = urlparse(url)
		if parsed.scheme not in {"http", "https"}:
			raise ValueError("Only http/https URLs are supported.")
		if not parsed.netloc:
			raise ValueError("Invalid URL. Please provide a valid domain.")

		# Use library validation, but keep localhost/internal hosts valid for school networks.
		if not validators.url(url):
			hostname = (parsed.hostname or "").strip().lower()
			if not hostname:
				raise ValueError("Invalid URL. Please provide a valid domain.")
			if hostname != "localhost" and "." in hostname:
				raise ValueError("Invalid URL. Please provide a valid domain.")
		return parsed.geturl()

	@staticmethod
	def _decide(profile: StudentProfile, policy: AccessPolicy) -> Decision:
		if policy.allowed_for_user_ids and profile.user_id not in policy.allowed_for_user_ids:
			return Decision.BLOCKED
		if policy.min_age is not None and profile.age < policy.min_age:
			return Decision.BLOCKED
		if policy.max_age is not None and profile.age > policy.max_age:
			return Decision.BLOCKED
		if policy.min_grade_level is not None and profile.grade_level < policy.min_grade_level:
			return Decision.BLOCKED
		if policy.max_grade_level is not None and profile.grade_level > policy.max_grade_level:
			return Decision.BLOCKED
		return Decision.ALLOWED

	@staticmethod
	def _build_ui_feedback(decision: Decision, policy: AccessPolicy) -> str:
		if decision == Decision.ALLOWED:
			return "Allowed: Redirecting student to the website."
		return f"Blocked: {policy.reason}"


class StudentProfileInput(BaseModel):
	user_id: str = Field(..., min_length=1)
	age: int = Field(..., ge=1)
	grade_level: int = Field(..., ge=1)


class EvaluateRequest(BaseModel):
	url: str
	profile: StudentProfileInput


class AccessPolicyResponse(BaseModel):
	url: str
	category: str
	reason: str
	allowed_for_user_ids: List[str]
	min_age: Optional[int]
	max_age: Optional[int]
	min_grade_level: Optional[int]
	max_grade_level: Optional[int]
	source: str


class EvaluateResponse(BaseModel):
	request_id: str
	normalized_url: str
	profile: StudentProfileInput
	policy: Optional[AccessPolicyResponse]
	decision: str
	ui_message: str
	retrigger_browser: bool


app = FastAPI(title="SmartGuard Orchestrator", version="0.2.0")
orchestrator = Orchestrator(
	cache_client=CacheApiClient(
		get_endpoint=os.getenv("YASSIN_CACHE_GET_URL", ""),
		post_endpoint=os.getenv("YASSIN_CACHE_POST_URL", ""),
	),
	ai_client=AIServiceClient(endpoint=os.getenv("AI_POLICY_API_URL", "")),
	state_manager=RedisStateManager(),
)


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_url(request: EvaluateRequest) -> EvaluateResponse:
	"""Evaluate URL access using student profile supplied directly by the browser UI."""
	profile = StudentProfile(**request.profile.model_dump())

	try:
		result = orchestrator.handle_url_request(profile=profile, raw_url=request.url)
	except InvalidUrlError as exc:
		return EvaluateResponse(
			request_id=exc.request_id,
			normalized_url="",
			profile=request.profile,
			policy=None,
			decision=Decision.BLOCKED.value,
			ui_message=f"Invalid URL: {str(exc)}",
			retrigger_browser=True,
		)
	except Exception as exc:
		raise HTTPException(status_code=502, detail=f"Orchestrator error: {str(exc)}")

	return EvaluateResponse(
		request_id=result.request_id,
		normalized_url=result.normalized_url,
		profile=StudentProfileInput(**asdict(result.profile)),
		policy=AccessPolicyResponse(**asdict(result.policy), source=result.source),
		decision=result.decision.value,
		ui_message=result.ui_message,
		retrigger_browser=result.retrigger_browser,
	)


@app.get("/health")
def health_check() -> Dict[str, str]:
	return {"status": "healthy"}


def main() -> None:
	uvicorn.run(app, host="127.0.0.1", port=8000)


def _to_optional_int(value: Any) -> Optional[int]:
	if value is None:
		return None
	try:
		return int(value)
	except (TypeError, ValueError):
		return None


if __name__ == "__main__":
	main()