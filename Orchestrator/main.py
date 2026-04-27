import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urlparse
from urllib.request import Request as UrlRequest, urlopen

import uvicorn
import validators
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator

from state_manager import RedisStateManager
from states import ControlState


def _load_env_file(path: str) -> None:
	"""
	Load environment variables from a .env file into os.environ.

	Skips blank lines and comments (lines starting with '#').
	Does NOT overwrite variables that are already set in the environment,
	so system-level env vars always take priority over the .env file.

	Args:
		path: Absolute or relative path to the .env file.
	"""
	if not os.path.exists(path):
		return # Silently skip if no .env file is present

	with open(path, "r", encoding="utf-8") as env_file:
		for raw_line in env_file:
			line = raw_line.strip()
	
			# Skip empty lines, comments, and lines without an '=' separator
			if not line or line.startswith("#") or "=" not in line:
				continue
			# Split only on the first '=' so values can contain '=' themselves
			key, value = line.split("=", 1)
			key = key.strip()

			# Strip surrounding quotes from the value (both single and double)
			value = value.strip().strip('"').strip("'")
			
			# Only set if the key isn't already defined in the environment
			if key and key not in os.environ:
				os.environ[key] = value

# Load .env from the same directory as this file at import time
_load_env_file(os.path.join(os.path.dirname(__file__), ".env"))

# ---------------------------------------------------------------------------
# Core enums and dataclasses
# ---------------------------------------------------------------------------

class Decision(str, Enum):
	"""Final access verdict for a URL request."""
	ALLOWED = "Allowed"
	BLOCKED = "Blocked"


@dataclass
class StudentProfile:
	"""
	Represents the student making the URL request.

	Attributes:
		user_id:     MongoDB ObjectId (24-char hex) identifying the student.
		age:         Student's age in years.
		grade_level: School grade (e.g. 1–12).
		interests:   List of interest dicts, each with 'interest' and 'rating' keys.
		sensory_limitations: List of declared sensory accessibility limitations.
		neurodiversity_flags: List of declared neurodiversity-related flags.
		has_accessibility_needs: Whether any accessibility accommodations are needed.
	"""
	user_id: str
	age: int
	grade_level: int
	interests: List[Dict[str, Any]]
	sensory_limitations: List[str]
	neurodiversity_flags: List[str]
	has_accessibility_needs: bool


@dataclass
class AccessPolicy:
	"""
	Full content classification and access rules for a given URL.

	Most fields come directly from the AI analysis or cache response.
	The min/max age and grade fields are parsed from the human-readable
	strings and used for numeric comparisons during the access decision.

	Attributes:
		url:                    The URL that was classified.
		category:               Broad content category (e.g. "Education", "Social Media").
		age_restriction:        Human-readable age restriction string (e.g. "13+").
		educational_genre:      Sub-category relevant to schooling (e.g. "Science").
		suitability_for_school: "Suitable" or "Unsuitable".
		recommended_grade_level: Grade range string (e.g. "6-8").
		unsuitability_reasons:  Why the URL is unsuitable, if applicable.
		ai_generated:           Whether the content is AI-generated ("Real" / "AI").
		accessibility_score:    Accessibility rating of the page.
		safe_alternatives:      List of alternative URLs suggested for blocked content.
		timing_breakdown:       Optional dict of profiling timings from the AI service.
		reason:                 Human-readable explanation of the policy decision.
		allowed_for_user_ids:   Explicit allowlist; empty means open to all.
		min_age:                Parsed minimum age (None = no lower bound).
		max_age:                Parsed maximum age (None = no upper bound).
		min_grade_level:        Parsed minimum grade (None = no lower bound).
		max_grade_level:        Parsed maximum grade (None = no upper bound).
	"""
	url: str
	category: str
	age_restriction: str
	educational_genre: str
	suitability_for_school: str
	recommended_grade_level: Optional[str]
	unsuitability_reasons: Optional[str]
	ai_generated: str
	accessibility_score: str
	safe_alternatives: List[str]
	timing_breakdown: Optional[Dict[str, float]]
	reason: str
	allowed_for_user_ids: List[str]
	min_age: Optional[int]
	max_age: Optional[int]
	min_grade_level: Optional[int]
	max_grade_level: Optional[int]


@dataclass
class OrchestrationResult:
	"""
	The complete output of a single URL evaluation pipeline run.

	Attributes:
		request_id:          UUID assigned to this request for tracing.
		normalized_url:      The URL after normalization (scheme added, etc.).
		profile:             The student profile used for the decision.
		policy:              The access policy retrieved from cache or AI.
		decision:            ALLOWED or BLOCKED.
		ui_message:          Human-readable message to display in the browser extension.
		retrigger_browser:   Whether the browser should retry the navigation.
		source:              Where the policy came from: "cache", "ai", or "keyword-filter".
		cache_lookup_status: "hit", "miss", "error", "disabled", or "not_attempted".
		cache_update_status: "updated", "failed", "disabled", or "not_needed".
		ai_used:             True if the AI service was called for this request.
	"""
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
	"""
	The result of an AI analysis request for a URL.

	Attributes:
		policy:         The parsed access policy generated by the AI service.
		raw_response:   The full raw JSON response returned by the AI endpoint.
		used_fallback:  Reserved flag for compatibility; currently always False.
		model_response: Optional copy of the model output payload.
	"""
	policy: AccessPolicy
	raw_response: Dict[str, Any]
	used_fallback: bool
	model_response: Optional[Dict[str, Any]]

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class InvalidUrlError(ValueError):
	"""
	Raised when the submitted URL cannot be normalized or validated.

	Carries the request_id so the API layer can include it in the error
	response without a separate lookup.
	"""
	def __init__(self, request_id: str, message: str) -> None:
		super().__init__(message)
		self.request_id = request_id

# ---------------------------------------------------------------------------
# Cache API client
# ---------------------------------------------------------------------------

class CacheApiClient:
	"""
	HTTP client for the policy cache service.

	The cache stores previously computed AI classifications so the AI
	service doesn't have to be called for every repeated URL visit.

	Two endpoints are used:
	  - Analyze (POST): look up an existing policy for a URL + student pair.
	  - POST (update):  store a newly computed AI policy in the cache.
	"""
	def __init__(self, get_endpoint: str, post_endpoint: str, timeout_seconds: int = 600) -> None:
		"""
		Args:
			get_endpoint:     URL of the cache lookup endpoint.
			post_endpoint:    URL of the cache update endpoint.
			timeout_seconds:  HTTP request timeout (default 10 minutes for slow AI chains).
		"""
		self.get_endpoint = get_endpoint.strip()
		self.post_endpoint = post_endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def get_policy(self, url: str, student_id: str) -> tuple[str, Optional[AccessPolicy]]:
		"""
		Look up a cached policy for the given URL and student.

		Returns:
			A (status, policy) tuple where status is one of:
			  "disabled"   endpoint not configured
			  "hit"        policy found and returned
			  "miss"       no cached entry (HTTP 404)
			  "error"      request failed for any other reason
			policy is None for every status except "hit".
		"""
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
				# 404 is the expected "not in cache" response – not an error
				print(f"Cache miss for url={url} student_id={student_id}")
				return "miss", None
			print(f"Cache analyze HTTP error {error.code}: {error}")
			return "error", None
		except (URLError, TimeoutError, ValueError, OSError) as error:
			print(f"Cache analyze request failed: {error}")
			return "error", None

		if not isinstance(payload, dict):
			return "error", None

		return "hit", self._policy_from_payload(url, payload)

	def post_policy(self, ai_response: Dict[str, Any], student_id: str) -> str:
		"""
		Store an AI-generated policy in the cache.

		Args:
			ai_response: The raw JSON dict returned by the AI service.
			student_id:  The student's ID, appended as a query parameter.

		Returns:
			"disabled"   endpoint not configured
			"updated"    cache updated successfully
			"failed"     request failed
		"""
		if not self.post_endpoint:
			return "disabled"
		
		# Append student_id as a query parameter to the update URL
		endpoint = self._append_query(self.post_endpoint, {"student_id": student_id})
		try:
			self._request_json("POST", endpoint, ai_response)
			return "updated"
		except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
			print(f"Cache update request failed: {error}")
			return "failed"

	def _request_json(self, method: str, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
		"""
		Make an HTTP request and parse the JSON response body.

		Args:
			method:   HTTP verb ("GET", "POST", etc.).
			endpoint: Full URL to request.
			payload:  Optional dict to send as a JSON body.

		Returns:
			Parsed response as a dict.

		Raises:
			ValueError:   If the response body is not a JSON object.
			HTTPError:    On non-2xx HTTP status codes.
			URLError:     On network-level failures.
			TimeoutError: If the request exceeds timeout_seconds.
		"""
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
				return {} # Treat empty body as an empty object
			parsed = json.loads(content)
			if not isinstance(parsed, dict):
				raise ValueError("Expected JSON object response")
			return parsed

	@staticmethod
	def _append_query(base_url: str, params: Dict[str, str]) -> str:
		"""
		Append URL query parameters to a base URL.

		Correctly uses '?' or '&' depending on whether query params already exist.
		"""
		joiner = "&" if "?" in base_url else "?"
		return f"{base_url}{joiner}{urlencode(params)}"

	@staticmethod
	def _policy_from_payload(url: str, payload: Dict[str, Any]) -> AccessPolicy:
		"""
		Parse a raw cache/AI JSON payload into an AccessPolicy dataclass.

		The payload structure can vary: the policy data may live at the top
		level or nested under "data", "policy", or "classification" keys.
		This method checks each candidate key in order and uses the first
		dict it finds.

		Args:
			url:     Fallback URL if the payload doesn't include one.
			payload: Raw JSON dict from the cache or AI service.

		Returns:
			A fully populated AccessPolicy instance.
		"""
		# Walk known wrapper keys to find the actual policy data dict.
		# Some cache responses are nested like data -> classification -> {policy fields}.
		data: Dict[str, Any] = payload if isinstance(payload, dict) else {}
		for _ in range(5):
			next_data: Optional[Dict[str, Any]] = None
			for key in ("data", "policy", "classification"):
				candidate = data.get(key)
				if isinstance(candidate, dict):
					next_data = candidate
					break
			if next_data is None:
				break
			data = next_data

		# --- Age restriction ---
		age_restriction = str(data.get("age_restriction") or "All Ages")
		min_age = _parse_age_restriction(age_restriction)
		max_age = None

		# --- Grade level ---
		recommended_grade_level = data.get("recommended_grade_level")
		min_grade_level, max_grade_level = _parse_grade_range(recommended_grade_level)

		suitability_for_school = str(data.get("suitability_for_school") or "Suitable")

		# --- Unsuitability reasons: accept list or plain string ---
		unsuitability_raw = data.get("unsuitability_reasons")
		if isinstance(unsuitability_raw, list):
			# Take only the first reason if a list is provided, to avoid overwhelming the UI
			unsuitability_reasons = str(unsuitability_raw[0]).strip() if unsuitability_raw else None
		elif unsuitability_raw is None:
			unsuitability_reasons = None
		else:
			unsuitability_reasons = str(unsuitability_raw).strip() or None

		ai_generated = str(data.get("ai_generated") or "Real")
		accessibility_score = str(data.get("accessibility_score") or "Accessible")

		# --- Safe alternatives: must be a list of non-empty strings ---
		safe_alternatives_raw = data.get("safe_alternatives")
		safe_alternatives: List[str] = []
		if isinstance(safe_alternatives_raw, list):
			safe_alternatives = [str(value).strip() for value in safe_alternatives_raw if str(value).strip()]

		# --- Timing breakdown: must be a dict mapping strings to floats ---
		timing_breakdown_raw = data.get("timing_breakdown")
		timing_breakdown: Optional[Dict[str, float]] = None
		if isinstance(timing_breakdown_raw, dict):
			timing_breakdown = {
				str(key): converted
				for key, value in timing_breakdown_raw.items()
				for converted in [_to_optional_float(value)]
				if converted is not None  # Drop keys whose values can't be converted to float
			}

		# --- Reason / explanation fallback chain ---
		reason = str(data.get("reason") or data.get("explanation") or "").strip()
		if not reason:
			# Build a sensible default reason if none was provided by the service
			if suitability_for_school.lower() == "unsuitable":
				reason = unsuitability_reasons or "Marked unsuitable for school use."
			elif age_restriction.lower() != "all ages":
				reason = f"Age restriction: {age_restriction}."
			else:
				reason = "No reason provided."

		return AccessPolicy(
			url=data.get("url", url),
			category=str(data.get("category") or "Other"),
			age_restriction=age_restriction,
			educational_genre=str(data.get("educational_genre") or "Other"),
			suitability_for_school=suitability_for_school,
			recommended_grade_level=str(recommended_grade_level) if recommended_grade_level else None,
			unsuitability_reasons=unsuitability_reasons,
			ai_generated=ai_generated,
			accessibility_score=accessibility_score,
			safe_alternatives=safe_alternatives,
			timing_breakdown=timing_breakdown,
			reason=str(reason),
			allowed_for_user_ids=[str(user_id) for user_id in data.get("allowed_for_user_ids", [])],
			min_age=min_age,
			max_age=max_age,
			min_grade_level=min_grade_level,
			max_grade_level=max_grade_level,
		)

# ---------------------------------------------------------------------------
# AI service client
# ---------------------------------------------------------------------------

class AIServiceClient:
	"""
	HTTP client for the external AI URL classification service.

	When the cache has no entry for a URL, this client sends the URL to the
	AI service, which returns a full AccessPolicy classification.
	"""
	def __init__(self, endpoint: str, timeout_seconds: int = 600) -> None:
		"""
		Args:
			endpoint:        Full URL of the AI classification endpoint.
			timeout_seconds: HTTP request timeout (default 10 minutes).
		"""
		self.endpoint = endpoint.strip()
		self.timeout_seconds = timeout_seconds

	def classify_url(self, url: str) -> AIAnalysisResult:
		"""
		Submit a URL to the AI service and return a parsed AIAnalysisResult.

		The response JSON may wrap the policy under a "policy" or
		"classification" key; both are handled.

		Args:
			url: The normalized URL to classify.

		Returns:
			AIAnalysisResult containing the parsed policy and the raw response.

		Raises:
			RuntimeError: If the endpoint is not configured, the request fails,
			              or the response does not contain a valid policy object.
		"""
		if not self.endpoint:
			raise RuntimeError("AI endpoint is not configured")
		try:
			payload = self._request_json("POST", self.endpoint, {"url": url})
		except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
			raise RuntimeError(f"AI analysis request failed: {error}") from error

		print(f"AI response received for url={url}: {json.dumps(payload, ensure_ascii=True)}")

		# Locate the policy dict – it may be top-level or nested
		policy_payload = payload.get("policy") if isinstance(payload, dict) else None
		if policy_payload is None and isinstance(payload, dict):
			classification_payload = payload.get("classification")
			# Use "classification" if present, otherwise assume the whole payload is the policy
			policy_payload = classification_payload if isinstance(classification_payload, dict) else payload
		if not isinstance(policy_payload, dict):
			raise RuntimeError("AI analysis response does not contain a valid policy object")

		policy = CacheApiClient._policy_from_payload(url, policy_payload)
		return AIAnalysisResult(policy=policy, raw_response=payload, used_fallback=False, model_response=payload)

	def _request_json(self, method: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
		"""
		Make an HTTP request with a JSON body and return the parsed response.

		Args:
			method:   HTTP verb.
			endpoint: Target URL.
			payload:  Dict to serialize as the request body.

		Returns:
			Parsed response dict. Returns {} on an empty body.

		Raises:
			ValueError: If the response is not a JSON object.
		"""
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

# ---------------------------------------------------------------------------
# URL keyword filter
# ---------------------------------------------------------------------------

class UrlKeywordFilter:
	"""
	Fast, token-based keyword filter for URLs.

	Loads a JSON list of blocked terms (single words or multi-word phrases)
	from disk and checks whether any appear in a decoded URL string.

	Matching is case-insensitive and works on alphanumeric tokens extracted
	from the URL, so URL encoding and separators are ignored.

	Single-word terms are stored in a set for O(1) lookup.
	Multi-word phrases are grouped by length so only windows of the correct
	size are tested, reducing unnecessary comparisons.
	"""

	# Extracts sequences of lowercase letters and digits as tokens for matching
	TOKEN_PATTERN = re.compile(r"[a-z0-9]+")

	def __init__(self, list_path: str) -> None:
		"""
		Args:
			list_path: Path to the JSON file containing blocked terms.
			           The file should contain a flat JSON array of strings.
		"""
		self.list_path = list_path
		self.single_terms: Set[str] = set() # Single-token blocklist
		self.phrases_by_length: Dict[int, Set[Tuple[str, ...]]] = {} # Multi-token phrases keyed by token count
		self._load_terms()

	def match(self, url: str) -> Optional[str]:
		"""
		Check whether the URL contains any blocked term or phrase.

		Args:
			url: The URL string to check (should be normalized).

		Returns:
			The matched term/phrase string if a block is triggered, else None.
		"""
		decoded_url = self._decode_percent_encoding(url)
		tokens = self._tokenize(decoded_url)
		if not tokens:
			return None

		# 1. Quick single-token check
		for token in tokens:
			if token in self.single_terms:
				return token

		# 2. Phrase matching (look for longest phrases first to maximize match specificity)
		for phrase_length in sorted(self.phrases_by_length.keys(), reverse=True):
			phrases = self.phrases_by_length[phrase_length]
			if len(tokens) < phrase_length:
				continue # Not enough tokens for this phrase length
			for index in range(0, len(tokens) - phrase_length + 1):
				candidate = tuple(tokens[index : index + phrase_length])
				if candidate in phrases:
					return " ".join(candidate)

		return None

	def _load_terms(self) -> None:
		"""
		Read and parse the keyword list from disk.

		Populates self.single_terms and self.phrases_by_length.
		Logs a warning and leaves both collections empty if the file is
		missing or malformed (filter is effectively disabled in that case).
		"""
		if not os.path.exists(self.list_path):
			print(f"Keyword list not found at {self.list_path}; URL keyword filter disabled.")
			return

		try:
			with open(self.list_path, "r", encoding="utf-8") as words_file:
				content = words_file.read().strip()
				raw_terms = json.loads(content)
				if not isinstance(raw_terms, list):
					raw_terms = []
		except (OSError, json.JSONDecodeError) as error:
			print(f"Failed to load keyword list: {error}")
			return

		for term in raw_terms:
			tokens = self._tokenize(str(term))
			if not tokens:
				continue
			if len(tokens) == 1:
				# Single-word term → goes in the fast-lookup set
				self.single_terms.add(tokens[0])
				continue
			# Multi-word phrase → grouped by token count for windowed matching
			phrase = tuple(tokens)
			phrase_length = len(phrase)
			if phrase_length not in self.phrases_by_length:
				self.phrases_by_length[phrase_length] = set()
			self.phrases_by_length[phrase_length].add(phrase)

		print(
			f"Loaded URL keyword filter with {len(self.single_terms)} single terms and "
			f"{sum(len(value) for value in self.phrases_by_length.values())} phrases."
		)

	@classmethod
	def _tokenize(cls, value: str) -> List[str]:
		"""
		Extract all alphanumeric tokens from a string, lowercased.

		Example: "Hello-World/foo123" → ["hello", "world", "foo123"]
		"""
		return cls.TOKEN_PATTERN.findall(value.lower())

	@staticmethod
	def _decode_percent_encoding(value: str, max_passes: int = 3) -> str:
		"""
		Iteratively URL-decode a string until stable or max_passes reached.

		Multiple passes handle double-encoded URLs (e.g. %2520 → %20 → space).

		Args:
			value:      The string to decode.
			max_passes: Safety cap on decoding iterations.

		Returns:
			Fully decoded string.
		"""
		decoded = value
		for _ in range(max_passes):
			next_value = unquote(decoded)
			if next_value == decoded:
				break # No further decoding possible
			decoded = next_value
		return decoded

# ---------------------------------------------------------------------------
# Orchestrator – main pipeline
# ---------------------------------------------------------------------------

class Orchestrator:
	"""
	Coordinates the full URL evaluation pipeline for a student request.

	Pipeline order:
	  1. Assign a request ID and record initial state.
	  2. Normalize and validate the URL.
	  3. Run the URL keyword filter (instant block for obvious violations).
	  4. Check the policy cache.
	  5. If no cache hit, call the AI classification service.
	  6. Apply the access decision rules against the student profile.
	  7. Return the final OrchestrationResult.
	"""
	def __init__(
		self,
		cache_client: CacheApiClient,
		ai_client: AIServiceClient,
		keyword_filter: UrlKeywordFilter,
		state_manager: RedisStateManager,
	) -> None:
		self.cache_client = cache_client
		self.ai_client = ai_client
		self.keyword_filter = keyword_filter
		self.state_manager = state_manager  # Persists request state in Redis for tracing/monitoring

	def handle_url_request(self, profile: StudentProfile, raw_url: str) -> OrchestrationResult:
		"""
		Run the complete URL evaluation pipeline for a student.

		Args:
			profile: The student's profile (age, grade, interests, ID).
			raw_url: The raw URL string submitted by the browser extension.

		Returns:
			OrchestrationResult with decision, policy, and metadata.

		Raises:
			InvalidUrlError: If the URL cannot be normalized.
			Exception:       Propagates unexpected errors after marking the request FAILED.
		"""
		# Assign a unique ID to this request for tracing across services
		request_id = str(uuid.uuid4())
		self.state_manager.create_request(request_id, profile.user_id, raw_url)
		self.state_manager.update_state(request_id, ControlState.PROFILE_RETRIEVED)

		# --- Step 1: Normalize the URL ---
		try:
			normalized_url = self._normalize_url(raw_url)
		except ValueError:
			self.state_manager.update_state(request_id, ControlState.FAILED)
			raise InvalidUrlError(request_id=request_id, message="URL is not valid")

		# --- Step 2: Keyword filter (fast path for obvious violations) ---
		self.state_manager.update_state(request_id, ControlState.KEYWORD_FILTER_CHECK)
		matched_term = self.keyword_filter.match(normalized_url)
		if matched_term:
			# Build a synthetic blocked policy without hitting the cache or AI
			blocked_policy = AccessPolicy(
				url=normalized_url,
				category="URL Keyword Filter",
				age_restriction="All Ages",
				educational_genre="Other",
				suitability_for_school="Unsuitable",
				recommended_grade_level=None,
				unsuitability_reasons="Inappropriate Content",
				ai_generated="Real",
				accessibility_score="Not Accessible",
				safe_alternatives=[],
				timing_breakdown=None,
				reason=f"Blocked by URL keyword filter: detected '{matched_term}' as a URL segment.",
				allowed_for_user_ids=[],
				min_age=None,
				max_age=None,
				min_grade_level=None,
				max_grade_level=None,
			)
			self.state_manager.update_state(request_id, ControlState.ACCESS_DECIDED)
			self.state_manager.update_state(request_id, ControlState.COMPLETED)
			return OrchestrationResult(
				request_id=request_id,
				normalized_url=normalized_url,
				profile=profile,
				policy=blocked_policy,
				decision=Decision.BLOCKED,
				ui_message=self._build_ui_feedback(Decision.BLOCKED, blocked_policy),
				retrigger_browser=False,
				source="keyword-filter",
				cache_lookup_status="not_attempted",
				cache_update_status="not_attempted",
				ai_used=False,
			)

		# --- Steps 3 & 4: Cache lookup → AI fallback ---
		try:
			self.state_manager.update_state(request_id, ControlState.CACHE_CHECK)
			cache_lookup_status, policy = self.cache_client.get_policy(normalized_url, profile.user_id)
			source = "cache" if cache_lookup_status == "hit" else "ai"
			cache_update_status = "not_needed"
			ai_used = False

			if policy is None:
				# Cache miss (or error) – fall back to AI classification
				self.state_manager.update_state(request_id, ControlState.AI_ANALYSIS)
				ai_result = self.ai_client.classify_url(normalized_url)
				policy = ai_result.policy
				# Store the AI result in the cache for future requests
				cache_update_status = self.cache_client.post_policy(ai_result.raw_response, profile.user_id)
				source = "ai"
				ai_used = True

			# --- Step 5: Apply access decision rules ---
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
		"""
		Clean and validate a raw URL string.

		Handles common edge cases from browser extensions:
		  - Protocol-relative URLs ("//example.com") → prefixed with "https:"
		  - Scheme-less URLs ("example.com") → prefixed with "https://"
		  - Rejects non-http(s) schemes and URLs with no hostname.

		Localhost and single-label internal hostnames are allowed to support
		school network resources that wouldn't pass public URL validation.

		Args:
			raw_url: The raw URL submitted by the client.

		Returns:
			The canonical URL string from urllib.parse.

		Raises:
			ValueError: If the URL is empty, uses an unsupported scheme,
			            has no hostname, or fails validation.
		"""
		url = raw_url.strip()
		if not url:
			raise ValueError("URL cannot be empty.")

		# Normalize protocol-relative and scheme-less URLs to ensure consistent parsing and matching.
		if url.startswith("//"):
			url = f"https:{url}"
		elif "://" not in url:
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
		"""
		Apply access control rules and return ALLOWED or BLOCKED.

		Rules are evaluated in priority order; the first matching block wins:
		  1. Content is marked unsuitable for school.
		  2. URL has an explicit allowlist that doesn't include this student.
		  3. Student is below the minimum age.
		  4. Student is above the maximum age.
		  5. Student is below the minimum grade level.
		  6. Student is above the maximum grade level.

		Args:
			profile: The student requesting access.
			policy:  The content policy for the URL.

		Returns:
			Decision.BLOCKED or Decision.ALLOWED.
		"""
		if policy.suitability_for_school.strip().lower() == "unsuitable":
			return Decision.BLOCKED
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
		"""
		Build the short message displayed to the student in the browser extension.

		Args:
			decision: The access decision.
			policy:   Used to include the block reason for BLOCKED decisions.

		Returns:
			A user-facing string.
		"""
		if decision == Decision.ALLOWED:
			return "Allowed: Redirecting student to the website."
		return f"Blocked: {policy.reason}"

# ---------------------------------------------------------------------------
# Pydantic request / response models (FastAPI layer)
# ---------------------------------------------------------------------------

class InterestInput(BaseModel):
	"""A single student interest with a 1–5 rating."""
	interest: str = Field(..., min_length=1)
	rating: int = Field(..., ge=1, le=5)


class EvaluateRequest(BaseModel):
	"""
	Payload sent by the browser extension to the /evaluate endpoint.

	user_id must be a 24-character hex string (MongoDB ObjectId format).
	age is capped at 20 to reject obviously invalid values.
	"""
	url: str
	user_id: str = Field(..., min_length=1, pattern=r"^[a-fA-F0-9]{24}$")
	age: int = Field(..., ge=1, le=20)
	grade_level: int = Field(..., ge=1)
	interests: List[InterestInput] = Field(default_factory=list)
	sensory_limitations: List[str] = Field(default_factory=list)
	neurodiversity_flags: List[str] = Field(default_factory=list)
	has_accessibility_needs: bool = False

	@model_validator(mode="after")
	def validate_accessibility_consistency(self) -> "EvaluateRequest":
		"""Keep accessibility booleans and arrays consistent with browser contract."""
		has_any_flag = bool(self.sensory_limitations or self.neurodiversity_flags)
		if self.has_accessibility_needs and not has_any_flag:
			raise ValueError(
				"When has_accessibility_needs is true, provide at least one sensory_limitation or neurodiversity_flag."
			)
		if not self.has_accessibility_needs and has_any_flag:
			raise ValueError(
				"When has_accessibility_needs is false, sensory_limitations and neurodiversity_flags must be empty."
			)
		return self


class AccessPolicyResponse(BaseModel):
	"""Access policy details included in the API response, with an added source field."""
	url: str
	category: str
	age_restriction: str
	educational_genre: str
	suitability_for_school: str
	recommended_grade_level: Optional[str]
	unsuitability_reasons: Optional[str]
	ai_generated: str
	accessibility_score: str
	safe_alternatives: List[str]
	timing_breakdown: Optional[Dict[str, float]]
	reason: str
	allowed_for_user_ids: List[str]
	min_age: Optional[int]
	max_age: Optional[int]
	min_grade_level: Optional[int]
	max_grade_level: Optional[int]
	source: str  # "cache" | "ai" | "keyword-filter" | "invalid-url"


class EvaluateResponse(BaseModel):
	"""Full response returned by the /evaluate endpoint."""
	request_id: str
	normalized_url: str
	profile: Dict[str, Any]
	policy: Optional[AccessPolicyResponse]  # None when URL is invalid
	decision: str
	ui_message: str
	retrigger_browser: bool
	source: str
	cache_lookup_status: str
	cache_update_status: str
	ai_used: bool

# ---------------------------------------------------------------------------
# FastAPI app setup and dependency wiring
# ---------------------------------------------------------------------------

app = FastAPI(title="SmartGuard Orchestrator", version="0.2.0")

# Build the default cache base URL from the environment, with a hardcoded fallback
default_cache_base_url = os.getenv("YASSIN_CACHE_BASE_URL", "https://logan-unroosted-jenine.ngrok-free.dev").rstrip("/")
default_analyze_url = f"{default_cache_base_url}/analyze"
default_update_url = f"{default_cache_base_url}/cache/update"

# AI policy service URL – prefer environment variable over hardcoded default
default_ai_policy_url = "https://outer-crisply-radiated.ngrok-free.dev/analyze"
configured_ai_policy_url = (os.getenv("AI_POLICY_API_URL") or "").strip() or default_ai_policy_url

# Singleton orchestrator wired up with all its dependencies
orchestrator = Orchestrator(
	cache_client=CacheApiClient(
		get_endpoint=os.getenv("YASSIN_CACHE_ANALYZE_URL", default_analyze_url),
		post_endpoint=os.getenv("YASSIN_CACHE_UPDATE_URL", default_update_url),
	),
	ai_client=AIServiceClient(endpoint=configured_ai_policy_url),
	keyword_filter=UrlKeywordFilter(list_path=os.path.join(os.path.dirname(__file__), "blocked_keywords.json")),
	state_manager=RedisStateManager(),
)

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
	"""
	Return a structured 400 response when Pydantic rejects the request body.

	Provides field-level error details so the client can pinpoint the problem.
	"""
	return JSONResponse(
		status_code=400,
		content={
			"error": "Invalid payload",
			"message": "Expected url, user_id, age, grade_level, interests[]",
			"details": exc.errors(),
			"path": str(request.url.path),
		},
	)

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate_url(request: EvaluateRequest) -> EvaluateResponse:
	"""
	Evaluate whether a student is allowed to access a given URL.

	This is the primary endpoint called by the browser extension on every
	navigation. It runs the full orchestration pipeline and returns the
	access decision along with policy details and metadata.

	Returns 400 on invalid input (handled by request_validation_handler).
	Returns 502 if an unexpected error occurs in the orchestration pipeline.
	"""
	# Build the internal StudentProfile from the validated request fields
	profile = StudentProfile(
		user_id=request.user_id,
		age=request.age,
		grade_level=request.grade_level,
		interests=[interest.model_dump() for interest in request.interests],
		sensory_limitations=request.sensory_limitations,
		neurodiversity_flags=request.neurodiversity_flags,
		has_accessibility_needs=request.has_accessibility_needs,
	)

	try:
		result = orchestrator.handle_url_request(profile=profile, raw_url=request.url)
	except InvalidUrlError as exc:
		# Return a structured BLOCKED response rather than raising an HTTP error,
		# so the browser extension always receives a consistent response shape.
		return EvaluateResponse(
			request_id=exc.request_id,
			normalized_url="",
			profile=asdict(profile),
			policy=None,
			decision=Decision.BLOCKED.value,
			ui_message=f"Invalid URL: {str(exc)}",
			retrigger_browser=True, # Ask the extension to resend with a corrected URL
			source="invalid-url",
			cache_lookup_status="not_attempted",
			cache_update_status="not_attempted",
			ai_used=False,
		)
	except Exception as exc:
		# Unexpected pipeline errors surface as 502 Bad Gateway
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
	"""Simple liveness probe. Returns 200 {"status": "healthy"} when the service is up."""
	return {"status": "healthy"}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
	"""
	Start the Uvicorn ASGI server.

	Prints the configured endpoint URLs for quick verification on startup,
	then binds to localhost:8000.
	"""
	print(f"Cache analyze endpoint: {orchestrator.cache_client.get_endpoint or 'disabled'}")
	print(f"Cache update endpoint: {orchestrator.cache_client.post_endpoint or 'disabled'}")
	print(f"AI endpoint: {orchestrator.ai_client.endpoint or 'fallback-only'}")
	uvicorn.run(app, host="127.0.0.1", port=8000)


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _to_optional_int(value: Any) -> Optional[int]:
	"""
	Safely cast a value to int, returning None on failure.

	Handles None, non-numeric strings, and type errors without raising.
	"""
	if value is None:
		return None
	try:
		return int(value)
	except (TypeError, ValueError):
		return None


def _to_optional_float(value: Any) -> Optional[float]:
	"""
	Safely cast a value to float, returning None on failure.

	Used when processing timing_breakdown values from API responses.
	"""
	if value is None:
		return None
	try:
		return float(value)
	except (TypeError, ValueError):
		return None


def _parse_age_restriction(value: Optional[str]) -> Optional[int]:
	"""
	Parse a human-readable age restriction string into a minimum age integer.

	Examples:
	  "13+"        → 13
	  "All Ages"   → None  (no restriction)
	  "Under 18"   → 18
	  "18"         → 18
	  None / ""    → None

	Args:
		value: The raw age restriction string from the policy.

	Returns:
		Minimum age as an int, or None if there is no age restriction.
	"""
	if not value:
		return None
	normalized = value.strip().lower()
	if normalized in {"all ages", "all-age", "all"}:
		return None
	# Extract the first numeric sequence found in the string
	match = re.search(r"(\d+)", normalized)
	if not match:
		return None
	return _to_optional_int(match.group(1))


def _parse_grade_range(value: Optional[str]) -> Tuple[Optional[int], Optional[int]]:
	"""
	Parse a grade level string into a (min_grade, max_grade) integer tuple.

	Examples:
	  "6-8"    → (6, 8)
	  "K-12"   → (None, 12)  [K has no digit]
	  "Grade 5"→ (5, 5)      [single grade: min == max]
	  None     → (None, None)

	Em-dashes and en-dashes are normalized to hyphens before parsing.

	Args:
		value: The raw grade level string from the policy.

	Returns:
		(min_grade, max_grade) tuple; either element may be None.
	"""
	if not value:
		return None, None
	normalized = value.strip().lower().replace("\u2013", "-").replace("\u2014", "-")
	matches = re.findall(r"(\d+)", normalized)
	if not matches:
		return None, None
	if len(matches) == 1:
		# Single grade specified – treat it as both min and max
		grade = _to_optional_int(matches[0])
		return grade, grade
	return _to_optional_int(matches[0]), _to_optional_int(matches[1])




if __name__ == "__main__":
	main()