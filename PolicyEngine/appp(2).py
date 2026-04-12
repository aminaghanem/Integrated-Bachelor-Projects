"""
AGentVLM – Student-Friendly Access Control Policy Engine
========================================================
Integrated with Full Pipeline (Steps 0-3)
Modified Version: Dynamic Age dropdown, simplified School Levels,
Interest by level, and improved Admin Policy Management

FIXES APPLIED (v2 → v3):
  1. append_txt()              : replaced all \\n literal strings with real \n newlines
                                 so load_admin_overrides() can parse the log file correctly
                                 and admin overrides actually take effect.
  2. Duplicate function defs   : removed the second (broken) copies of
                                 run_agentvlm_pipeline() and evaluate_single().
  3. LEVEL_KEY trailing spaces : removed trailing spaces from mapping values and
                                 added per-grade High School split so PolicySentenceBuilder
                                 receives the correct pipeline-format level key, fixing
                                 wrong ALLOWED/DENIED decisions (e.g. Wattpad).
  4. Disability recommendations: DISABILITY_RECOMMENDATIONS is now queried per user
                                 and appended to alternatives_list so the ResultWindow
                                 shows disability-specific URLs. Trailing spaces in
                                 INTEREST_OPTIONS keys are stripped before lookup.

NEW FIXES (v4):
  5. Log organization          : Policies are now automatically sorted by school level
                                 (Elementary → Middle → High) whenever a policy is saved.
  6. Specific context matching : Admin policies now only apply to their exact context
                                 unless explicitly saved as "global" (Any/Any/Any/Any/NA).
                                 Editing a policy for specific inputs no longer affects
                                 other instances of the same URL.
"""

import re, os, time, random, logging, threading, webbrowser
import tkinter as tk
import tkinter.font as tkfont
from tkinter import ttk, messagebox, simpledialog
from typing import List, Dict, Optional
from datetime import datetime
# At the top of appp(2).py, add:
from database import db
# Add these to your existing imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import threading
import datetime
# ═══════════════════════════════════════════════════════════════════════════
# SINGLE API ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════
class SimpleAPI:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Connect to MongoDB (adjust connection string as needed)
        try:
            self.client = MongoClient('mongodb://localhost:27017/')
            self.db = self.client['agentvlm']
            self.collection = self.db['policies']
            print("✅ MongoDB Connected")
        except:
            self.client = None
            print("⚠️ MongoDB not available")
        
        @self.app.route('/api/check', methods=['POST'])
        def check():
            """Single endpoint: Check access + save to MongoDB"""
            data = request.get_json()
            
            # Required fields
            url = data.get('url')
            profile = {
                'school_level': data.get('school_level', 'Any'),
                'grade': data.get('grade', 'Any'), 
                'age': data.get('age', 'Any'),
                'interest': data.get('interest', 'Any'),
                'disability': data.get('disability', 'NA')
            }
            
            if not url:
                return jsonify({'error': 'URL required'}), 400
            
            # Run evaluation (uses your existing logic)
            result = evaluate_single(
                url=url,
                school_level=profile['school_level'],
                grade=profile['grade'],
                age=profile['age'],
                interest=profile['interest'],
                disability=profile['disability'],
                other_disability=data.get('other_disability')
            )
            
            # Add metadata
            result['api_call_time'] = datetime.datetime.now()
            result['student_profile'] = profile
            
            # Save to MongoDB for admin access
            if self.client:
                self.collection.insert_one(result)
            
            return jsonify(result)
        
        @self.app.route('/api/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'ok', 
                'gui_running': True,
                'mongodb': self.client is not None
            })
    
    def run(self):
        # Run in background so GUI stays responsive
        threading.Thread(
            target=lambda: self.app.run(host='0.0.0.0', port=6000, debug=False),
            daemon=True
        ).start()
        print("🚀 API running at http://localhost:6000/api/check")


# KEEP the INTEREST_OPTIONS dictionary for now as a fallback reference, 
# but we won't use it directly anymore. Or you can delete it if you prefer 
# to rely solely on the fallback method in database.py.

# REPLACE the _on_level_change method completely:

        
# ── Dependencies ───────────────────────────────────────────────────────────
def _ensure(pkg, imp=None):
    import importlib, subprocess, sys
    try:
        importlib.import_module(imp or pkg)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

_ensure("requests")
_ensure("bs4", "bs4")

# ── Import AGentVLM Pipeline ───────────────────────────────────────────────
try:
    from agentvlm_pipeline_v2 import (
        WebFetcher, Preprocessor, NLACPIdentifier,
        ContentSignalAnalyzer, PolicySentenceBuilder, PolicyGenerator,
        GRADE_RANGES, OUTPUT_DIR as PIPELINE_OUTPUT_DIR,
        DISABILITY_RECOMMENDATIONS,
    )
    PIPELINE_AVAILABLE = True
    logging.info("AGentVLM Pipeline imported successfully")
except ImportError as e:
    PIPELINE_AVAILABLE = False
    DISABILITY_RECOMMENDATIONS = {}
    logging.warning(f"Pipeline import failed: {e}. Using fallback logic.")

# ── Configuration ──────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("AGentVLM")

OUTPUT_DIR    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
TXT_PATH      = os.path.join(OUTPUT_DIR, "policy_log.txt")
ADMIN_PASSWORD = "admin"

_rule_counter = 1
_policy_database: Dict = {}

# ── Pipeline component cache ───────────────────────────────────────────────
_pipeline_components: Dict = {}

def get_pipeline():
    """Initialize and cache pipeline components."""
    global _pipeline_components
    if not _pipeline_components and PIPELINE_AVAILABLE:
        log.info("Initializing AGentVLM Pipeline components...")
        _pipeline_components = {
            "fetcher":          WebFetcher(max_chars=8000, max_retries=2, delay_range=(0.5, 1.0)),
            "preprocessor":     Preprocessor(),
            "nlacp_identifier": NLACPIdentifier(),
            "content_analyzer": ContentSignalAnalyzer(),
            "policy_builder":   PolicySentenceBuilder(),
            "policy_generator": PolicyGenerator(use_llm=False),
        }
    return _pipeline_components

# ── Colors ─────────────────────────────────────────────────────────────────
COLORS = {
    "bg":         "#F0F4F8",
    "card":       "#FFFFFF",
    "primary":    "#2563EB",
    "success":    "#059669",
    "danger":     "#DC2626",
    "warning":    "#D97706",
    "text":       "#1F2937",
    "text_light": "#6B7280",
    "border":     "#E5E7EB",
    "accent":     "#7C3AED",
    "admin":      "#DC2626",
}

# ═══════════════════════════════════════════════════════════════════════════
# SCHOOL LEVELS, AGE / GRADE / INTEREST OPTIONS
# ═══════════════════════════════════════════════════════════════════════════
SCHOOL_LEVELS = ["Elementary School", "Middle School", "High School"]

AGE_OPTIONS = {
    "Elementary School": ["6", "7", "8", "9", "10", "11"],
    "Middle School":     ["11", "12", "13", "14"],
    "High School":       ["14", "15", "16", "17", "18"],
}

GRADE_OPTIONS = {
    "Elementary School": ["1", "2", "3", "4", "5"],
    "Middle School":     ["6", "7", "8"],
    "High School":       ["9", "10", "11", "12"],
}

# NOTE: No trailing spaces – they were stripped to allow clean dict lookups.
# INTEREST_OPTIONS = {
#     "Elementary School": [
#         "Math", "Science", "Reading", "Art", "Music",
#         "Sports", "Social Studies", "Computer Science", "Arabic",
#     ],
#     "Middle School": [
#         "Math", "Biology", "Chemistry", "Physics", "English",
#         "History", "Computer Science", "Art", "Arabic", "Music", "Sports",
#     ],
#     "High School": [
#         "Math", "Physics", "Chemistry", "Biology", "English",
#         "History", "Sports", "Music", "Computer Science", "Arabic", "Art",
#     ],
# }

# ── GUI interest label → pipeline interest key ─────────────────────────────
# "Computer Science" in the GUI maps to "Computer" in DISABILITY_RECOMMENDATIONS
_INTEREST_GUI_TO_PIPELINE = {
    "Computer Science": "Computer",
}

def _normalize_interest(raw: str) -> str:
    """
    Convert GUI display name to pipeline key.
    If your DB uses 'Computer Science' but pipeline expects 'Computer', 
    keep this mapping. Otherwise, just return raw.strip()
    """
    mappings = {
        "Computer Science": "Computer",
        # Add other mappings if needed
    }
    clean = raw.strip()
    return mappings.get(clean, clean)


# ═══════════════════════════════════════════════════════════════════════════
# ALTERNATIVE DESCRIPTIONS (Fix for Gap 2)
# ═══════════════════════════════════════════════════════════════════════════
_ALT_DESCRIPTIONS = {
    "readworks.org":        "Structured reading with comprehension support",
    "gutenberg.org":        "Classic literature in accessible plain-text format",
    "commonlit.org":        "Free reading passages and literacy resources",
    "khanacademy.org/math": "Structured math lessons with progress tracking",
    "khanacademy.org":      "Free K-12 lessons across all subjects",
    "pbslearningmedia.org": "Curated captioned educational video content",
    "coolmathgames.com":    "Gamified interactive math practice",
    "phet.colorado.edu":    "Interactive science and math simulations",
    "code.org":             "Structured coding education for all ages",
    "scratch.mit.edu":      "Visual block-based programming for students",
    "musictheory.net":      "Interactive visual music theory lessons",
    "musicca.com":          "Visual instruments with real-time feedback",
    "artsonia.com":         "Moderated safe student art sharing platform",
    "tate.org.uk":          "Museum-quality art education with accessibility support",
    "ducksters.com":        "Short readable history and science articles",
    "britannica.com":       "Trusted encyclopaedia with accessible layout",
    "nfl.com":              "Official family-friendly sports platform",
    "olympic.org":          "Official Olympic sports education resources",
}

def _alt_description(url: str) -> str:
    """Return a human-readable description for a known alternative URL."""
    url_clean = url.lower().replace("https://", "").replace("http://", "").replace("www.", "")
    for key, desc in _ALT_DESCRIPTIONS.items():
        if key in url_clean:
            return desc
    return "Educational alternative resource"

# ═══════════════════════════════════════════════════════════════════════════
# SCHOOL LEVEL CONVERSION  (GUI format → pipeline format)
# FIX 3: removed trailing spaces; added grade-aware High School split.
# ═══════════════════════════════════════════════════════════════════════════
def _gui_level_to_pipeline(school_level: str, grade: str) -> str:
    """
    Convert GUI school-level string to the key expected by PolicySentenceBuilder
    and GRADE_RANGES.

    GUI values  : "Elementary School", "Middle School", "High School"
    Pipeline keys: "Elementary", "Middle", "High (9-10)", "High (11-12)"
    """
    if school_level == "Elementary School":
        return "Elementary"
    if school_level == "Middle School":
        return "Middle"
    if school_level == "High School":
        return "High (11-12)" if grade in ("11", "12") else "High (9-10)"
    # Fallback – pass through unchanged
    return school_level

# ═══════════════════════════════════════════════════════════════════════════
# DISABILITY OPTIONS
# ═══════════════════════════════════════════════════════════════════════════
DISABILITY_OPTIONS = [
    "NA - No special accommodations needed",
    "ADHD - I learn best with interactive/gamified content",
    "Color Blindness - I need non-color-dependent visuals",
    "Hearing Impairment - I need captions/transcripts",
    "Dyslexia - I need TTS-compatible / low-reading-load content",
    "Autism - I learn best with predictable structured content",
    "Other - I have a different accessibility need",
]

DISABILITY_MAP = {
    "NA - No special accommodations needed":                    "NA",
    "ADHD - I learn best with interactive/gamified content":    "ADHD",
    "Color Blindness - I need non-color-dependent visuals":     "Color Blindness",
    "Hearing Impairment - I need captions/transcripts":         "Hearing Impairment",
    "Dyslexia - I need TTS-compatible / low-reading-load content": "Dyslexia",
    "Autism - I learn best with predictable structured content":"Autism",
    "Other - I have a different accessibility need":            "Other",
}

# ── Legacy fallback data ───────────────────────────────────────────────────
FALLBACK = {
    "khanacademy.org": {
        "desc":       "Khan Academy is a free educational platform for K-12 students.",
        "accessible": ["ADHD", "Color Blindness", "Hearing Impairment"],
        "why_good":   "Structured lessons with progress tracking",
    },
    "reddit.com": {
        "desc":       "Reddit is a social platform with unmoderated user-generated content.",
        "accessible": [],
        "why_good":   None,
    },
    "youtube.com": {
        "desc":       "YouTube is a video platform with mixed content quality.",
        "accessible": [],
        "why_good":   "Educational videos (age restricted)",
    },
}

ALTERNATIVES = {
    "reddit.com": [
        ("https://www.britannica.com",    "Reliable information without unmoderated comments"),
        ("https://www.khanacademy.org",   "Structured learning without distracting forums"),
    ],
    "youtube.com": [
        ("https://www.khanacademy.org",        "Educational videos with structured curriculum"),
        ("https://www.pbslearningmedia.org",   "Curated educational video content"),
    ],
    "wattpad.com": [
        ("https://www.readworks.org",   "Structured reading with comprehension support"),
        ("https://www.gutenberg.org",   "Classic literature in accessible formats"),
        ("https://www.commonlit.org",   "Free reading passages and literacy resources"),
    ],
}

# ═══════════════════════════════════════════════════════════════════════════
# POLICY KEY + DATABASE
# ═══════════════════════════════════════════════════════════════════════════
def _make_policy_key(url: str, school_level: str, grade: str, age: str,
                     interest: str, disability: str) -> str:
    url_norm = re.sub(r"^https?://", "", url.strip().lower().rstrip("/"))
    return f"{url_norm}|{school_level}|{grade}|{age}|{interest}|{disability}"


def _get_school_level_sort_key(level: str) -> int:
    """Return sort key for school level ordering."""
    level_lower = level.lower()
    if "elementary" in level_lower:
        return 0
    elif "middle" in level_lower:
        return 1
    elif "high" in level_lower:
        return 2
    else:
        return 3


def _rewrite_log_sorted():
    """Rewrite the log file with entries sorted by school level."""
    if not os.path.exists(TXT_PATH):
        return
    
    # Read and parse all entries
    with open(TXT_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Split entries by the separator line
    raw_entries = re.split(r"\n-{80}\n+", content)
    
    parsed_entries = []
    for entry in raw_entries:
        entry = entry.strip()
        if not entry or entry.startswith("="):
            continue
            
        # Extract school level from entry
        lev_m = re.search(r"School Level:\s*(.+?)(?:\n|Grade)", entry, re.IGNORECASE)
        school_level = lev_m.group(1).strip() if lev_m else "Any"
        
        # Extract timestamp for secondary sorting
        time_m = re.search(r"Timestamp:\s*(.+?)(?:\n|$)", entry, re.IGNORECASE)
        timestamp = time_m.group(1).strip() if time_m else ""
        
        parsed_entries.append({
            'content': entry,
            'school_level': school_level,
            'timestamp': timestamp,
            'sort_key': (_get_school_level_sort_key(school_level), timestamp)
        })
    
    # Sort by school level, then by timestamp
    parsed_entries.sort(key=lambda x: x['sort_key'])
    
    # Rewrite file
    with open(TXT_PATH, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("AGentVLM ACCESS CONTROL POLICY LOG\n")
        f.write("=" * 80 + "\n\n")
        
        for i, entry in enumerate(parsed_entries):
            f.write(entry['content'])
            f.write("\n")
            f.write("-" * 80)
            f.write("\n\n")


def load_admin_overrides():
    """Parse the log file and rebuild the in-memory policy database."""
    global _policy_database
    _policy_database = {}

    if not os.path.exists(TXT_PATH):
        return

    try:
        with open(TXT_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        entries = content.split("-" * 80)

        for entry in entries:
            url_m   = re.search(r"URL:\s*(https?://\S+)",            entry, re.IGNORECASE)
            dec_m   = re.search(r"Decision:\s*(\w+)",                entry, re.IGNORECASE)
            lev_m   = re.search(r"School Level:\s*(.+?)(?:\n|Grade)",entry, re.IGNORECASE)
            grd_m   = re.search(r"Grade Range:\s*(.+?)(?:\n|Age)",   entry, re.IGNORECASE)
            age_m   = re.search(r"Age Range:\s*(.+?)(?:\n|Interest)",entry, re.IGNORECASE)
            int_m   = re.search(r"Interest:\s*(.+?)(?:\n|Disability)",entry, re.IGNORECASE | re.DOTALL)
            dis_m   = re.search(r"Disability:\s*(.+?)(?:\n|$)",      entry, re.IGNORECASE | re.DOTALL)
            alt_m   = re.search(r"Recommended Alternatives:\s*(.+?)(?:\n|$)", entry, re.IGNORECASE)

            if not (url_m and dec_m):
                continue

            raw_dec = dec_m.group(1).strip().upper()
            if raw_dec in ("ALLOWED", "ALLOW", "YES", "TRUE", "GRANTED"):
                decision = "ALLOWED"
            elif raw_dec in ("DENIED", "DENY", "NO", "FALSE", "BLOCKED"):
                decision = "DENIED"
            else:
                continue

            url          = url_m.group(1).strip()
            school_level = lev_m.group(1).strip() if lev_m else "Any"
            grade        = grd_m.group(1).strip() if grd_m else "Any"
            age          = age_m.group(1).strip() if age_m else "Any"
            interest     = int_m.group(1).strip() if int_m else "Any"
            disability   = dis_m.group(1).strip() if dis_m else "NA"

            alternatives = []
            if alt_m:
                alt_text = alt_m.group(1).strip()
                if alt_text and alt_text != "N/A":
                    for alt in alt_text.split("|"):
                        alt = alt.strip()
                        if not alt:
                            continue
                        if " - " in alt:
                            parts = alt.split(" - ", 1)
                            alternatives.append((parts[0].strip(), parts[1].strip()))
                        else:
                            alternatives.append((alt, "Recommended alternative"))

            policy_data = {
                "url": url, "decision": decision,
                "school_level": school_level, "grade": grade,
                "age": age, "interest": interest,
                "disability": disability, "alternatives": alternatives,
            }

            # Full-context key (exact match)
            full_key = _make_policy_key(url, school_level, grade, age,
                                        interest, disability)
            _policy_database[full_key] = policy_data

            # FIX 6: Only create URL-only key for GLOBAL policies
            is_global = (school_level == "Any" and grade == "Any" and age == "Any" 
                        and interest == "Any" and disability in ("NA", "Any"))
            
            if is_global:
                url_only = re.sub(r"^https?://", "", url.strip().lower().rstrip("/"))
                _policy_database[url_only] = policy_data

        log.info(f"Loaded {len(_policy_database)} admin policy entries")
    except Exception as e:
        log.warning(f"Could not load admin overrides: {e}")


def check_admin_override(url: str, school_level: str = None, grade: str = None,
                         age: str = None, interest: str = None,
                         disability: str = None) -> Optional[Dict]:
    """Return a saved policy dict if one exists for this URL (and context)."""
    if not url:
        return None

    url_norm = re.sub(r"^https?://", "", url.strip().lower().rstrip("/"))
    # Normalize interest ("Computer Science" → "Computer") for consistent matching
    if interest:
        interest = _normalize_interest(interest)

    # 1. Try exact match first (fast path - for Create/Edit tab specific overrides)
    if all([school_level, grade, age, interest, disability]):
        key = _make_policy_key(url, school_level, grade, age, interest, disability)
        if key in _policy_database:
            return _policy_database[key]

    # 2. Try range-based matching (for Browse tab overrides with ranges like "6-8")
    if all([school_level, grade, age, interest, disability]):
        for policy in _policy_database.values():
            # Check school level
            if policy.get("school_level") != school_level:
                continue
            
            # Check interest (normalized)
            if policy.get("interest") != interest:
                continue
            
            # Check disability
            if policy.get("disability") != disability:
                continue
            
            # Check grade range (handles "6-8" vs "7")
            policy_grade = policy.get("grade", "Any")
            if policy_grade != "Any" and str(grade) != str(policy_grade):
                if "-" in str(policy_grade):
                    try:
                        g_start, g_end = map(int, str(policy_grade).split("-"))
                        if not (g_start <= int(grade) <= g_end):
                            continue
                    except (ValueError, TypeError):
                        continue
                else:
                    continue
            
            # Check age range (handles "11-14" vs "12")
            policy_age = policy.get("age", "Any")
            if policy_age != "Any" and str(age) != str(policy_age):
                if "-" in str(policy_age):
                    try:
                        a_start, a_end = map(int, str(policy_age).split("-"))
                        if not (a_start <= int(age) <= a_end):
                            continue
                    except (ValueError, TypeError):
                        continue
                else:
                    continue
            
            # Check URL match
            policy_url_norm = re.sub(r"^https?://", "", policy["url"].strip().lower().rstrip("/"))
            if policy_url_norm == url_norm:
                return policy

    # # 1. Exact full-context match (highest priority)
    # if all([school_level, grade, age, interest, disability]):
    #     key = _make_policy_key(url, school_level, grade, age, interest, disability)
    #     if key in _policy_database:
    #         return _policy_database[key]

    # 2. URL-only match (only for GLOBAL policies - see load_admin_overrides)
    if url_norm in _policy_database:
        policy = _policy_database[url_norm]
        # Double-check it really is global before returning
        if (policy.get("school_level") == "Any" and policy.get("grade") == "Any" 
            and policy.get("age") == "Any" and policy.get("interest") == "Any"
            and policy.get("disability") in ("NA", "Any")):
            return policy

    # 3. www / non-www variants (only for exact matches)
    # for var in [
    #     url_norm,
    #     url_norm[4:] if url_norm.startswith("www.") else "www." + url_norm,
    # ]:
    #     # Try to find any exact match with this URL variant
    #     for key, policy in _policy_database.items():
    #         if key.endswith(f"|{var}") or key == var:
    #             # Check if this policy matches our context
    #             if (policy.get("school_level") == school_level and
    #                 policy.get("grade") == grade and
    #                 policy.get("age") == age and
    #                 policy.get("interest") == interest and
    #                 policy.get("disability") == disability):
    #                 return policy

    # return None


def save_policy_override(url: str, school_level: str, grade: str, age: str,
                         interest: str, disability: str, decision: str,
                         alternatives: List[tuple] = None, reason: str = None):
    """Persist a policy override to memory and to the log file."""
    global _rule_counter
    # Normalize interest to ensure consistency (Computer Science → Computer)
    interest = _normalize_interest(interest)
    key = _make_policy_key(url, school_level, grade, age, interest, disability)
    alts = alternatives or []

    policy_data = {
        "url": url, "decision": decision,
        "school_level": school_level, "grade": grade, "age": age,
        "interest": interest, "disability": disability,
        "alternatives": alts,
        "reason": reason or f"Admin override: {decision}",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rule_id": f"POL-{_rule_counter:04d}",
    }
    _rule_counter += 1

    _policy_database[key] = policy_data

    # FIX 6: Only create URL-only key if this is a GLOBAL policy (Any/Any/Any/Any/NA)
    is_global = (school_level == "Any" and grade == "Any" and age == "Any" 
                 and interest == "Any" and disability in ("NA", "Any"))
    
    if is_global:
        url_only = re.sub(r"^https?://", "", url.strip().lower().rstrip("/"))
        _policy_database[url_only] = policy_data

    append_txt({
        "rule_id":                  policy_data["rule_id"],
        "timestamp":                policy_data["timestamp"],
        "school_level":             school_level,
        "grade_range":              grade,
        "age_range":                age,
        "interest":                 interest,
        "disability":               disability,
        "url":                      url,
        "decision":                 decision,
        "risk_level":               "Admin Override",
        "reason":                   policy_data["reason"],
        "recommended_alternatives": " | ".join([a[0] for a in alts]) if alts else "N/A",
        "accessibility_features":   "N/A",
        "disability_compatible":    "True",
        "alternatives_list":        alts,
        "admin_override":           True,
        "admin_edit":               True,
    })
    
    # FIX 5: Reorganize log file by school level after saving
    _rewrite_log_sorted()

    return policy_data

# ═══════════════════════════════════════════════════════════════════════════
# PIPELINE RUNNER  (single, correct definition)
# FIX 2: removed the second duplicate definition that was overwriting this one.
# FIX 3: uses _gui_level_to_pipeline() for correct level conversion.
# FIX 4: queries DISABILITY_RECOMMENDATIONS and appends to alternatives_list.
# ═══════════════════════════════════════════════════════════════════════════
def run_agentvlm_pipeline(url: str, interest: str, school_level: str,
                          grade: str, age: str, disability: str) -> dict:
    """
    Execute the full AGentVLM Pipeline (Steps 0-3).
    Returns a dict compatible with the GUI ResultWindow.
    """
    if not PIPELINE_AVAILABLE:
        raise ImportError("Pipeline not available")

    pipe = get_pipeline()
    global _rule_counter

    # FIX 3 – convert GUI school-level to pipeline format before any lookups
    pipeline_level = _gui_level_to_pipeline(school_level, grade)

    # Step 0: Web Fetch
    log.info(f"Step 0: Fetching {url}")
    fetch_result = pipe["fetcher"].fetch_page_text_safe(url)
    page_text    = fetch_result["text"]

    # Step 1: Pre-processing
    log.info("Step 1: Pre-processing content")
    sentences, encoding = pipe["preprocessor"].run(page_text)

    # Step 2: NLACP Identification
    log.info("Step 2: Identifying NLACP sentences")
    nlacp_sentences = pipe["nlacp_identifier"].identify(sentences, encoding)

    # Step 2.5: Content signal analysis
    log.info("Step 2.5: Analyzing content signals")
    signals = pipe["content_analyzer"].analyze(page_text, nlacp_sentences, url, interest)

    # Resolve grade / age ranges using the pipeline-format level key
    gr, ar = GRADE_RANGES.get(pipeline_level, (grade, age))

    # Step 3: Policy Generation
    log.info("Step 3: Generating policy")
    policy_sentence, alternatives, dis_acc = pipe["policy_builder"].build(
        url=url,
        interest=interest,
        school_level=pipeline_level,   # FIX 3 – correct format
        grade_range=gr,
        age_range=ar,
        signals=signals,
    )

    rid = f"POL-{_rule_counter:04d}"
    _rule_counter += 1

    acr = pipe["policy_generator"]._rule_extract(policy_sentence, rid)

    # Restore GUI-format metadata so the ResultWindow displays correctly
    acr.school_level = school_level
    acr.grade_range  = grade
    acr.age_range    = age
    acr.interest     = interest
    acr.disability   = disability

    # Build alternatives list – alternatives from pipeline are plain URL strings
    alt_list: List[tuple] = []
    for item in alternatives:
        if isinstance(item, tuple):
            alt_list.append(item)
        else:
            # FIX: Use _alt_description instead of hardcoded placeholder
            alt_list.append((item, _alt_description(item)))

    # If pipeline returned nothing but the site is DENIED, check hardcoded map
    if not alt_list and acr.decision == "DENIED":
        url_key = (url.lower()
                     .replace("https://", "").replace("http://", "")
                     .replace("www.", "").split("/")[0])
        for key, alts in ALTERNATIVES.items():
            if key in url_key:
                alt_list = list(alts)  # Create a copy to avoid mutating the constant
                break

    # FIX 4 – append disability-specific recommendations
    # Normalise interest (strip spaces, map "Computer Science" → "Computer")
    norm_interest = _normalize_interest(interest)
    if disability and disability not in ("NA", "Other"):
        dis_recs = DISABILITY_RECOMMENDATIONS.get(disability, {})
        subject_recs = dis_recs.get(norm_interest, dis_recs.get("General", []))
        for rec_url, rec_reason in subject_recs:
            # Avoid exact-URL duplicates
            if not any(a[0] == rec_url for a in alt_list):
                alt_list.append((rec_url, f"[{disability}] {rec_reason}"))

    return {
        "rule_id":                  acr.rule_id,
        "timestamp":                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "school_level":             school_level,
        "grade_range":              grade,
        "age_range":                age,
        "interest":                 interest,
        "disability":               disability,
        "url":                      url,
        "decision":                 acr.decision,
        "risk_level":               acr.risk_level,
        "reason":                   acr.reason,
        "recommended_alternatives": " | ".join([a[0] for a in alt_list]) if alt_list else "N/A",
        "accessibility_features":   ", ".join(signals["accessibility_flags"]),
        "disability_compatible":    str(dis_acc),
        "alternatives_list":        alt_list,
        "admin_override":           False,
        "fetch_source":             fetch_result.get("source", "unknown"),
        "nlacp_count":              len(nlacp_sentences),
    }

# ═══════════════════════════════════════════════════════════════════════════
# MAIN EVALUATION  (single, correct definition)
# FIX 2: removed the second duplicate that was overwriting this one.
# ═══════════════════════════════════════════════════════════════════════════
def evaluate_single(url, school_level, grade, age, interest, disability,
                    other_disability=None) -> dict:
    """Main evaluation entry point with pipeline integration."""
    global _rule_counter

    load_admin_overrides()   # Refresh overrides from disk on every call

    actual_disability = disability
    if disability == "Other" and other_disability:
        actual_disability = f"Other ({other_disability})"

    # Check for a saved admin override first
    admin_override = check_admin_override(url, school_level, grade, age,
                                          interest, actual_disability)
    if admin_override:
        log.info(f"ADMIN OVERRIDE applied for: {url}")
        alts = admin_override.get("alternatives", [])
        formatted_alts = []
        for alt in alts:
            if isinstance(alt, tuple):
                formatted_alts.append(alt)
            elif isinstance(alt, str):
                formatted_alts.append((alt, "Alternative resource"))

        rid = f"POL-{_rule_counter:04d}"
        _rule_counter += 1

        row = {
            "rule_id":                  rid,
            "timestamp":                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "school_level":             school_level,
            "grade_range":              grade,
            "age_range":                age,
            "interest":                 interest,
            "disability":               actual_disability,
            "url":                      url,
            "decision":                 admin_override["decision"],
            "risk_level":               "Safe" if admin_override["decision"] == "ALLOWED" else "High",
            "reason":                   f"Admin override applied: {admin_override['decision']}",
            "recommended_alternatives": " | ".join([a[0] for a in formatted_alts]) if formatted_alts else "N/A",
            "accessibility_features":   "N/A",
            "disability_compatible":    "True",
            "alternatives_list":        formatted_alts,
            "admin_override":           True,
        }
        append_txt(row)
        # Reorganize after adding admin override
        _rewrite_log_sorted()
        return row

    # No override – run the full pipeline
    try:
        if PIPELINE_AVAILABLE:
            result = run_agentvlm_pipeline(url, interest, school_level,
                                           grade, age, actual_disability)
            append_txt(result)
            return result
        else:
            return _fallback_evaluation(url, school_level, grade, age,
                                        interest, actual_disability)
    except Exception as e:
        log.error(f"Pipeline error: {e}")
        messagebox.showerror("Analysis Error",
                             f"Error analysing website: {str(e)}\nFalling back to basic mode.")
        return _fallback_evaluation(url, school_level, grade, age,
                                    interest, actual_disability)


def _fallback_evaluation(url, school_level, grade, age, interest, disability):
    """Basic fallback when the pipeline is unavailable."""
    global _rule_counter

    danger_kws = {"gambling": 9, "betting": 9, "casino": 9,
                  "drug": 8, "weapon": 7, "explicit": 7, "dangerous": 6}
    url_lower   = url.lower()
    danger_score = sum(1 for k in danger_kws if k in url_lower)
    is_social   = any(sp in url_lower for sp in ["reddit.com", "youtube.com", "pinterest.com"])
    is_hs       = school_level == "High School"

    if is_social and not is_hs:
        decision, risk   = "DENIED", "High"
        reason = "Social platforms require High School level due to unmoderated content"
    elif danger_score > 0:
        decision, risk   = "DENIED", "High"
        reason = "Potentially inappropriate content detected in URL"
    else:
        decision, risk   = "ALLOWED", "Safe"
        reason = "No obvious restrictions detected (fallback mode)"

    # FIX: Create a copy of the list to avoid mutating the ALTERNATIVES constant
    alts = []
    if decision == "DENIED":
        url_key = (url_lower.replace("https://", "").replace("http://", "")
                            .replace("www.", "").split("/")[0])
        for key, alt_list in ALTERNATIVES.items():
            if key in url_key:
                alts = list(alt_list)  # Create a copy instead of referencing the constant
                break

    # FIX: Append disability-specific recommendations (mirrors run_agentvlm_pipeline)
    norm_interest = _normalize_interest(interest)
    if disability and disability not in ("NA", "Other"):
        dis_recs     = DISABILITY_RECOMMENDATIONS.get(disability, {})
        subject_recs = dis_recs.get(norm_interest, dis_recs.get("General", []))
        for rec_url, rec_reason in subject_recs:
            if not any(a[0] == rec_url for a in alts):
                alts.append((rec_url, f"[{disability}] {rec_reason}"))

    rid = f"POL-{_rule_counter:04d}"
    _rule_counter += 1

    row = {
        "rule_id":                  rid,
        "timestamp":                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "school_level":             school_level,
        "grade_range":              grade,
        "age_range":                age,
        "interest":                 interest,
        "disability":               disability,
        "url":                      url,
        "decision":                 decision,
        "risk_level":               risk,
        "reason":                   reason + " (Fallback Mode – Pipeline unavailable)",
        "recommended_alternatives": " | ".join([a[0] for a in alts]) if alts else "N/A",
        "accessibility_features":   "N/A",
        "disability_compatible":    "True",
        "alternatives_list":        alts,
        "admin_override":           False,
        "fallback":                 True,
    }
    append_txt(row)
    return row

# ═══════════════════════════════════════════════════════════════════════════
# LOG FILE I/O
# FIX 1: all \\n literals replaced with real \n newlines so load_admin_overrides()
#        can parse the log file and admin overrides actually fire.
# ═══════════════════════════════════════════════════════════════════════════
def append_txt(row: dict):
    """Append one evaluation record to the plain-text log."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    write_header = not os.path.exists(TXT_PATH)

    with open(TXT_PATH, "a", encoding="utf-8") as f:
        if write_header:
            f.write("=" * 80 + "\n")
            f.write("AGentVLM ACCESS CONTROL POLICY LOG\n")
            f.write("=" * 80 + "\n\n")

        f.write(f"Rule ID: {row['rule_id']}\n")
        f.write(f"Timestamp: {row['timestamp']}\n")
        f.write("Student Profile:\n")
        f.write(f"  - School Level: {row['school_level']}\n")
        f.write(f"  - Grade Range: {row['grade_range']}\n")
        f.write(f"  - Age Range: {row['age_range']}\n")
        f.write(f"  - Interest: {row['interest']}\n")
        f.write(f"  - Disability: {row['disability']}\n")
        f.write(f"URL: {row['url']}\n")
        f.write(f"Decision: {row['decision']}\n")
        f.write(f"Risk Level: {row['risk_level']}\n")
        f.write(f"Reason: {row['reason']}\n")
        if "fetch_source" in row:
            f.write(f"Fetch Source: {row['fetch_source']}\n")
        if "nlacp_count" in row:
            f.write(f"NLACP Sentences: {row['nlacp_count']}\n")
        f.write(f"Accessibility Features: {row.get('accessibility_features', 'N/A')}\n")
        f.write(f"Disability Compatible: {row['disability_compatible']}\n")
        f.write(f"Recommended Alternatives: {row['recommended_alternatives']}\n")
        f.write("-" * 80 + "\n\n")

# ═══════════════════════════════════════════════════════════════════════════
# GUI – MAIN APPLICATION WINDOW
# ═══════════════════════════════════════════════════════════════════════════
class AgentVLMApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AGentVLM - Safe Web Access for Students")
        self.geometry("900x800")
        self.configure(bg=COLORS["bg"])
        self.minsize(800, 700)
        self._setup_fonts()
        self._build_ui()
        if not PIPELINE_AVAILABLE:
            self.status_var.set("⚠️ Pipeline not loaded – Using fallback mode")

    def _setup_fonts(self):
        self.fonts = {
            "title":    tkfont.Font(family="Segoe UI", size=24, weight="bold"),
            "subtitle": tkfont.Font(family="Segoe UI", size=12),
            "heading":  tkfont.Font(family="Segoe UI", size=14, weight="bold"),
            "body":     tkfont.Font(family="Segoe UI", size=11),
            "small":    tkfont.Font(family="Segoe UI", size=10),
            "mono":     tkfont.Font(family="Consolas", size=10),
        }

    def _build_ui(self):
        main_container = tk.Frame(self, bg=COLORS["bg"], padx=40, pady=30)
        main_container.pack(fill="both", expand=True)

        self._build_header(main_container)

        card = tk.Frame(main_container, bg=COLORS["card"],
                        highlightbackground=COLORS["border"],
                        highlightthickness=1, bd=0)
        card.pack(fill="both", expand=True, pady=(20, 0))

        canvas   = tk.Canvas(card, bg=COLORS["card"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(card, orient="vertical", command=canvas.yview)
        self.content_frame = tk.Frame(canvas, bg=COLORS["card"], padx=30, pady=30)

        self.content_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=self.content_frame, anchor="nw", width=800)
        canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        self._build_student_section(self.content_frame)
        self._build_disability_section(self.content_frame)
        self._build_url_section(self.content_frame)
        self._build_actions(self.content_frame)
        self._build_history(self.content_frame)

    def _build_header(self, parent):
        header = tk.Frame(parent, bg=COLORS["bg"])
        header.pack(fill="x", pady=(0, 10))

        tk.Label(header, text="🛡️ AGentVLM", font=self.fonts["title"],
                 bg=COLORS["bg"], fg=COLORS["primary"]).pack(anchor="w")
        tk.Label(header, text="Safe Website Access Control for K-12 Students",
                 font=self.fonts["subtitle"], bg=COLORS["bg"],
                 fg=COLORS["text_light"]).pack(anchor="w", pady=(5, 0))

        mode_text = ("Mode: Full Pipeline (Steps 0-3)" if PIPELINE_AVAILABLE
                     else "Mode: Fallback (Pipeline unavailable)")
        self.status_var = tk.StringVar(
            value=f"{mode_text} | Enter details below to check website safety.")
        tk.Label(header, textvariable=self.status_var, font=self.fonts["small"],
                 bg=COLORS["bg"], fg=COLORS["text_light"]).pack(anchor="w", pady=(10, 0))

    def _build_student_section(self, parent):
        section = tk.LabelFrame(parent, text=" Student Profile ",
                                font=self.fonts["heading"], bg=COLORS["card"],
                                fg=COLORS["text"], padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))

        # Row 0 labels
        tk.Label(section, text="School Level *", font=self.fonts["body"],
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=0, column=0, sticky="w", pady=(0, 5))
        tk.Label(section, text="Grade *", font=self.fonts["body"],
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=0, column=1, sticky="w", pady=(0, 5))
        tk.Label(section, text="Age *", font=self.fonts["body"],
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=0, column=2, sticky="w", pady=(0, 5))

        # Row 1 combos
        self.level_var = tk.StringVar()
        self.level_cb  = ttk.Combobox(section, textvariable=self.level_var,
                                      values=SCHOOL_LEVELS, state="readonly",
                                      font=self.fonts["body"], width=20)
        self.level_cb.grid(row=1, column=0, sticky="ew", padx=(0, 10))
        self.level_cb.bind("<<ComboboxSelected>>", self._on_level_change)

        self.grade_var = tk.StringVar()
        self.grade_cb  = ttk.Combobox(section, textvariable=self.grade_var,
                                      state="disabled", font=self.fonts["body"], width=15)
        self.grade_cb.grid(row=1, column=1, sticky="w", padx=(0, 10))

        self.age_var = tk.StringVar()
        self.age_cb  = ttk.Combobox(section, textvariable=self.age_var,
                                    state="disabled", font=self.fonts["body"], width=10)
        self.age_cb.grid(row=1, column=2, sticky="w")

        # Row 2/3 – Interest
        tk.Label(section, text="Interest/Subject *", font=self.fonts["body"],
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=2, column=0, sticky="w", pady=(15, 5), columnspan=3)

        self.interest_var = tk.StringVar()
        self.interest_cb  = ttk.Combobox(section, textvariable=self.interest_var,
                                         state="disabled", font=self.fonts["body"], width=50)
        self.interest_cb.grid(row=3, column=0, sticky="ew", columnspan=3)

        section.grid_columnconfigure(0, weight=1)
        section.grid_columnconfigure(1, weight=1)
        section.grid_columnconfigure(2, weight=1)

    def _build_disability_section(self, parent):
        section = tk.LabelFrame(parent, text=" Accessibility Needs ",
                                font=self.fonts["heading"], bg=COLORS["card"],
                                fg=COLORS["accent"], padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))

        tk.Label(section,
                 text="Select any accessibility accommodations you need.",
                 font=self.fonts["small"], bg=COLORS["card"],
                 fg=COLORS["text_light"], wraplength=700, justify="left"
                 ).pack(anchor="w", pady=(0, 10))

        dropdown_frame = tk.Frame(section, bg=COLORS["card"])
        dropdown_frame.pack(fill="x", pady=(0, 10))

        tk.Label(dropdown_frame, text="Accessibility Option *",
                 font=self.fonts["body"], bg=COLORS["card"],
                 fg=COLORS["text"]).pack(anchor="w")

        self.disability_var = tk.StringVar(value=DISABILITY_OPTIONS[0])
        self.disability_cb  = ttk.Combobox(dropdown_frame,
                                            textvariable=self.disability_var,
                                            values=DISABILITY_OPTIONS,
                                            state="readonly",
                                            font=self.fonts["body"], width=60)
        self.disability_cb.pack(fill="x", pady=(5, 0))
        self.disability_cb.bind("<<ComboboxSelected>>", self._on_disability_change)

        self.other_frame = tk.Frame(section, bg=COLORS["card"])
        self.other_frame.pack(fill="x", pady=(10, 0))
        self.other_frame.pack_forget()

        tk.Label(self.other_frame, text="Please specify your accessibility need:",
                 font=self.fonts["body"], bg=COLORS["card"],
                 fg=COLORS["accent"]).pack(anchor="w")

        self.other_disability_var = tk.StringVar()
        self.other_entry = tk.Entry(self.other_frame,
                                    textvariable=self.other_disability_var,
                                    font=self.fonts["body"], width=50,
                                    bg="#F0FDFA", relief="solid", bd=1)
        self.other_entry.pack(fill="x", pady=(5, 0))

    def _on_disability_change(self, event=None):
        if "Other" in self.disability_var.get():
            self.other_frame.pack(fill="x", pady=(10, 0))
            self.other_entry.focus()
        else:
            self.other_frame.pack_forget()
            self.other_disability_var.set("")

    def _build_url_section(self, parent):
        section = tk.LabelFrame(parent, text=" Website to Check ",
                                font=self.fonts["heading"], bg=COLORS["card"],
                                fg=COLORS["text"], padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))

        tk.Label(section, text="Enter the website URL:", font=self.fonts["body"],
                 bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")

        self.url_var = tk.StringVar(value="https://")
        tk.Entry(section, textvariable=self.url_var, font=self.fonts["mono"],
                 width=60, bg=COLORS["bg"], relief="solid", bd=1
                 ).pack(fill="x", pady=(5, 0), ipady=5)

        tk.Label(section,
                 text="Examples: https://www.khanacademy.org, https://www.coolmathgames.com",
                 font=self.fonts["small"], bg=COLORS["card"],
                 fg=COLORS["text_light"]).pack(anchor="w", pady=(5, 0))

    def _build_actions(self, parent):
        btn_frame = tk.Frame(parent, bg=COLORS["card"])
        btn_frame.pack(fill="x", pady=(0, 20))

        tk.Button(btn_frame, text="🔄 Clear Form", font=self.fonts["body"],
                  bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                  cursor="hand2", command=self._clear
                  ).pack(side="left", padx=(0, 10), ipadx=10, ipady=5)

        btn_label = ("🔍 Check Access Safety" if PIPELINE_AVAILABLE
                     else "🔍 Check (Fallback)")
        self.eval_btn = tk.Button(btn_frame, text=btn_label,
                                  font=self.fonts["heading"],
                                  bg=COLORS["primary"], fg="white",
                                  relief="flat", cursor="hand2",
                                  command=self._on_evaluate)
        self.eval_btn.pack(side="right", ipadx=20, ipady=8)

    def _build_history(self, parent):
        history_frame = tk.LabelFrame(parent, text=" Recent Checks ",
                                      font=self.fonts["heading"],
                                      bg=COLORS["card"], fg=COLORS["text"])
        history_frame.pack(fill="both", expand=True, pady=(20, 0))

        headers = tk.Frame(history_frame, bg=COLORS["card"])
        headers.pack(fill="x", padx=10, pady=5)

        for lbl, w in [("Status", 10), ("Website", 40), ("Decision", 15)]:
            tk.Label(headers, text=lbl, font=self.fonts["small"],
                     bg=COLORS["card"], fg=COLORS["text_light"],
                     width=w).pack(side="left")

        self.history_canvas = tk.Canvas(history_frame, bg=COLORS["card"],
                                        highlightthickness=0, height=150)
        scrollbar = ttk.Scrollbar(history_frame, orient="vertical",
                                  command=self.history_canvas.yview)
        self.history_inner = tk.Frame(self.history_canvas, bg=COLORS["card"])

        self.history_inner.bind(
            "<Configure>",
            lambda e: self.history_canvas.configure(
                scrollregion=self.history_canvas.bbox("all"))
        )
        self.history_canvas.create_window((0, 0), window=self.history_inner, anchor="nw")
        self.history_canvas.configure(yscrollcommand=scrollbar.set)

        self.history_canvas.pack(side="left", fill="both", expand=True, padx=10, pady=5)
        scrollbar.pack(side="right", fill="y")

        tk.Button(history_frame, text="📄 View Full Log File",
                  font=self.fonts["small"], bg=COLORS["bg"],
                  relief="solid", bd=1, command=self._open_log
                  ).pack(anchor="se", padx=10, pady=5)
    
    def _on_level_change(self, event=None):
     level = self.level_var.get()
    
    # Fetch subjects from MongoDB instead of hardcoded dictionary
     subjects = db.get_subjects_by_school_level(level)
    
    # Update grade dropdown (keep existing logic)
     self.grade_cb["values"] = GRADE_OPTIONS.get(level, [])
     self.grade_cb["state"] = "readonly"
     self.grade_var.set("")

    # Update age dropdown (keep existing logic)
     self.age_cb["values"] = AGE_OPTIONS.get(level, [])
     self.age_cb["state"] = "readonly"
     self.age_var.set("")

    # Update interest dropdown with DB subjects
     self.interest_cb["values"] = subjects
     self.interest_cb["state"] = "readonly"
     self.interest_var.set("")
    
    # Optional: Show status if using fallback
     if not db.connected:
        self.status_var.set("⚠️ Using offline mode - Database connection failed")

    # def _on_level_change(self, event=None):
    #     level = self.level_var.get()

    #     self.grade_cb["values"] = GRADE_OPTIONS.get(level, [])
    #     self.grade_cb["state"]  = "readonly"
    #     self.grade_var.set("")

    #     self.age_cb["values"] = AGE_OPTIONS.get(level, [])
    #     self.age_cb["state"]  = "readonly"
    #     self.age_var.set("")

    #     self.interest_cb["values"] = INTEREST_OPTIONS.get(level, [])
    #     self.interest_cb["state"]  = "readonly"
    #     self.interest_var.set("")

    def _clear(self):
        self.level_var.set("")
        self.grade_var.set(""); self.grade_cb["state"]    = "disabled"
        self.age_var.set("");   self.age_cb["state"]      = "disabled"
        self.interest_var.set(""); self.interest_cb["state"] = "disabled"
        self.url_var.set("https://")
        self.disability_var.set(DISABILITY_OPTIONS[0])
        self.other_disability_var.set("")
        self.other_frame.pack_forget()
        self.status_var.set("Ready" if PIPELINE_AVAILABLE else "Fallback mode ready")

    def _on_evaluate(self):
        errors = []
        if not self.level_var.get():    errors.append("School Level")
        if not self.grade_var.get():    errors.append("Grade")
        if not self.age_var.get():      errors.append("Age")
        if not self.interest_var.get(): errors.append("Interest/Subject")

        url = self.url_var.get().strip()
        if not url or url == "https://" or not url.startswith(("http://", "https://")):
            errors.append("Valid Website URL")

        dis_sel    = self.disability_var.get()
        other_text = self.other_disability_var.get().strip()
        if "Other" in dis_sel and not other_text:
            errors.append("Please specify your accessibility need")

        if errors:
            messagebox.showerror("Missing Information",
                                 "Please complete:\n• " + "\n• ".join(errors))
            return

        disability   = DISABILITY_MAP.get(dis_sel, "NA")
        school_level = self.level_var.get()

        btn_busy = ("⏳ Running Pipeline..." if PIPELINE_AVAILABLE
                    else "⏳ Checking...")
        self.eval_btn.config(state="disabled", text=btn_busy)
        self.status_var.set("🔍 Step 0: Fetching webpage...")

        def run_check():
            try:
                result = evaluate_single(
                    url=url, school_level=school_level,
                    grade=self.grade_var.get(), age=self.age_var.get(),
                    interest=self.interest_var.get(), disability=disability,
                    other_disability=other_text if disability == "Other" else None,
                )
                if result:
                    self.after(0, lambda: self._show_result(result))
            except Exception as e:
                log.error(f"Evaluation error: {e}")
                self.after(0, lambda: messagebox.showerror("Error",
                           f"Evaluation failed: {str(e)}"))
                self.after(0, lambda: self.eval_btn.config(
                    state="normal",
                    text="🔍 Check Access Safety" if PIPELINE_AVAILABLE else "🔍 Check (Fallback)"))

        threading.Thread(target=run_check, daemon=True).start()

    def _show_result(self, result):
        self.eval_btn.config(
            state="normal",
            text="🔍 Check Access Safety" if PIPELINE_AVAILABLE else "🔍 Check (Fallback)")
        self.status_var.set(
            f"Last check: {result['decision']} | {result.get('fetch_source', 'unknown')} source")
        self._add_to_history(result)
        ResultWindow(self, result)

    def _add_to_history(self, result):
        row = tk.Frame(self.history_inner, bg=COLORS["bg"], padx=5, pady=3)
        row.pack(fill="x", pady=2)

        is_allowed = result["decision"] == "ALLOWED"
        icon  = "✅" if is_allowed else "🚫"
        color = COLORS["success"] if is_allowed else COLORS["danger"]

        tk.Label(row, text=icon, font=self.fonts["body"],
                 bg=COLORS["bg"], width=3).pack(side="left")

        display_url = (result["url"][:35] + "..." if len(result["url"]) > 35
                       else result["url"])

        if is_allowed:
            lbl = tk.Label(row, text=display_url, font=self.fonts["mono"],
                           bg=COLORS["bg"], fg=COLORS["primary"], cursor="hand2")
            lbl.pack(side="left", padx=5)
            lbl.bind("<Button-1>", lambda e, u=result["url"]: webbrowser.open_new(u))
        else:
            tk.Label(row, text=display_url, font=self.fonts["mono"],
                     bg=COLORS["bg"], fg=COLORS["text_light"]).pack(side="left", padx=5)

        decision_text = result["decision"]
        if result.get("admin_override"):
            decision_text += " (Admin)"
        elif result.get("fallback"):
            decision_text += " (Fallback)"

        tk.Label(row, text=decision_text, font=self.fonts["body"],
                 bg=COLORS["bg"], fg=color, width=15).pack(side="right")

    def _open_log(self):
        if not os.path.exists(TXT_PATH):
            messagebox.showinfo("No Log File", "No evaluations have been saved yet.")
            return

        password = simpledialog.askstring("Admin Authentication",
                                          "Enter admin password:", show="*", parent=self)
        if password is None:
            return
        if password != ADMIN_PASSWORD:
            messagebox.showerror("Access Denied", "Incorrect password.")
            return

        AdminLogViewer(self)

# ═══════════════════════════════════════════════════════════════════════════
# GUI – ADMIN LOG VIEWER
# ═══════════════════════════════════════════════════════════════════════════
class AdminLogViewer(tk.Toplevel):
    """Admin log viewer with full policy-editing capabilities."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("Admin Policy Manager")
        self.configure(bg=COLORS["card"])
        self.geometry("900x700")
        self.resizable(True, True)
        self.transient(parent)
        self.grab_set()
        self.parent = parent
        self._build_ui()

        px, py = parent.winfo_x(), parent.winfo_y()
        pw, ph = parent.winfo_width(), parent.winfo_height()
        self.geometry(f"+{px + (pw - 900) // 2}+{py + (ph - 700) // 2}")

    def _build_ui(self):
        header = tk.Frame(self, bg=COLORS["admin"], padx=20, pady=10)
        header.pack(fill="x")
        tk.Label(header, text="🔐 Admin Policy Manager",
                 font=("Segoe UI", 16, "bold"), bg=COLORS["admin"],
                 fg="white").pack(side="left")
        tk.Label(header, text="View, edit, or create access policies",
                 font=("Segoe UI", 10), bg=COLORS["admin"],
                 fg="white").pack(side="right")

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.log_tab      = tk.Frame(self.notebook, bg=COLORS["card"])
        self.policy_tab   = tk.Frame(self.notebook, bg=COLORS["card"])
        self.pipeline_tab = tk.Frame(self.notebook, bg=COLORS["card"])

        self.notebook.add(self.log_tab,      text="📄 View Log File")
        self.notebook.add(self.policy_tab,   text="✏️ Create/Edit Policy")
        self.notebook.add(self.pipeline_tab, text="🗂️ Browse Pipeline Policies")

        self._build_log_tab()
        self._build_policy_tab()
        self._build_pipeline_policies_tab()

    # ── Tab 1: View / Edit Log ─────────────────────────────────────────────
    def _build_log_tab(self):
        instr = tk.Frame(self.log_tab, bg="#FEF3C7", padx=10, pady=5)
        instr.pack(fill="x", pady=5)
        tk.Label(instr,
                 text="💡 Edit any policy entry below. Changes will apply only to the "
                      "specific context (URL + Student Profile) when saved.",
                 font=("Segoe UI", 9), bg="#FEF3C7", fg=COLORS["warning"],
                 wraplength=850, justify="left").pack()

        text_frame = tk.Frame(self.log_tab, bg=COLORS["card"])
        text_frame.pack(fill="both", expand=True, padx=5, pady=5)

        sb = ttk.Scrollbar(text_frame)
        sb.pack(side="right", fill="y")

        self.text_widget = tk.Text(text_frame, wrap="word", padx=10, pady=10,
                                   font=("Consolas", 10), yscrollcommand=sb.set)
        self.text_widget.pack(fill="both", expand=True)
        sb.config(command=self.text_widget.yview)

        if os.path.exists(TXT_PATH):
            with open(TXT_PATH, "r", encoding="utf-8") as f:
                self.text_widget.insert("1.0", f.read())

        btn_frame = tk.Frame(self.log_tab, bg=COLORS["card"], padx=5, pady=10)
        btn_frame.pack(fill="x")

        tk.Button(btn_frame, text="💾 Save Changes",
                  font=("Segoe UI", 11, "bold"),
                  bg=COLORS["success"], fg="white", relief="flat",
                  padx=20, pady=8, cursor="hand2",
                  command=self._save_log).pack(side="left", padx=(0, 10))

        tk.Button(btn_frame, text="🔄 Reload",
                  font=("Segoe UI", 11), bg=COLORS["bg"],
                  fg=COLORS["text"], relief="solid", bd=1,
                  padx=20, pady=8, cursor="hand2",
                  command=self._reload_log).pack(side="left")

        tk.Button(btn_frame, text="❌ Close",
                  font=("Segoe UI", 11), bg=COLORS["danger"],
                  fg="white", relief="flat",
                  padx=20, pady=8, cursor="hand2",
                  command=self.destroy).pack(side="right")

    def _save_log(self):
        content = self.text_widget.get("1.0", "end-1c")
        try:
            with open(TXT_PATH, "w", encoding="utf-8") as f:
                f.write(content)
            load_admin_overrides()
            messagebox.showinfo(
                "Success",
                "Log saved! Overrides updated.\nFuture checks will use new decisions.",
                parent=self)
        except Exception as e:
            messagebox.showerror("Error", f"Could not save: {str(e)}", parent=self)

    def _reload_log(self):
        if os.path.exists(TXT_PATH):
            with open(TXT_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            self.text_widget.delete("1.0", "end")
            self.text_widget.insert("1.0", content)
            load_admin_overrides()
    
    def _parse_policy_output_file(self, filepath):
        """Parse policy_output_agentvlm.txt to extract all 264 policies."""
        policies = []
        if not os.path.exists(filepath):
            return policies
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Split by long separator lines (60+ dashes/box chars) to separate policy blocks
        blocks = re.split(r"\n\s*[\-─]{60,}.*?\n", content)
        
        for block in blocks:
            # Only process blocks that contain a Rule ID
            if "Rule ID" not in block:
                continue
                
            # Extract fields using regex
            rule_match = re.search(r"Rule ID\s*:\s*(POL-\d+)", block)
            url_match = re.search(r"URL\s*:\s*(https?://\S+)", block)
            interest_match = re.search(r"Interest\s*:\s*(.+?)(?:\n|$)", block, re.MULTILINE)
            level_match = re.search(r"School Level\s*:\s*(.+?)(?:\n|$)", block, re.MULTILINE)
            grade_match = re.search(r"Grade Range\s*:\s*(.+?)(?:\n|$)", block, re.MULTILINE)
            age_match = re.search(r"Age Range\s*:\s*(.+?)(?:\n|$)", block, re.MULTILINE)
            decision_match = re.search(r"Decision\s*:\s*(ALLOWED|DENIED)", block)
            
            
            if rule_match and url_match:
                rule_id = rule_match.group(1)
                url = url_match.group(1)
                interest = interest_match.group(1).strip() if interest_match else "–"
                level_raw = level_match.group(1).strip() if level_match else "Any"
                grade = grade_match.group(1).strip() if grade_match else "Any"
                age = age_match.group(1).strip() if age_match else "Any"
                decision = decision_match.group(1) if decision_match else "–"
                
                # Map internal level names to GUI display names
                level_map = {
                    "Elementary": "Elementary School",
                    "Middle": "Middle School",
                    "High (9-10)": "High School (9-10)",
                    "High (11-12)": "High School (11-12)",
                }
                level_display = level_map.get(level_raw, level_raw)
                
                # Extract index from POL-XXXX
                try:
                    idx = int(rule_id.split("-")[1])
                except (IndexError, ValueError):
                    idx = 0
                    
                policies.append({
                    "idx": idx,
                    "url": url,
                    "interest": interest,
                    "level": level_display,
                     "grade": grade,
                    "age": age,
                    "decision": decision,
                })
        
        return sorted(policies, key=lambda x: x["idx"])

        # ── Tab 2: Create / Edit Policy ────────────────────────────────────────
    def _build_policy_tab(self):
        canvas    = tk.Canvas(self.policy_tab, bg=COLORS["card"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.policy_tab, orient="vertical", command=canvas.yview)
        form      = tk.Frame(canvas, bg=COLORS["card"], padx=20, pady=20)

        form.bind("<Configure>",
                  lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=form, anchor="nw", width=860)
        canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        tk.Label(form, text="Create or Edit a Specific Policy",
                 font=("Segoe UI", 14, "bold"), bg=COLORS["card"],
                 fg=COLORS["primary"]).pack(anchor="w", pady=(0, 10))
        tk.Label(form,
                 text="Define a policy for a specific URL and student profile. "
                      "This allows fine-grained control over access decisions.",
                 font=("Segoe UI", 10), bg=COLORS["card"],
                 fg=COLORS["text_light"], wraplength=800, justify="left"
                 ).pack(anchor="w", pady=(0, 20))

        # URL
        tk.Label(form, text="Website URL *", font=("Segoe UI", 11, "bold"),
                 bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")
        self.policy_url_var = tk.StringVar(value="https://")
        tk.Entry(form, textvariable=self.policy_url_var,
                 font=("Consolas", 11), bg=COLORS["bg"],
                 relief="solid", bd=1).pack(fill="x", pady=(5, 15), ipady=5)

        # Context frame
        ctx = tk.LabelFrame(form, text=" Student Profile Context ",
                             font=("Segoe UI", 11, "bold"),
                             bg=COLORS["card"], fg=COLORS["text"],
                             padx=15, pady=15)
        ctx.pack(fill="x", pady=(0, 15))

        tk.Label(ctx, text="School Level *", font=("Segoe UI", 10),
                 bg=COLORS["card"], fg=COLORS["text"]).grid(row=0, column=0, sticky="w")
        self.policy_level_var = tk.StringVar()
        ttk.Combobox(ctx, textvariable=self.policy_level_var,
                     values=SCHOOL_LEVELS, state="readonly",
                     font=("Segoe UI", 10), width=18).grid(
                         row=1, column=0, sticky="w", padx=(0, 10), pady=(5, 10))

        tk.Label(ctx, text="Grade *", font=("Segoe UI", 10),
                 bg=COLORS["card"], fg=COLORS["text"]).grid(row=0, column=1, sticky="w")
        self.policy_grade_var = tk.StringVar()
        self.policy_grade_cb  = ttk.Combobox(ctx, textvariable=self.policy_grade_var,
                                              values=[], state="readonly",
                                              font=("Segoe UI", 10), width=10)
        self.policy_grade_cb.grid(row=1, column=1, sticky="w", padx=(0, 10), pady=(5, 10))

        tk.Label(ctx, text="Age *", font=("Segoe UI", 10),
                 bg=COLORS["card"], fg=COLORS["text"]).grid(row=0, column=2, sticky="w")
        self.policy_age_var = tk.StringVar()
        self.policy_age_cb  = ttk.Combobox(ctx, textvariable=self.policy_age_var,
                                            values=[], state="readonly",
                                            font=("Segoe UI", 10), width=8)
        self.policy_age_cb.grid(row=1, column=2, sticky="w", pady=(5, 10))

        tk.Label(ctx, text="Interest *", font=("Segoe UI", 10),
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=2, column=0, sticky="w", columnspan=3)
        self.policy_interest_var = tk.StringVar()
        self.policy_interest_cb  = ttk.Combobox(ctx,
                                                  textvariable=self.policy_interest_var,
                                                  values=[], state="readonly",
                                                  font=("Segoe UI", 10), width=50)
        self.policy_interest_cb.grid(row=3, column=0, sticky="ew",
                                     columnspan=3, pady=(5, 10))

        tk.Label(ctx, text="Disability", font=("Segoe UI", 10),
                 bg=COLORS["card"], fg=COLORS["text"]).grid(
                     row=4, column=0, sticky="w", columnspan=3)
        self.policy_disability_var = tk.StringVar(value="NA")
        ttk.Combobox(ctx, textvariable=self.policy_disability_var,
                     values=["NA", "ADHD", "Color Blindness", "Hearing Impairment",
                             "Dyslexia", "Autism", "Other"],
                     state="readonly", font=("Segoe UI", 10), width=22
                     ).grid(row=5, column=0, sticky="w", pady=(5, 0))

        ctx.grid_columnconfigure(0, weight=1)
        ctx.grid_columnconfigure(1, weight=1)
        ctx.grid_columnconfigure(2, weight=1)

        self.policy_level_var.trace("w", self._on_policy_level_change)

        # Decision
        dec_frame = tk.LabelFrame(form, text=" Access Decision ",
                                  font=("Segoe UI", 11, "bold"),
                                  bg=COLORS["card"], fg=COLORS["text"],
                                  padx=15, pady=15)
        dec_frame.pack(fill="x", pady=(0, 15))

        self.decision_var = tk.StringVar(value="ALLOWED")
        tk.Radiobutton(dec_frame, text="✅ ALLOWED", variable=self.decision_var,
                       value="ALLOWED", font=("Segoe UI", 11, "bold"),
                       bg=COLORS["card"], fg=COLORS["success"],
                       selectcolor=COLORS["card"]).pack(side="left", padx=(0, 30))
        tk.Radiobutton(dec_frame, text="🚫 DENIED", variable=self.decision_var,
                       value="DENIED", font=("Segoe UI", 11, "bold"),
                       bg=COLORS["card"], fg=COLORS["danger"],
                       selectcolor=COLORS["card"]).pack(side="left")

        # Reason
        tk.Label(form, text="Reason for Decision", font=("Segoe UI", 11, "bold"),
                 bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")
        self.reason_var = tk.StringVar(value="Administrative decision")
        tk.Entry(form, textvariable=self.reason_var,
                 font=("Segoe UI", 10), bg=COLORS["bg"],
                 relief="solid", bd=1).pack(fill="x", pady=(5, 15), ipady=5)

        # Alternatives
        tk.Label(form,
                 text="Alternative URLs (one per line, format: URL|description)",
                 font=("Segoe UI", 11, "bold"),
                 bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")
        self.alternatives_text = tk.Text(form, wrap="word", padx=10, pady=10,
                                          font=("Consolas", 10), bg=COLORS["bg"],
                                          relief="solid", bd=1, height=5)
        self.alternatives_text.pack(fill="x", pady=(5, 20))
        self.alternatives_text.insert("1.0",
                                       "https://www.khanacademy.org|Educational alternative")

        # Buttons
        btn_frame = tk.Frame(form, bg=COLORS["card"])
        btn_frame.pack(fill="x")

        tk.Button(btn_frame, text="💾 Save Policy",
                  font=("Segoe UI", 12, "bold"),
                  bg=COLORS["primary"], fg="white", relief="flat",
                  padx=30, pady=10, cursor="hand2",
                  command=self._save_policy).pack(side="left", padx=(0, 10))

        tk.Button(btn_frame, text="🔍 Find Existing Policy",
                  font=("Segoe UI", 11),
                  bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                  padx=20, pady=10, cursor="hand2",
                  command=self._find_policy).pack(side="left")

        tk.Button(btn_frame, text="🔄 Clear Form",
                  font=("Segoe UI", 11),
                  bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                  padx=20, pady=10, cursor="hand2",
                  command=self._clear_policy_form).pack(side="right")

    def _on_policy_level_change(self, *args):
        level = self.policy_level_var.get()
        self.policy_grade_cb["values"]    = GRADE_OPTIONS.get(level, [])
        self.policy_age_cb["values"]      = AGE_OPTIONS.get(level, [])
        self.policy_interest_cb["values"] = INTEREST_OPTIONS.get(level, [])

    def _save_policy(self):
        url      = self.policy_url_var.get().strip()
        level    = self.policy_level_var.get()
        grade    = self.policy_grade_var.get()
        age      = self.policy_age_var.get()
        interest = self.policy_interest_var.get()
        dis      = self.policy_disability_var.get()
        decision = self.decision_var.get()
        reason   = self.reason_var.get()

        if not url or url == "https://":
            messagebox.showerror("Error", "Please enter a valid URL", parent=self)
            return
        if not all([level, grade, age, interest]):
            messagebox.showerror("Error", "Please fill in all profile fields", parent=self)
            return

        alts     = []
        alt_text = self.alternatives_text.get("1.0", "end-1c").strip()
        if alt_text:
            for line in alt_text.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if "|" in line:
                    parts = line.split("|", 1)
                    alts.append((parts[0].strip(), parts[1].strip()))
                else:
                    alts.append((line, "Alternative resource"))

        save_policy_override(url, level, grade, age, interest, dis,
                             decision, alts, reason)

        messagebox.showinfo(
            "Success",
            f"Policy saved!\n\nURL: {url}\nDecision: {decision}\n"
            f"Context: {level}, Grade {grade}, Age {age}\n\n"
            "This policy will apply only to this specific student profile.",
            parent=self)
        self._reload_log()

    def _find_policy(self):
        url = self.policy_url_var.get().strip()
        if not url or url == "https://":
            messagebox.showerror("Error", "Please enter a URL to search", parent=self)
            return

        level    = self.policy_level_var.get()    or "Any"
        grade    = self.policy_grade_var.get()    or "Any"
        age      = self.policy_age_var.get()      or "Any"
        interest = self.policy_interest_var.get() or "Any"
        dis      = self.policy_disability_var.get() or "NA"

        policy = check_admin_override(url, level, grade, age, interest, dis)
        if policy:
            self.decision_var.set(policy.get("decision", "DENIED"))
            self.reason_var.set(policy.get("reason", ""))
            alts     = policy.get("alternatives", [])
            alt_text = "\n".join([f"{a[0]}|{a[1]}" for a in alts]) if alts else ""
            self.alternatives_text.delete("1.0", "end")
            self.alternatives_text.insert("1.0", alt_text)
            messagebox.showinfo("Policy Found",
                                "Existing policy loaded. You can now edit it.",
                                parent=self)
        else:
            messagebox.showinfo("No Policy Found",
                                "No existing policy found for this context. "
                                "Create a new one.", parent=self)

    def _clear_policy_form(self):
        self.policy_url_var.set("https://")
        self.policy_level_var.set("")
        self.policy_grade_var.set("")
        self.policy_age_var.set("")
        self.policy_interest_var.set("")
        self.policy_disability_var.set("NA")
        self.decision_var.set("ALLOWED")
        self.reason_var.set("Administrative decision")
        self.alternatives_text.delete("1.0", "end")
        self.alternatives_text.insert("1.0",
                                       "https://www.khanacademy.org|Educational alternative")

    # ── Tab 3: Browse Pipeline Policies ───────────────────────────────────────
    def _build_pipeline_policies_tab(self):
        """Tab for browsing, searching, and overriding all 250 pipeline policies."""
        # ── Build the full policy list from the pipeline table ─────────────
        self._all_pipeline_policies = self._load_pipeline_policy_table()

        outer = tk.Frame(self.pipeline_tab, bg=COLORS["card"])
        outer.pack(fill="both", expand=True, padx=10, pady=10)

        # ── Title + subtitle ──────────────────────────────────────────────
        tk.Label(outer, text="Browse & Override Pipeline Policies",
                 font=("Segoe UI", 14, "bold"), bg=COLORS["card"],
                 fg=COLORS["primary"]).pack(anchor="w", pady=(0, 4))
        tk.Label(outer,
                 text=f"All {len(self._all_pipeline_policies)} policies generated by the AGentVLM pipeline. "
                      "Search by keyword, then click a row to edit and override it.",
                 font=("Segoe UI", 9), bg=COLORS["card"],
                 fg=COLORS["text_light"], wraplength=860, justify="left"
                 ).pack(anchor="w", pady=(0, 8))
   
    

        # ── Search bar ────────────────────────────────────────────────────
        search_outer = tk.Frame(outer, bg=COLORS["card"])
        search_outer.pack(fill="x", pady=(0, 8))

        tk.Label(search_outer, text="🔍 Search:", font=("Segoe UI", 10, "bold"),
                 bg=COLORS["card"], fg=COLORS["text"]).pack(side="left")

        self.pipeline_search_var = tk.StringVar()
        self.pipeline_search_var.trace("w", self._on_pipeline_search)
        search_entry = tk.Entry(search_outer, textvariable=self.pipeline_search_var,
                                font=("Segoe UI", 10), bg=COLORS["bg"],
                                relief="solid", bd=1, width=45)
        search_entry.pack(side="left", padx=(6, 10), ipady=4)

        tk.Label(search_outer,
                 text="Try: elementary, middle, high, math, english, …",
                 font=("Segoe UI", 8), bg=COLORS["card"],
                 fg=COLORS["text_light"]).pack(side="left")

        # ── Stat label ────────────────────────────────────────────────────
        self.pipeline_stat_var = tk.StringVar(
            value=f"Showing {len(self._all_pipeline_policies)} / {len(self._all_pipeline_policies)} policies")
        tk.Label(outer, textvariable=self.pipeline_stat_var,
                 font=("Segoe UI", 9), bg=COLORS["card"],
                 fg=COLORS["text_light"]).pack(anchor="w", pady=(0, 4))

        # ── Treeview ──────────────────────────────────────────────────────
        cols = ("#", "URL", "Interest", "Level", "Decision", "Overridden")
        tree_frame = tk.Frame(outer, bg=COLORS["card"])
        tree_frame.pack(fill="both", expand=True)

        style = ttk.Style()
        style.configure("Pipeline.Treeview",
                        font=("Segoe UI", 9), rowheight=22,
                        background=COLORS["card"], fieldbackground=COLORS["card"])
        style.configure("Pipeline.Treeview.Heading",
                        font=("Segoe UI", 9, "bold"))
        style.map("Pipeline.Treeview",
                  background=[("selected", COLORS["primary"])],
                  foreground=[("selected", "white")])

        self.pipeline_tree = ttk.Treeview(tree_frame, columns=cols,
                                           show="headings", style="Pipeline.Treeview",
                                           selectmode="browse")
        col_widths = {"#": 38, "URL": 290, "Interest": 95,
                      "Level": 120, "Decision": 78, "Overridden": 80}
        for c in cols:
            self.pipeline_tree.heading(c, text=c)
            self.pipeline_tree.column(c, width=col_widths[c], anchor="w", stretch=(c == "URL"))

        vsb = ttk.Scrollbar(tree_frame, orient="vertical",   command=self.pipeline_tree.yview)
        hsb = ttk.Scrollbar(tree_frame, orient="horizontal", command=self.pipeline_tree.xview)
        self.pipeline_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self.pipeline_tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        tree_frame.grid_rowconfigure(0, weight=1)
        tree_frame.grid_columnconfigure(0, weight=1)

        # Row tags for colour coding
        self.pipeline_tree.tag_configure("allowed",    foreground=COLORS["success"])
        self.pipeline_tree.tag_configure("denied",     foreground=COLORS["danger"])
        self.pipeline_tree.tag_configure("overridden", foreground=COLORS["accent"],
                                          font=("Segoe UI", 9, "bold"))

        self.pipeline_tree.bind("<Double-1>", self._on_pipeline_row_double_click)

        # ── Bottom button bar ─────────────────────────────────────────────
        btn_bar = tk.Frame(outer, bg=COLORS["card"], pady=8)
        btn_bar.pack(fill="x")

        tk.Button(btn_bar, text="✏️ Edit / Override Selected",
                  font=("Segoe UI", 10, "bold"),
                  bg=COLORS["primary"], fg="white", relief="flat",
                  padx=18, pady=6, cursor="hand2",
                  command=self._pipeline_edit_selected).pack(side="left", padx=(0, 8))

        tk.Button(btn_bar, text="🔄 Refresh",
                  font=("Segoe UI", 10),
                  bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                  padx=14, pady=6, cursor="hand2",
                  command=self._pipeline_refresh).pack(side="left")

        tk.Label(btn_bar,
                 text="Double-click a row to edit it quickly.",
                 font=("Segoe UI", 8), bg=COLORS["card"],
                 fg=COLORS["text_light"]).pack(side="right")

        # Populate table
        self._pipeline_populate(self._all_pipeline_policies)

    # ── Pipeline helpers ──────────────────────────────────────────────────
    def _load_pipeline_policy_table(self) -> list:
        "Build policy table from output file (264 policies) instead of fallback (82)."
        # Look for the output file in the same directory as the script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(script_dir, "policy_output_agentvlm.txt")
    
    # If the file exists, parse it
        if os.path.exists(output_file):
          return self._parse_policy_output_file(output_file)
    
    # Fallback to the hardcoded 82 policies if file not found
        rows = []
        try:
           from agentvlm_pipeline_v2 import _FALLBACK_DESCRIPTIONS
           for idx, url_key in enumerate(sorted(_FALLBACK_DESCRIPTIONS.keys()), start=1):
                rows.append({
                "idx": idx,
                "url": "https://" + url_key if not url_key.startswith("http") else url_key,
                "interest": "–",
                "level": "All Levels",
                "decision": None,
            })
        except Exception:
            pass
        return rows

    def _pipeline_is_overridden(self, url: str) -> bool:
        return bool(check_admin_override(url))
    
    def _pipeline_decision_for(self, url: str, interest: str, level: str) -> str:
        """Return decision for a URL/interest/level, checking admin overrides first."""
        # Check admin override (global or any school level)
        override = check_admin_override(url)
        if override:
            return override.get("decision", "–")

        # Try a quick heuristic using the pipeline's fallback text
        try:
            from agentvlm_pipeline_v2 import _FALLBACK_DESCRIPTIONS, ContentSignalAnalyzer
            url_key = url.lower().replace("https://", "").replace("http://", "").replace("www.", "")
            desc = ""
            for k, v in _FALLBACK_DESCRIPTIONS.items():
                if k in url_key:
                    desc = v
                    break
            if desc:
                csa = ContentSignalAnalyzer()
                sig = csa.analyze(desc, [desc], url, interest)
                return sig["suggested_decision"]
        except Exception:
            pass
        return "–"

    def _pipeline_populate(self, rows: list):
        """Clear and repopulate the treeview with the given rows."""
        self.pipeline_tree.delete(*self.pipeline_tree.get_children())
        for r in rows:
             # Check for admin override with this specific context
            # This will find both global and specific overrides
            admin_override = check_admin_override(
                r["url"], 
                r["level"], 
                r.get("grade", "Any"), 
                r.get("age", "Any"), 
                r["interest"], 
                "NA"
            )
            
            if admin_override:
                # Use the overridden decision
                decision = admin_override["decision"]
                is_override = True
            else:
                # Use the original decision from the file
                decision = r.get("decision") or "–"
                is_override = False
                
            tag = "overridden" if is_override else ("allowed" if decision == "ALLOWED" else "denied")
            override_label = "✅ Yes" if is_override else ""
            
            self.pipeline_tree.insert("", "end",
                values=(r["idx"], r["url"], r["interest"], r["level"], decision, override_label),
                tags=(tag,))

    def _on_pipeline_search(self, *_):
        query = self.pipeline_search_var.get().strip().lower()
        if not query:
            filtered = self._all_pipeline_policies
        else:
            terms = query.split()
            filtered = [
                r for r in self._all_pipeline_policies
                if all(
                    t in r["url"].lower()
                    or t in r["interest"].lower()
                    or t in r["level"].lower()
                    for t in terms
                )
            ]
        total = len(self._all_pipeline_policies)
        self.pipeline_stat_var.set(f"Showing {len(filtered)} / {total} policies")
        self._pipeline_populate(filtered)

    def _pipeline_refresh(self):
        load_admin_overrides()
        self._on_pipeline_search()

    def _on_pipeline_row_double_click(self, event):
        self._pipeline_edit_selected()

    def _pipeline_edit_selected(self):
        sel = self.pipeline_tree.selection()
        if not sel:
            messagebox.showinfo("Select a Row",
                                "Please select a policy row first.", parent=self)
            return
        vals = self.pipeline_tree.item(sel[0], "values")
        # vals: (#, URL, Interest, Level, Decision, Overridden)
        url      = vals[1]
        interest = vals[2]
        level    = vals[3]
        decision = vals[4]
        self._open_pipeline_override_dialog(url, interest, level, decision)

    def _open_pipeline_override_dialog(self, url: str, interest: str,
                                        level: str, current_decision: str):
        """Show a dialog allowing the admin to override any pipeline policy."""
        dlg = tk.Toplevel(self)
        dlg.title("Override Pipeline Policy")
        dlg.geometry("620x560")
        dlg.configure(bg=COLORS["card"])
        dlg.transient(self)
        dlg.grab_set()

        # ── Header ────────────────────────────────────────────────────────
        hdr = tk.Frame(dlg, bg=COLORS["admin"], padx=15, pady=10)
        hdr.pack(fill="x")
        tk.Label(hdr, text="🔐 Override Pipeline Policy",
                 font=("Segoe UI", 13, "bold"), bg=COLORS["admin"],
                 fg="white").pack(side="left")

        # ── Body ──────────────────────────────────────────────────────────
        body = tk.Frame(dlg, bg=COLORS["card"], padx=25, pady=15)
        body.pack(fill="both", expand=True)

        def lbl(text, bold=False, color=None):
            tk.Label(body, text=text,
                     font=("Segoe UI", 10, "bold" if bold else "normal"),
                     bg=COLORS["card"],
                     fg=color or COLORS["text"]).pack(anchor="w", pady=(6, 0))

        lbl("Website URL", bold=True)
        tk.Label(body, text=url, font=("Consolas", 10),
                 bg=COLORS["bg"], fg=COLORS["primary"],
                 relief="solid", bd=1, padx=8, pady=4,
                 wraplength=560, justify="left").pack(fill="x", pady=(4, 0))

        row_info = tk.Frame(body, bg=COLORS["card"])
        row_info.pack(fill="x", pady=(10, 0))
        for header_txt, val_txt in [("Interest / Subject", interest), ("School Level", level)]:
            col = tk.Frame(row_info, bg=COLORS["card"])
            col.pack(side="left", padx=(0, 30))
            tk.Label(col, text=header_txt, font=("Segoe UI", 9, "bold"),
                     bg=COLORS["card"], fg=COLORS["text_light"]).pack(anchor="w")
            tk.Label(col, text=val_txt, font=("Segoe UI", 10),
                     bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")

        # Current decision badge
        curr_col = COLORS["success"] if current_decision == "ALLOWED" else COLORS["danger"]
        tk.Label(body,
                 text=f"Current decision: {current_decision}",
                 font=("Segoe UI", 10, "bold"),
                 bg=curr_col, fg="white",
                 padx=10, pady=3).pack(anchor="w", pady=(10, 0))

        # New decision radio
        lbl("New Decision", bold=True)
        dec_var = tk.StringVar(value="ALLOWED" if current_decision == "DENIED" else "DENIED")
        dec_frame = tk.Frame(body, bg=COLORS["card"])
        dec_frame.pack(anchor="w", pady=(4, 0))
        tk.Radiobutton(dec_frame, text="✅ ALLOWED", variable=dec_var,
                       value="ALLOWED", font=("Segoe UI", 11, "bold"),
                       bg=COLORS["card"], fg=COLORS["success"],
                       selectcolor=COLORS["card"]).pack(side="left", padx=(0, 25))
        tk.Radiobutton(dec_frame, text="🚫 DENIED", variable=dec_var,
                       value="DENIED", font=("Segoe UI", 11, "bold"),
                       bg=COLORS["card"], fg=COLORS["danger"],
                       selectcolor=COLORS["card"]).pack(side="left")

        # Reason
        lbl("Override Reason", bold=True)
        reason_var = tk.StringVar(
            value=f"Admin override: {current_decision} → {dec_var.get()}")
        tk.Entry(body, textvariable=reason_var,
                 font=("Segoe UI", 10), bg=COLORS["bg"],
                 relief="solid", bd=1).pack(fill="x", pady=(4, 0), ipady=4)

        # Scope selector (which student profile levels to apply to)
        lbl("Apply Override To", bold=True)
        scope_var = tk.StringVar(value="global")
        scope_frame = tk.Frame(body, bg=COLORS["card"])
        scope_frame.pack(anchor="w", pady=(4, 0))
        tk.Radiobutton(scope_frame, text="🌐 All levels (global)",
                       variable=scope_var, value="global",
                       font=("Segoe UI", 10), bg=COLORS["card"],
                       selectcolor=COLORS["card"]).pack(side="left", padx=(0, 20))
        tk.Radiobutton(scope_frame, text=f"🎯 This level only ({level})",
                       variable=scope_var, value="specific",
                       font=("Segoe UI", 10), bg=COLORS["card"],
                       selectcolor=COLORS["card"]).pack(side="left")

        # Alternatives
        lbl("Alternative URLs (optional, one per line: URL|description)", bold=True)
        alts_text = tk.Text(body, wrap="word", padx=8, pady=6,
                            font=("Consolas", 9), bg=COLORS["bg"],
                            relief="solid", bd=1, height=4)
        alts_text.pack(fill="x", pady=(4, 0))
        # Pre-fill from existing override if any
        existing = check_admin_override(url)
        if existing and existing.get("alternatives"):
            alts_text.insert("1.0",
                "\n".join(f"{a[0]}|{a[1]}" for a in existing["alternatives"]))

        # ── Action buttons ────────────────────────────────────────────────
        def apply():
            new_dec = dec_var.get()
            reason  = reason_var.get().strip() or f"Admin override: {current_decision} → {new_dec}"
            alts    = []
            for line in alts_text.get("1.0", "end-1c").strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                if "|" in line:
                    p = line.split("|", 1)
                    alts.append((p[0].strip(), p[1].strip()))
                else:
                    alts.append((line, "Alternative resource"))

            scope = scope_var.get()
            if scope == "global":
                save_policy_override(url, "Any", "Any", "Any", "Any", "NA",
                                     new_dec, alts, reason)
            else:
                # Map display level back to grade/age for the specific-context save
                _lvl_map = {
                    "Elementary School":    ("Elementary School", "1-5",   "6-11"),
                    "Middle School":        ("Middle School",     "6-8",   "11-14"),
                    "High School (9-10)":   ("High School",       "9-10",  "14-15"),
                    "High School (11-12)":  ("High School",       "11-12", "16-18"),
                    "High School":          ("High School",       "9-12",  "14-18"),
                }
                sl, gr, ar = _lvl_map.get(level, ("Any", "Any", "Any"))
                save_policy_override(url, sl, gr, ar, interest, "NA",
                                     new_dec, alts, reason)

            load_admin_overrides()
            messagebox.showinfo("Override Saved",
                                f"Policy for {url} set to {new_dec}.\n"
                                f"Scope: {'All levels (global)' if scope == 'global' else level}",
                                parent=dlg)
            dlg.destroy()
            self._pipeline_refresh()

        btn_row = tk.Frame(body, bg=COLORS["card"])
        btn_row.pack(fill="x", pady=(15, 0))
        tk.Button(btn_row, text="💾 Apply Override",
                  font=("Segoe UI", 11, "bold"),
                  bg=COLORS["admin"], fg="white", relief="flat",
                  padx=22, pady=8, cursor="hand2",
                  command=apply).pack(side="left", padx=(0, 10))
        tk.Button(btn_row, text="Cancel",
                  font=("Segoe UI", 10),
                  bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                  padx=16, pady=8, cursor="hand2",
                  command=dlg.destroy).pack(side="left")
       

# ═══════════════════════════════════════════════════════════════════════════
# GUI – RESULT WINDOW
# ═══════════════════════════════════════════════════════════════════════════
class ResultWindow(tk.Toplevel):
    """Displays the full access-control result for a single URL check."""

    def __init__(self, parent, result):
        super().__init__(parent)
        self.result = result
        self.parent = parent
        self.title("Access Control Result")
        self.configure(bg=COLORS["card"])
        self.geometry("680x700")
        self.resizable(True, True)
        self.transient(parent)
        self.grab_set()
        self._build_content()

        px, py = parent.winfo_x(), parent.winfo_y()
        pw, ph = parent.winfo_width(), parent.winfo_height()
        self.geometry(f"+{px + (pw - 680) // 2}+{py + (ph - 700) // 2}")

    def _build_content(self):
        # Scrollable main area
        canvas    = tk.Canvas(self, bg=COLORS["card"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(self, orient="vertical", command=canvas.yview)
        main      = tk.Frame(canvas, bg=COLORS["card"], padx=30, pady=30)

        main.bind("<Configure>",
                  lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=main, anchor="nw", width=650)
        canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        is_allowed = self.result["decision"] == "ALLOWED"

        # ── Header ──────────────────────────────────────────────────────────
        header = tk.Frame(main, bg=COLORS["card"])
        header.pack(fill="x", pady=(0, 20))

        icon_color = COLORS["success"] if is_allowed else COLORS["danger"]
        tk.Label(header, text="✅" if is_allowed else "🚫",
                 font=("Segoe UI", 48), bg=COLORS["card"],
                 fg=icon_color).pack()
        tk.Label(header,
                 text="Access Granted!" if is_allowed else "Access Denied",
                 font=("Segoe UI", 20, "bold"), bg=COLORS["card"],
                 fg=icon_color).pack(pady=(10, 0))

        # Badges
        badge_frame = tk.Frame(header, bg=COLORS["card"])
        badge_frame.pack(pady=(5, 0))
        if self.result.get("admin_override"):
            tk.Label(badge_frame, text="🔐 Admin Override",
                     font=("Segoe UI", 10, "bold"),
                     bg="#FEF3C7", fg=COLORS["warning"],
                     padx=10, pady=3).pack(side="left", padx=2)
        if self.result.get("fallback"):
            tk.Label(badge_frame, text="⚠️ Fallback Mode",
                     font=("Segoe UI", 10, "bold"),
                     bg="#FEE2E2", fg=COLORS["danger"],
                     padx=10, pady=3).pack(side="left", padx=2)

        # URL display
        url_frame = tk.Frame(header, bg=COLORS["card"])
        url_frame.pack(pady=(10, 0))
        if is_allowed:
            lbl = tk.Label(url_frame, text=self.result["url"],
                           font=("Consolas", 10, "underline"),
                           bg=COLORS["card"], fg=COLORS["primary"],
                           cursor="hand2")
            lbl.pack()
            lbl.bind("<Button-1>",
                     lambda e: webbrowser.open_new(self.result["url"]))
            tk.Label(url_frame, text="👆 Click to open",
                     font=("Segoe UI", 8), bg=COLORS["card"],
                     fg=COLORS["text_light"]).pack()
        else:
            tk.Label(url_frame, text=self.result["url"],
                     font=("Consolas", 10), bg=COLORS["card"],
                     fg=COLORS["text_light"]).pack()
            tk.Label(url_frame, text="🔒 Access restricted",
                     font=("Segoe UI", 8), bg=COLORS["card"],
                     fg=COLORS["danger"]).pack()

        # ── Decision box ────────────────────────────────────────────────────
        box_bg = "#F0FDF4" if is_allowed else "#FEF2F2"
        box    = tk.Frame(main, bg=box_bg, padx=20, pady=15, relief="solid", bd=1,
                          highlightbackground=(COLORS["success"] if is_allowed
                                               else COLORS["danger"]),
                          highlightthickness=2)
        box.pack(fill="x", pady=20)

        risk_colors = {"Safe": COLORS["success"], "Moderate": COLORS["warning"],
                       "High": COLORS["danger"]}
        risk_color  = risk_colors.get(self.result["risk_level"], COLORS["text"])

        risk_row = tk.Frame(box, bg=box_bg)
        risk_row.pack(fill="x")
        tk.Label(risk_row,
                 text=f"Risk Level: {self.result['risk_level']}",
                 font=("Segoe UI", 10, "bold"), bg=risk_color,
                 fg="white", padx=10, pady=3).pack(side="left")
        if "nlacp_count" in self.result:
            tk.Label(risk_row,
                     text=f"NLACP: {self.result['nlacp_count']} sentences",
                     font=("Segoe UI", 9), bg=box_bg,
                     fg=COLORS["text_light"]).pack(side="right")

        tk.Label(box, text=self.result["reason"],
                 font=("Segoe UI", 11), bg=box_bg, fg=COLORS["text"],
                 wraplength=580, justify="left").pack(fill="x", pady=(10, 0), anchor="w")

        # ── Alternatives / disability recs (shown when DENIED or disability set) ──
        alt_list = self.result.get("alternatives_list", [])
        disability = self.result.get("disability", "NA")

        # Show alternatives section whenever there are entries to display
        if alt_list:
            # Separate policy alternatives from disability-specific ones
            policy_alts   = [(u, d) for u, d in alt_list
                             if not d.startswith(f"[{disability}]")]
            dis_alts      = [(u, d) for u, d in alt_list
                             if d.startswith(f"[{disability}]")]

            # Policy alternatives (only shown on DENIED)
            if not is_allowed and policy_alts:
                self._render_alt_section(
                    main,
                    "🌟 Recommended Safe Alternatives",
                    "These websites offer similar content:",
                    policy_alts,
                )

            # Disability-specific recommendations (shown for any decision)
            if dis_alts:
                self._render_alt_section(
                    main,
                    f"♿ Recommended for {disability}",
                    f"Accessibility-optimised sites for your interest ({_normalize_interest(self.result.get('interest',''))}):",
                    dis_alts,
                    label_strip_prefix=f"[{disability}] ",
                )

        # ── Accessibility features ──────────────────────────────────────────
        if is_allowed and self.result.get("accessibility_features"):
            tk.Label(main,
                     text=f"♿ Accessibility Features: {self.result['accessibility_features']}",
                     font=("Segoe UI", 10), bg=COLORS["card"],
                     fg=COLORS["accent"]).pack(anchor="w", pady=(0, 20))

        # ── Admin override button (inside result window) ────────────────────
        override_frame = tk.Frame(main, bg=COLORS["card"])
        override_frame.pack(fill="x", pady=(10, 0))

        tk.Button(override_frame,
                  text="🔐 Admin Override (Change This Decision)",
                  font=("Segoe UI", 10, "bold"),
                  bg=COLORS["admin"], fg="black", relief="flat",
                  padx=20, pady=8, cursor="hand2",
                  command=self._admin_override).pack(pady=5)

        # ── Close button ────────────────────────────────────────────────────
        tk.Button(main, text="Close",
                  font=("Segoe UI", 11, "bold"),
                  bg=COLORS["primary"] if is_allowed else COLORS["text"],
                  fg="black", relief="flat", padx=30, pady=10,
                  cursor="hand2", command=self.destroy).pack(pady=(10, 0))

    def _render_alt_section(self, parent, title, subtitle, items,
                             label_strip_prefix=""):
        section = tk.LabelFrame(parent, text=f" {title} ",
                                font=("Segoe UI", 12, "bold"),
                                bg=COLORS["card"], fg=COLORS["primary"],
                                padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))

        tk.Label(section, text=subtitle,
                 font=("Segoe UI", 10), bg=COLORS["card"],
                 fg=COLORS["text_light"]).pack(anchor="w", pady=(0, 10))

        for url, description in items:
            if label_strip_prefix and description.startswith(label_strip_prefix):
                description = description[len(label_strip_prefix):]

            card = tk.Frame(section, bg="#EFF6FF", padx=10, pady=10,
                            relief="solid", bd=1,
                            highlightbackground="#BFDBFE",
                            highlightthickness=1)
            card.pack(fill="x", pady=5)

            lbl = tk.Label(card, text=f"🔗 {url}",
                           font=("Consolas", 10, "underline"),
                           bg="#EFF6FF", fg=COLORS["primary"], cursor="hand2")
            lbl.pack(anchor="w")
            lbl.bind("<Button-1>", lambda e, u=url: webbrowser.open_new(u))

            tk.Label(card, text=f"✓ {description}",
                     font=("Segoe UI", 9), bg="#EFF6FF", fg=COLORS["text"],
                     wraplength=540, justify="left").pack(anchor="w", pady=(5, 0))

    def _admin_override(self):
        password = simpledialog.askstring(
            "Admin Authentication",
            "Enter admin password to override this policy:",
            show="*", parent=self)

        if password is None:
            return
        if password != ADMIN_PASSWORD:
            messagebox.showerror("Access Denied", "Incorrect password.", parent=self)
            return

        dialog = tk.Toplevel(self)
        dialog.title("Override Policy")
        dialog.geometry("500x420")
        dialog.configure(bg=COLORS["card"])
        dialog.transient(self)
        dialog.grab_set()

        tk.Label(dialog, text="Admin Policy Override",
                 font=("Segoe UI", 14, "bold"), bg=COLORS["card"],
                 fg=COLORS["admin"]).pack(pady=10)
        tk.Label(dialog, text=f"URL: {self.result['url']}",
                 font=("Segoe UI", 10), bg=COLORS["card"],
                 fg=COLORS["text"], wraplength=450).pack(pady=5)
        tk.Label(dialog,
                 text=(f"Student Profile: {self.result['school_level']} | "
                       f"Grade {self.result['grade_range']} | "
                       f"Age {self.result['age_range']}"),
                 font=("Segoe UI", 10), bg=COLORS["card"],
                 fg=COLORS["text"]).pack(pady=5)
        tk.Label(dialog,
                 text=(f"Interest: {self.result['interest']} | "
                       f"Disability: {self.result['disability']}"),
                 font=("Segoe UI", 10), bg=COLORS["card"],
                 fg=COLORS["text"]).pack(pady=5)

        tk.Label(dialog, text="New Decision:", font=("Segoe UI", 11, "bold"),
                 bg=COLORS["card"]).pack(pady=(20, 5))

        current   = self.result["decision"]
        dec_var   = tk.StringVar(value="ALLOWED" if current == "DENIED" else "DENIED")
        dec_frame = tk.Frame(dialog, bg=COLORS["card"])
        dec_frame.pack(pady=5)

        tk.Radiobutton(dec_frame, text="✅ ALLOWED", variable=dec_var,
                       value="ALLOWED", font=("Segoe UI", 11),
                       bg=COLORS["card"], fg=COLORS["success"]).pack(side="left", padx=10)
        tk.Radiobutton(dec_frame, text="🚫 DENIED", variable=dec_var,
                       value="DENIED", font=("Segoe UI", 11),
                       bg=COLORS["card"], fg=COLORS["danger"]).pack(side="left", padx=10)

        tk.Label(dialog, text="Reason (optional):", font=("Segoe UI", 10),
                 bg=COLORS["card"]).pack(pady=(15, 5))
        reason_entry = tk.Entry(dialog, font=("Segoe UI", 10), width=50,
                                bg=COLORS["bg"], relief="solid", bd=1)
        reason_entry.pack(pady=5, padx=20, fill="x")
        reason_entry.insert(0, f"Admin override: {current} → {dec_var.get()}")

        def apply_override():
            new_dec = dec_var.get()
            reason  = (reason_entry.get().strip() or
                       f"Admin override: {current} → {new_dec}")
            save_policy_override(
                url=self.result["url"],
                school_level=self.result["school_level"],
                grade=self.result["grade_range"],
                age=self.result["age_range"],
                interest=self.result["interest"],
                disability=self.result["disability"],
                decision=new_dec,
                alternatives=self.result.get("alternatives_list", []),
                reason=reason,
            )
            messagebox.showinfo(
                "Override Applied",
                f"Policy override saved!\n\n"
                f"URL: {self.result['url']}\n"
                f"Decision: {new_dec}\n"
                f"Context: {self.result['school_level']}, "
                f"Grade {self.result['grade_range']}, "
                f"Age {self.result['age_range']}\n\n"
                "This override will apply only to this specific student profile.",
                parent=dialog)
            dialog.destroy()
            self.destroy()

        tk.Button(dialog, text="Apply Override", command=apply_override,
                  bg=COLORS["admin"], fg="white",
                  font=("Segoe UI", 11, "bold"),
                  padx=20, pady=8).pack(pady=20)

# ═══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    load_admin_overrides()
    # Start GUI (main thread)
    app = AgentVLMApp()
    app.mainloop()
    # Start API in background
    api = SimpleAPI()
    api.run()
    
    
    