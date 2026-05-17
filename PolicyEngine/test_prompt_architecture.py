# test_prompt_architecture.py
"""
AGentVLM Dual-Architecture Test Suite
======================================
Wired directly to the actual server.py analyze_url function.

CHANGES vs previous version:
  - accessibility_analysis values are now integers 0-5 (not "Accessible"/
    "Needs Improvement"). N3 passes if |got - expected| <= 1 (±1 tolerance).
  - C2 age scoring: AI may be 1-2 years HIGHER than expected (warns but passes).
    AI may NEVER be lower than expected (hard fail). More than 2 years higher
    also fails.
"""

import os
import sys
import json
import time
import asyncio
import re
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def parse_age_num(age_str):
    """
    Extract integer from an age string like '13+' → 13.
    Returns None if the string is not a valid 'X+' format.
    """
    m = re.match(r'^(\d+)\+$', str(age_str or ''))
    return int(m.group(1)) if m else None


# ═══════════════════════════════════════════════════════════════════════════════
# GOLDEN DATASET
# Accessibility scores use 0-5 integer scale:
#   0 = completely inaccessible   3 = somewhat accessible
#   1 = very poor                 4 = mostly accessible
#   2 = needs significant work    5 = fully accessible
#
# Mapping from old binary schema:
#   "Accessible"        → 4
#   "Needs Improvement" → 2
#
# N3 scorer uses ±1 tolerance, so a 3 passes for an expected 4, and vice versa.
# ═══════════════════════════════════════════════════════════════════════════════

GOLDEN_URLS = [
    # ──────────────────────────────────────────────────────────────────────────
    # TC-01 | CLEAR PASS — pbslearningmedia.org
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id":    "TC-01",
        "label": "Clear Pass",
        "url":   "https://www.pbslearningmedia.org",
        "old_expected": {
            "suitability_for_school":  "Suitable",
            "age_restriction":         "All Ages",
            "recommended_grade_level": "Grades 1\u20133",
            "unsuitability_reasons":   None,
            "accessibility_score":     "Accessible",
        },
        "new_expected": {
            "suitability_for_school":  "Suitable",
            "age_restriction":         "6+",
            "recommended_grade_level": "Grade 1",
            "unsuitability_reasons":   [],
            "safe_alternatives":       [],
            "accessibility_analysis": {
                # PBS: structured content, TTS, closed captions, clean layout
                # Color_Blindness: no dedicated colorblind mode → some reliance on color
                "ADHD":               4,
                "Color_Blindness":    2,
                "Hearing_Impairment": 4,
                "Dyslexia":           4,
                "Autism":             4,
            }
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # TC-02 | CLEAR FAIL — reddit.com/r/science
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id":    "TC-02",
        "label": "Clear Fail",
        "url":   "https://www.reddit.com/r/science",
        "old_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "16+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   "Inappropriate Content",
            "accessibility_score":     "Not Accessible",
        },
        "new_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "16+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   ["Unmoderated User Content"],
            "safe_alternatives": [
                "https://www.pbslearningmedia.org",
                "https://kids.nationalgeographic.com"
            ],
            "accessibility_analysis": {
                # Reddit: dense threaded layout, no captions, heavy JS, cluttered
                "ADHD":               2,
                "Color_Blindness":    2,
                "Hearing_Impairment": 2,
                "Dyslexia":           2,
                "Autism":             2,
            }
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # TC-03 | CONTEXT TRAP — Wikipedia World War II
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id":    "TC-03",
        "label": "Context Trap",
        "url":   "https://en.wikipedia.org/wiki/World_War_II",
        "old_expected": {
            "suitability_for_school":  "Suitable",
            "age_restriction":         "13+",
            "recommended_grade_level": "Grades 7\u20139",
            "unsuitability_reasons":   None,
            "accessibility_score":     "Not Accessible",
        },
        "new_expected": {
            "suitability_for_school":  "Suitable",
            "age_restriction":         "13+",
            "recommended_grade_level": "Grade 8",
            "unsuitability_reasons":   [],
            "safe_alternatives":       [],
            "accessibility_analysis": {
                # Wikipedia: wall of text, dense layout, no forced structure
                # Color_Blindness: text-only, no color dependency → good
                # Hearing_Impairment: fully text-based → good
                "ADHD":               2,
                "Color_Blindness":    4,
                "Hearing_Impairment": 4,
                "Dyslexia":           2,
                "Autism":             2,
            }
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # TC-04 | COGNITIVE OVERLOAD TRAP — dailymail.co.uk
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id":    "TC-04",
        "label": "Cognitive Overload Trap",
        "url":   "https://www.dailymail.co.uk",
        "old_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "16+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   "Inappropriate Content",
            "accessibility_score":     "Not Accessible",
        },
        "new_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "16+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   [
                "Inappropriate Content",
                "Commercial or Non-Educational"
            ],
            "safe_alternatives":       [],
            "accessibility_analysis": {
                # DailyMail: heavy ads, autoplay video, color-coded sections
                # Hearing_Impairment: most content is text → captions not required
                "ADHD":               2,
                "Color_Blindness":    2,
                "Hearing_Impairment": 4,
                "Dyslexia":           2,
                "Autism":             2,
            }
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # TC-05 | ACCESSIBILITY CHALLENGE — gambling-math.com
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id":    "TC-05",
        "label": "Accessibility Challenge",
        "url":   "https://www.gambling-math.com",
        "old_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "18+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   "Inappropriate Content",
            "accessibility_score":     "Not Accessible",
        },
        "new_expected": {
            "suitability_for_school":  "Unsuitable",
            "age_restriction":         "18+",
            "recommended_grade_level": None,
            "unsuitability_reasons":   ["Gambling or Betting"],
            "safe_alternatives": [
                "https://www.khanacademy.org/math"
            ],
            "accessibility_analysis": {
                # Gambling site: color-coded odds, flashing animations,
                # dense probability tables, no TTS, no captions
                "ADHD":               1,
                "Color_Blindness":    1,
                "Hearing_Impairment": 1,
                "Dyslexia":           1,
                "Autism":             1,
            }
        }
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# OLD PROMPT SCORER  (C1–C5 only — what the old schema can produce)
# ═══════════════════════════════════════════════════════════════════════════════

def score_old(test_case: dict, result: dict) -> dict:
    """
    Scores against old_expected using old server.py field names.
    Old server.py JSON fields:
      suitability_for_school   → "Suitable" | "Unsuitable"
      age_restriction          → "All Ages" | "7+" | "10+" | "13+" | "16+" | "18+"
      recommended_grade_level  → "Grades 1–3" | ... | null
      unsuitability_reasons    → single string
      accessibility_score      → "Accessible" | "Not Accessible"
    """
    gt = test_case["old_expected"]
    s  = {}

    # C1 — Safety decision
    got = result.get("suitability_for_school", "")
    s["C1_safety_decision"] = {
        "pass":     got == gt["suitability_for_school"],
        "expected": gt["suitability_for_school"],
        "got":      got,
    }

    # C2 — Age output (old bracket vocabulary; no tolerance logic needed here)
    got_age = result.get("age_restriction", "")
    s["C2_age_output"] = {
        "pass":     got_age == gt["age_restriction"],
        "expected": gt["age_restriction"],
        "got":      got_age,
        "note":     "Old schema: bracket like 'All Ages' or '16+'"
    }

    # C3 — Grade output (old bracket vocabulary)
    got_grade = result.get("recommended_grade_level")
    exp_grade = gt["recommended_grade_level"]
    if exp_grade is None:
        grade_pass = got_grade in (None, "", "N/A", "null", "None")
    else:
        grade_pass = got_grade == exp_grade
    s["C3_grade_output"] = {
        "pass":     grade_pass,
        "expected": exp_grade,
        "got":      got_grade,
        "note":     "Old schema: 'Grades 7–9' not 'Grade 8'"
    }

    # C4 — Safe alternatives
    exp_alts = test_case["new_expected"].get("safe_alternatives", [])
    got_alts = result.get("safe_alternatives", [])
    if not exp_alts:
        alts_pass = True
    else:
        overlap   = [g for g in got_alts for e in exp_alts if e in g]
        alts_pass = len(overlap) >= 1
    s["C4_safe_alternatives"] = {
        "pass":     alts_pass,
        "expected": exp_alts,
        "got":      got_alts,
        "overlap":  list(set(exp_alts) & set(got_alts)),
    }

    # C5 — CoT reasoning (old prompt has no CoT → always fails)
    cot_text = result.get("safety_and_suitability_analysis", "")
    s["C5_cot_reasoning"] = {
        "pass": isinstance(cot_text, str) and len(cot_text) > 60,
        "got":  cot_text[:80] if cot_text else "FIELD MISSING",
        "note": "Old prompt has no CoT fields — expected ❌ on all 5 test cases"
    }

    dim_keys = [
        "C1_safety_decision", "C2_age_output", "C3_grade_output",
        "C4_safe_alternatives", "C5_cot_reasoning"
    ]
    passes = [s[k]["pass"] for k in dim_keys]
    s["overall_pass"]        = all(passes)
    s["dimensions_passed"]   = f"{sum(passes)}/{len(passes)}"
    s["dimension_breakdown"] = {k: s[k]["pass"] for k in dim_keys}
    s["warnings"]            = []
    return s


# ═══════════════════════════════════════════════════════════════════════════════
# NEW PROMPT SCORER  (C1–C5 comparable + N1–N3 new capabilities)
# ═══════════════════════════════════════════════════════════════════════════════

DISABILITY_KEYS = ["ADHD", "Color_Blindness", "Hearing_Impairment", "Dyslexia", "Autism"]


def score_new(test_case: dict, result: dict) -> dict:
    """
    Scores against new_expected using new prompt field names.

    AGE TOLERANCE RULE (C2):
      - AI exactly matches expected                    → ✅ PASS
      - AI is 1 or 2 years higher than expected        → ✅ PASS + ⚠️  WARNING printed
      - AI is more than 2 years higher than expected   → ❌ FAIL
      - AI is ANY amount lower than expected            → ❌ HARD FAIL (never allowed)

    ACCESSIBILITY TOLERANCE RULE (N3):
      - Each disability key: PASS if |got - expected| <= 1
      - Values must be integers 0-5
      - The whole N3 dimension passes only if ALL 5 keys pass
    """
    gt       = test_case["new_expected"]
    s        = {}
    warnings = []

    # ── C1 — Safety decision ─────────────────────────────────────────────────
    got = result.get("suitability_for_school", "")
    s["C1_safety_decision"] = {
        "pass":     got == gt["suitability_for_school"],
        "expected": gt["suitability_for_school"],
        "got":      got,
    }

    # ── C2 — Age output (exact format + tolerance logic) ─────────────────────
    got_age     = result.get("age_restriction", "")
    is_exact    = bool(re.match(r'^\d+\+$', str(got_age)))
    exp_age_num = parse_age_num(gt["age_restriction"])
    got_age_num = parse_age_num(got_age) if is_exact else None

    if not is_exact or exp_age_num is None or got_age_num is None:
        # Not even a valid format → fail immediately
        c2_pass    = False
        age_note   = "Age is not a valid 'X+' integer format"
    elif got_age_num < exp_age_num:
        # Lower than expected → hard fail, no tolerance
        c2_pass    = False
        age_note   = (
            f"HARD FAIL — AI age ({got_age}) is LOWER than minimum "
            f"expected ({gt['age_restriction']}). Lower is never allowed."
        )
    elif got_age_num == exp_age_num:
        c2_pass    = True
        age_note   = "Exact match"
    elif got_age_num <= exp_age_num + 2:
        # 1-2 years higher → pass with warning
        c2_pass    = True
        age_note   = (
            f"Within tolerance (+{got_age_num - exp_age_num} year(s)). "
            f"Expected {gt['age_restriction']}, got {got_age}."
        )
        warnings.append(
            f"⚠️  C2 AGE WARNING [{test_case['id']}]: AI returned {got_age}, "
            f"which is {got_age_num - exp_age_num} year(s) higher than the "
            f"expected {gt['age_restriction']}. "
            f"This is within the ±2 tolerance and PASSES, but review if intentional."
        )
    else:
        # More than 2 years higher → fail
        c2_pass    = False
        age_note   = (
            f"AI age ({got_age}) is {got_age_num - exp_age_num} years above "
            f"expected ({gt['age_restriction']}), exceeding the +2 tolerance."
        )

    s["C2_age_output"] = {
        "pass":              c2_pass,
        "expected":          gt["age_restriction"],
        "got":               got_age,
        "is_exact_format":   is_exact,
        "note":              age_note,
    }

    # ── C3 — Grade output (exact format) ─────────────────────────────────────
    got_grade  = result.get("recommended_grade_level")
    exp_grade  = gt["recommended_grade_level"]
    if exp_grade is None:
        grade_pass  = got_grade in (None, "", "N/A", "null", "None")
        grade_exact = True
    else:
        grade_exact = bool(re.match(r'^Grade \d+$', str(got_grade or "")))
        grade_pass  = got_grade == exp_grade

    s["C3_grade_output"] = {
        "pass":            grade_pass,
        "expected":        exp_grade,
        "got":             got_grade,
        "is_exact_format": grade_exact,
        "note":            "New schema: must be exact like 'Grade 8' not 'Grades 7–9'"
    }

    # ── C4 — Safe alternatives ────────────────────────────────────────────────
    exp_alts = gt.get("safe_alternatives", [])
    got_alts = result.get("safe_alternatives", [])
    if not exp_alts:
        alts_pass = True
    else:
        overlap   = set(exp_alts) & set(got_alts)
        alts_pass = len(overlap) >= 1

    s["C4_safe_alternatives"] = {
        "pass":     alts_pass,
        "expected": exp_alts,
        "got":      got_alts,
        "overlap":  list(set(exp_alts) & set(got_alts)),
    }

    # ── C5 — CoT reasoning ───────────────────────────────────────────────────
    ssa      = result.get("safety_and_suitability_analysis", "")
    caa      = result.get("curriculum_and_age_analysis", "")
    cot_base = (isinstance(ssa, str) and len(ssa) > 60 and
                isinstance(caa, str) and len(caa) > 60)

    if test_case["id"] == "TC-03":
        kws      = ["grade", "middle", "history", "curriculum", "appropriate",
                    "war", "context", "age"]
        cot_pass = cot_base and any(k in ssa.lower() for k in kws)
        cot_note = f"TC-03: CoT must contain one of {kws}"
    else:
        cot_pass = cot_base
        cot_note = "Both CoT fields must be >60 chars"

    s["C5_cot_reasoning"] = {
        "pass":        cot_pass,
        "ssa_preview": (ssa[:150] + "...") if len(ssa) > 150 else ssa,
        "caa_preview": (caa[:150] + "...") if len(caa) > 150 else caa,
        "note":        cot_note,
    }

    # ── N1 — Granularity upgrade ──────────────────────────────────────────────
    n1_pass = (
        bool(re.match(r'^\d+\+$', str(result.get("age_restriction", "")))) and
        (result.get("recommended_grade_level") is None or
         bool(re.match(r'^Grade \d+$',
                       str(result.get("recommended_grade_level", "")))))
    )
    s["N1_granularity_upgrade"] = {
        "pass": n1_pass,
        "note": "Both age AND grade must use new exact integer format"
    }

    # ── N2 — Multi-reason array ───────────────────────────────────────────────
    got_reasons = result.get("unsuitability_reasons", "NOT_PRESENT")
    exp_reasons = set(gt["unsuitability_reasons"])
    is_list     = isinstance(got_reasons, list)

    if not exp_reasons:
        n2_pass = is_list and len(got_reasons) == 0
    else:
        n2_pass = is_list and exp_reasons.issubset(set(got_reasons))

    s["N2_multi_reason_array"] = {
        "pass":     n2_pass,
        "is_list":  is_list,
        "expected": sorted(exp_reasons),
        "got":      got_reasons,
        "note":     "Old prompt returns single string; new must return a list"
    }

    # ── N3 — Accessibility matrix (0-5 integer scale, ±1 tolerance) ──────────
    gt_acc   = gt["accessibility_analysis"]
    got_acc  = result.get("accessibility_analysis", {})
    is_dict  = isinstance(got_acc, dict)

    acc_detail   = {}
    acc_all_pass = is_dict

    for key in DISABILITY_KEYS:
        exp_val = gt_acc.get(key)
        got_val = got_acc.get(key) if is_dict else None

        # Try to interpret as integer
        try:
            got_int = int(got_val) if got_val is not None else None
        except (ValueError, TypeError):
            got_int = None

        if exp_val is None or got_int is None:
            key_pass = False
            key_note = "Missing or non-integer value"
        elif abs(got_int - exp_val) <= 1:
            key_pass = True
            key_note = (
                "Exact match" if got_int == exp_val
                else f"Within ±1 tolerance (expected {exp_val}, got {got_int})"
            )
        else:
            key_pass = False
            key_note = f"Difference of {abs(got_int - exp_val)} exceeds ±1 tolerance"

        acc_detail[key] = {
            "pass":     key_pass,
            "expected": exp_val,
            "got":      got_int if got_int is not None else got_val,
            "note":     key_note,
        }
        if not key_pass:
            acc_all_pass = False

    s["N3_accessibility_matrix"] = {
        "pass":    acc_all_pass,
        "is_dict": is_dict,
        "detail":  acc_detail,
        "note":    (
            "Values are integers 0-5 (both inclusive). "
            "PASS if |got - expected| <= 1 for all 5 keys. "
            "0=completely inaccessible … 5=fully accessible."
        )
    }

    # ── Aggregate ─────────────────────────────────────────────────────────────
    dim_keys = [
        "C1_safety_decision", "C2_age_output", "C3_grade_output",
        "C4_safe_alternatives", "C5_cot_reasoning",
        "N1_granularity_upgrade", "N2_multi_reason_array",
        "N3_accessibility_matrix"
    ]
    passes = [s[k]["pass"] for k in dim_keys]
    s["overall_pass"]        = all(passes)
    s["dimensions_passed"]   = f"{sum(passes)}/{len(passes)}"
    s["dimension_breakdown"] = {k: s[k]["pass"] for k in dim_keys}
    s["warnings"]            = warnings
    return s


# ═══════════════════════════════════════════════════════════════════════════════
# SERVER CALLER
# ═══════════════════════════════════════════════════════════════════════════════

def call_analyze(url: str) -> dict:
    """
    Imports analyze_url directly from server.py and calls it.
    Unwraps the {"classification": {...}} envelope.
    """
    from server import analyze_url  # noqa: PLC0415
    raw = asyncio.run(
        analyze_url({"url": url, "student_grade": None})
    )
    if isinstance(raw, dict) and "classification" in raw:
        return raw["classification"]
    return raw


# ═══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

def run_test_suite(run_label: str, output_dir: str, score_fn) -> dict:
    """
    Runs all 5 golden URLs, saves raw output, scores each result.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp  = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    all_scores = []

    print(f"\n{'='*70}")
    print(f"  TEST RUN : {run_label}")
    print(f"  Started  : {timestamp}")
    print(f"  Note     : embed_chunks_safe sleeps 60s per batch — be patient")
    print(f"{'='*70}\n")

    for tc in GOLDEN_URLS:
        print(f"  [{tc['id']}] {tc['label']}")
        print(f"         URL : {tc['url']}")
        t0 = time.time()

        try:
            result = call_analyze(tc["url"])
            error  = None
        except Exception as exc:
            result = {}
            error  = str(exc)
            print(f"         ERROR: {error}")

        elapsed = round(time.time() - t0, 2)

        # Save raw LLM output — thesis evidence
        raw_path = os.path.join(output_dir, f"{tc['id']}_raw.json")
        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(
                {"test_case_id": tc["id"],
                 "label":        tc["label"],
                 "url":          tc["url"],
                 "raw_result":   result,
                 "error":        error},
                f, indent=2, ensure_ascii=False
            )

        # Score
        if error:
            n_dims = 5 if "OLD" in run_label else 8
            score  = {
                "overall_pass":       False,
                "dimensions_passed":  f"0/{n_dims}",
                "dimension_breakdown": {},
                "warnings":           [],
                "error":              error
            }
        else:
            score = score_fn(tc, result)

        score["test_id"]   = tc["id"]
        score["label"]     = tc["label"]
        score["url"]       = tc["url"]
        score["elapsed_s"] = elapsed
        all_scores.append(score)

        status = "✅ PASS" if score["overall_pass"] else "❌ FAIL"
        print(f"         {status} | {score['dimensions_passed']} | {elapsed}s")

        for dim, passed in score.get("dimension_breakdown", {}).items():
            mark = "✓" if passed else "✗"
            print(f"            {mark} {dim}")

            if not passed:
                dim_data = score.get(dim, {})

                if dim == "N3_accessibility_matrix" and "detail" in dim_data:
                    # Show all 5 keys with expected vs got and tolerance note
                    print("               ↳ Accessibility scores (0-5 scale, ±1 tolerance):")
                    for key, v in dim_data["detail"].items():
                        tick = "✓" if v["pass"] else "✗"
                        print(f"                  {tick} {key:<22} | "
                              f"Expected: {v['expected']}  |  Got: {v['got']}  |  {v['note']}")
                else:
                    exp  = dim_data.get("expected", "N/A")
                    got  = dim_data.get("got", "N/A")
                    note = dim_data.get("note", "")
                    print(f"               ↳ Expected: {exp}")
                    print(f"               ↳ Actual:   {got}")
                    if note:
                        print(f"               ↳ Hint:     {note}")

            else:
                # For passing N3, still show the tolerance breakdown so you can see scores
                if dim == "N3_accessibility_matrix":
                    dim_data = score.get(dim, {})
                    if "detail" in dim_data:
                        print("               ↳ Accessibility scores (all within ±1 tolerance):")
                        for key, v in dim_data["detail"].items():
                            print(f"                     {key:<22} | "
                                  f"Expected: {v['expected']}  |  Got: {v['got']}  |  {v['note']}")

        # Print any age warnings after the dimension breakdown
        for w in score.get("warnings", []):
            print(f"\n         {w}")

        print()

    report = {
        "run_label":  run_label,
        "timestamp":  timestamp,
        "total_pass": sum(1 for s in all_scores if s["overall_pass"]),
        "total_fail": sum(1 for s in all_scores if not s["overall_pass"]),
        "results":    all_scores
    }
    report_path = os.path.join(output_dir, "score_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"  TOTAL PASS : {report['total_pass']}/5")
    print(f"  Report     : {report_path}")
    print(f"{'='*70}\n")
    return report


# ═══════════════════════════════════════════════════════════════════════════════
# COMPARISON TABLE
# ═══════════════════════════════════════════════════════════════════════════════

def compare_runs(old_path: str, new_path: str):
    """Side-by-side comparison table for the thesis."""
    with open(old_path, encoding="utf-8") as f:
        old = json.load(f)
    with open(new_path, encoding="utf-8") as f:
        new = json.load(f)

    old_by_id = {r["test_id"]: r for r in old["results"]}
    new_by_id = {r["test_id"]: r for r in new["results"]}

    COMPARABLE = [
        ("C1_safety_decision",   "C1  Safety Decision"),
        ("C2_age_output",        "C2  Age Output"),
        ("C3_grade_output",      "C3  Grade Output"),
        ("C4_safe_alternatives", "C4  Safe Alternatives"),
        ("C5_cot_reasoning",     "C5  CoT Reasoning"),
    ]
    NEW_CAPS = [
        ("N1_granularity_upgrade",  "N1  Granularity Upgrade"),
        ("N2_multi_reason_array",   "N2  Multi-Reason Array"),
        ("N3_accessibility_matrix", "N3  Accessibility Matrix (0-5, ±1)"),
    ]

    print(f"\n{'='*80}")
    print(f"  ARCHITECTURE COMPARISON")
    print(f"  OLD : {old['run_label']}   total pass {old['total_pass']}/5")
    print(f"  NEW : {new['run_label']}   total pass {new['total_pass']}/5")
    print(f"{'='*80}")

    for tc in GOLDEN_URLS:
        tid  = tc["id"]
        o_bd = old_by_id.get(tid, {}).get("dimension_breakdown", {})
        n_bd = new_by_id.get(tid, {}).get("dimension_breakdown", {})

        print(f"\n  [{tid}] {tc['label']}")
        print(f"  {'─'*72}")
        print(f"  {'Dimension':<38} {'OLD':^10} {'NEW':^10} {'Δ':^12}")
        print(f"  {'─'*72}")

        for key, label in COMPARABLE:
            o_p   = o_bd.get(key, False)
            n_p   = n_bd.get(key, False)
            delta = ("⬆ fixed" if not o_p and n_p else
                     "⬇ broke" if o_p  and not n_p else
                     "= same")
            print(f"  {label:<38} {'✅' if o_p else '❌':^10} "
                  f"{'✅' if n_p else '❌':^10} {delta:^12}")

        print(f"  {'─'*72}")
        print(f"  {'New Capabilities (NEW only)':<38} {'N/A':^10}")
        for key, label in NEW_CAPS:
            n_p = n_bd.get(key, False)
            print(f"  {label:<38} {'—':^10} {'✅' if n_p else '❌':^10}")

        # Print age warnings for this TC if any
        new_result = new_by_id.get(tid, {})
        for w in new_result.get("warnings", []):
            print(f"  {w}")

    # Summary row
    print(f"\n{'='*80}")
    print(f"  SUMMARY — all 5 test cases combined")
    print(f"  {'─'*72}")
    print(f"  {'Dimension':<38} {'OLD /5':^10} {'NEW /5':^10} {'Δ net':^12}")
    print(f"  {'─'*72}")

    for key, label in COMPARABLE:
        o_tot = sum(
            1 for tc in GOLDEN_URLS
            if old_by_id.get(tc["id"], {})
                        .get("dimension_breakdown", {})
                        .get(key, False)
        )
        n_tot = sum(
            1 for tc in GOLDEN_URLS
            if new_by_id.get(tc["id"], {})
                        .get("dimension_breakdown", {})
                        .get(key, False)
        )
        net = n_tot - o_tot
        print(f"  {label:<38} {o_tot:^10} {n_tot:^10} "
              f"{('+' if net > 0 else '') + str(net):^12}")

    print(f"  {'─'*72}")
    for key, label in NEW_CAPS:
        n_tot = sum(
            1 for tc in GOLDEN_URLS
            if new_by_id.get(tc["id"], {})
                        .get("dimension_breakdown", {})
                        .get(key, False)
        )
        print(f"  {label:<38} {'—':^10} {n_tot:^10} {'NEW CAP':^12}")

    print(f"\n  OVERALL   OLD {old['total_pass']}/5   "
          f"NEW {new['total_pass']}/5   "
          f"Δ +{new['total_pass'] - old['total_pass']}")
    print(f"{'='*80}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    """
    WORKFLOW
    ────────
    Step 1 — keep server.py as-is (old prompt), then run:
        python test_prompt_architecture.py --run old
    Step 2 — replace with new prompt (build_optimized_prompt), then run:
        python test_prompt_architecture.py --run new
    Step 3 — print comparison table:
        python test_prompt_architecture.py --compare
    """
    cmd  = sys.argv[1] if len(sys.argv) > 1 else "--help"
    flag = sys.argv[2] if len(sys.argv) > 2 else ""

    if cmd == "--run" and flag == "old":
        run_test_suite(
            run_label  = "OLD_ARCHITECTURE",
            output_dir = "Old_Results",
            score_fn   = score_old,
        )
    elif cmd == "--run" and flag == "new":
        run_test_suite(
            run_label  = "NEW_ARCHITECTURE",
            output_dir = "New_Results",
            score_fn   = score_new,
        )
    elif cmd == "--compare":
        compare_runs(
            old_path = "Old_Results/score_report.json",
            new_path = "New_Results/score_report.json",
        )
    else:
        print("\nUsage:")
        print("  python test_prompt_architecture.py --run old")
        print("  python test_prompt_architecture.py --run new")
        print("  python test_prompt_architecture.py --compare")
        print()
        print("Scoring rules (new prompt):")
        print("  C2 Age   : AI may be 0-2 years HIGHER → pass + warning.")
        print("             AI lower than expected      → hard fail always.")
        print("  N3 Access: Values are integers 0-5 (0 and 5 inclusive).")
        print("             Pass if |got - expected| <= 1 for all 5 keys.")