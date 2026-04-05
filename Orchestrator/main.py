import json
import os
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request as UrlRequest, urlopen

import uvicorn
import validators
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from state_manager import RedisStateManager
from states import ControlState


def _load_env_file(path: str) -> None:
	if not os.path.exists(path):
		return

	with open(path, "r", encoding="utf-8") as env_file:
		for raw_line in env_file:
			line = raw_line.strip()
			if not line or line.startswith("#") or "=" not in line:
				continue
			key, value = line.split("=", 1)
			key = key.strip()
			value = value.strip().strip('"').strip("'")
			if key and key not in os.environ:
				os.environ[key] = value


_load_env_file(os.path.join(os.path.dirname(__file__), ".env"))


class Decision(str, Enum):
	ALLOWED = "Allowed"
	BLOCKED = "Blocked"


@dataclass
class StudentProfile:
	user_id: str
	age: int
	grade_level: int
	interests: List[Dict[str, Any]]


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
	cache_lookup_status: str
	cache_update_status: str
	ai_used: bool


@dataclass
class AIAnalysisResult:
	policy: AccessPolicy
	raw_response: Dict[str, Any]
	used_fallback: bool
	model_response: Optional[Dict[str, Any]]


class InvalidUrlError(ValueError):
	def __init__(self, request_id: str, message: str) -> None:
		super().__init__(message)
		self.request_id = request_id


class CacheApiClient:
	def __init__(self, get_endpoint: str, post_endpoint: str, timeout_seconds: int = 4) -> None:
		self.get_endpoint = get_endpoint.strip()
		self.post_endpoint = post_endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def get_policy(self, url: str, student_id: str) -> tuple[str, Optional[AccessPolicy]]:
		if not self.get_endpoint:
			return "disabled", None

		try:
			payload = self._request_json(
				"POST",
				self.get_endpoint,
				{"url": url, "student_id": student_id},
			)
		except HTTPError as error:
			if error.code == 404:
				print(f"Cache miss for url={url} student_id={student_id}")
				return "miss", None
			print(f"Cache analyze HTTP error {error.code}: {error}")
			return "error", None
		except (URLError, TimeoutError, ValueError) as error:
			print(f"Cache analyze request failed: {error}")
			return "error", None

		if not isinstance(payload, dict):
			return "error", None

		return "hit", self._policy_from_payload(url, payload)

	def post_policy(self, ai_response: Dict[str, Any], student_id: str) -> str:
		if not self.post_endpoint:
			return "disabled"

		endpoint = self._append_query(self.post_endpoint, {"student_id": student_id})
		try:
			self._request_json("POST", endpoint, ai_response)
			return "updated"
		except (HTTPError, URLError, TimeoutError, ValueError) as error:
			print(f"Cache update request failed: {error}")
			return "failed"

	def _request_json(self, method: str, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
		data = None
		headers = {"Accept": "application/json"}
		if payload is not None:
			data = json.dumps(payload).encode("utf-8")
			headers["Content-Type"] = "application/json"

		print(f"Cache request: {method} {endpoint} payload={payload}")
		request = UrlRequest(endpoint, data=data, headers=headers, method=method)
		with urlopen(request, timeout=self.timeout_seconds) as response:
			print(f"Cache response status: {response.status}")
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
		data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
		category = data.get("category") or data.get("genre") or "General"
		reason = data.get("reason") or data.get("explanation") or "No reason provided."

		return AccessPolicy(
			url=data.get("url", url),
			category=str(category),
			reason=str(reason),
			allowed_for_user_ids=[str(user_id) for user_id in data.get("allowed_for_user_ids", [])],
			min_age=_to_optional_int(data.get("min_age")),
			max_age=_to_optional_int(data.get("max_age")),
			min_grade_level=_to_optional_int(data.get("min_grade_level")),
			max_grade_level=_to_optional_int(data.get("max_grade_level")),
		)


class AIServiceClient:
	def __init__(self, endpoint: str, timeout_seconds: int = 8) -> None:
		self.endpoint = endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def classify_url(self, url: str) -> AIAnalysisResult:
		if self.endpoint:
			try:
				payload = self._request_json("POST", self.endpoint, {"url": url})
				policy_payload = payload.get("policy") if isinstance(payload, dict) else None
				if policy_payload is None and isinstance(payload, dict):
					policy_payload = payload
				if isinstance(policy_payload, dict):
					policy = CacheApiClient._policy_from_payload(url, policy_payload)
					return AIAnalysisResult(policy=policy, raw_response=payload, used_fallback=False, model_response=payload)
			except (HTTPError, URLError, TimeoutError, ValueError):
				pass

		# Fallback behavior for local testing when AI endpoint is unavailable.
		lowered = url.lower()
		if any(keyword in lowered for keyword in ["adult", "gambling", "violence"]):
			policy = AccessPolicy(
				url=url,
				category="Sensitive Content",
				reason="AI fallback: restricted keyword detected.",
				allowed_for_user_ids=[],
				min_age=18,
				max_age=None,
				min_grade_level=None,
				max_grade_level=None,
			)
			return AIAnalysisResult(
				policy=policy,
				raw_response={
					"url": url,
					"safety_status": "unsafe",
					"risk_level": "high",
					"explanation": policy.reason,
					"genre": "sensitive-content",
					"last_analysed_date": datetime.now(timezone.utc).isoformat(),
				},
				used_fallback=True,
				model_response=None,
			)

		policy = AccessPolicy(
			url=url,
			category="General",
			reason="AI fallback: allowed for all profiles.",
			allowed_for_user_ids=[],
			min_age=None,
			max_age=None,
			min_grade_level=None,
			max_grade_level=None,
		)
		return AIAnalysisResult(
			policy=policy,
			raw_response={
				"url": url,
				"safety_status": "safe",
				"risk_level": "low",
				"explanation": policy.reason,
				"genre": "general",
				"last_analysed_date": datetime.now(timezone.utc).isoformat(),
			},
			used_fallback=True,
			model_response=None,
		)

	def _request_json(self, method: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
		data = json.dumps(payload).encode("utf-8")
		request = UrlRequest(
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

		try:
			self.state_manager.update_state(request_id, ControlState.CACHE_CHECK)
			cache_lookup_status, policy = self.cache_client.get_policy(normalized_url, profile.user_id)
			source = "cache" if cache_lookup_status == "hit" else "ai"
			cache_update_status = "not_needed"
			ai_used = False

			if policy is None:
				self.state_manager.update_state(request_id, ControlState.AI_ANALYSIS)
				ai_result = self.ai_client.classify_url(normalized_url)
				policy = ai_result.policy
				cache_update_status = self.cache_client.post_policy(ai_result.raw_response, profile.user_id)
				source = "ai"
				ai_used = True

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
				cache_lookup_status=cache_lookup_status,
				cache_update_status=cache_update_status,
				ai_used=ai_used,
			)
		except Exception:
			self.state_manager.update_state(request_id, ControlState.FAILED)
			raise

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


class InterestInput(BaseModel):
	interest: str = Field(..., min_length=1)
	rating: int


class EvaluateRequest(BaseModel):
	url: str
	user_id: str = Field(..., min_length=1, pattern=r"^[a-fA-F0-9]{24}$")
	age: int = Field(..., ge=1)
	grade_level: int = Field(..., ge=1)
	interests: List[InterestInput] = Field(default_factory=list)


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
	profile: Dict[str, Any]
	policy: Optional[AccessPolicyResponse]
	decision: str
	ui_message: str
	retrigger_browser: bool
	source: str
	cache_lookup_status: str
	cache_update_status: str
	ai_used: bool


app = FastAPI(title="SmartGuard Orchestrator", version="0.2.0")

default_cache_base_url = os.getenv("YASSIN_CACHE_BASE_URL", "https://logan-unroosted-jenine.ngrok-free.dev").rstrip("/")
default_analyze_url = f"{default_cache_base_url}/analyze"
default_update_url = f"{default_cache_base_url}/cache/update"

orchestrator = Orchestrator(
	cache_client=CacheApiClient(
		get_endpoint=os.getenv("YASSIN_CACHE_ANALYZE_URL", default_analyze_url),
		post_endpoint=os.getenv("YASSIN_CACHE_UPDATE_URL", default_update_url),
	),
	ai_client=AIServiceClient(endpoint=os.getenv("AI_POLICY_API_URL", "")),
	state_manager=RedisStateManager(),
)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
	return JSONResponse(
		status_code=400,
		content={
			"error": "Invalid payload",
			"message": "Expected url, user_id, age, grade_level, interests[]",
			"details": exc.errors(),
			"path": str(request.url.path),
		},
	)


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_url(request: EvaluateRequest) -> EvaluateResponse:
	"""Evaluate URL access using browser payload with profile fields at root level."""
	profile = StudentProfile(
		user_id=request.user_id,
		age=request.age,
		grade_level=request.grade_level,
		interests=[interest.model_dump() for interest in request.interests],
	)

	try:
		result = orchestrator.handle_url_request(profile=profile, raw_url=request.url)
	except InvalidUrlError as exc:
		return EvaluateResponse(
			request_id=exc.request_id,
			normalized_url="",
			profile=asdict(profile),
			policy=None,
			decision=Decision.BLOCKED.value,
			ui_message=f"Invalid URL: {str(exc)}",
			retrigger_browser=True,
			source="invalid-url",
			cache_lookup_status="not_attempted",
			cache_update_status="not_attempted",
			ai_used=False,
		)
	except Exception as exc:
		raise HTTPException(status_code=502, detail=f"Orchestrator error: {str(exc)}")

	return EvaluateResponse(
		request_id=result.request_id,
		normalized_url=result.normalized_url,
		profile=asdict(result.profile),
		policy=AccessPolicyResponse(**asdict(result.policy), source=result.source),
		decision=result.decision.value,
		ui_message=result.ui_message,
		retrigger_browser=result.retrigger_browser,
		source=result.source,
		cache_lookup_status=result.cache_lookup_status,
		cache_update_status=result.cache_update_status,
		ai_used=result.ai_used,
	)


@app.get("/health")
def health_check() -> Dict[str, str]:
	return {"status": "healthy"}


def main() -> None:
	print(f"Cache analyze endpoint: {orchestrator.cache_client.get_endpoint or 'disabled'}")
	print(f"Cache update endpoint: {orchestrator.cache_client.post_endpoint or 'disabled'}")
	print(f"AI endpoint: {orchestrator.ai_client.endpoint or 'fallback-only'}")
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