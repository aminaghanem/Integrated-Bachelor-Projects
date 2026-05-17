import os
import json
import time
import re
import random
import asyncio
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from fastapi import FastAPI
import uvicorn
import nest_asyncio
from yt_dlp import YoutubeDL
from tqdm import tqdm
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────
SAVE_DIR = "./videos"
REPORT_PATH = "./video_fetch_report.jsonl"
os.makedirs(SAVE_DIR, exist_ok=True)

API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDHAy8gDZ4UBXvsrS8_pV-Z4-k4h5oUEO4")
nest_asyncio.apply()

# ──────────────────────────────────────────────────────────────────────────────
# THE OPTIMIZED PROMPT BUILDER
# ──────────────────────────────────────────────────────────────────────────────
def build_optimized_prompt(url, context_chunks, content, images, video_saved_paths):
    """
    Builds the final optimized prompt for the AGentVLM K-12 web safety evaluator.

    Architecture decisions:
    ─────────────────────────────────────────────────────────────────────────────
    1. INVERTED ARCHITECTURE (fixes Cognitive Overload / Primacy bias)
       Data payload sits at the TOP of the prompt. The model reads the actual
       evidence before instructions, preventing policy rules from being forgotten
       by the time the model finishes reading 10,000 chars of scraped content.

    2. RECENCY EXPLOITATION (fixes Lost-in-the-Middle / U-Dip)
       The single most relevant FAISS chunk (context_chunks[0]) is repeated
       immediately before the JSON output block. No reorder_context_for_llm needed.

    3. CHAIN OF THOUGHT SERIALIZATION (fixes hallucination on Context Trap cases)
       Two mandatory reasoning fields must be completed BEFORE any categorical field.

    4. GRANULAR AGE + GRADE SCHEMA
       age_restriction        : exact "X+" string e.g. "6+" to "18+"
       recommended_grade_level: exact "Grade N" string e.g. "Grade 8"

    5. MULTI-REASON UNSUITABILITY ARRAY
       unsuitability_reasons is a list so multiple concurrent problems can be flagged.

    6. ACCESSIBILITY MATRIX (0-5 integer scale per disability, both ends inclusive)
       Five-key dict. Each value is an INTEGER 0-5 (0 and 5 are valid):
         0 = completely inaccessible for this disability
         1 = very poor accessibility
         2 = needs significant improvement
         3 = somewhat accessible
         4 = mostly accessible
         5 = fully accessible
       This replaces the old binary "Accessible" / "Not Accessible" string.
    """

    # ── Chunk splitting ───────────────────────────────────────────────────────
    if not context_chunks:
        bulk_context = "No policy context retrieved."
        anchor_chunk = "No policy context retrieved."
    elif len(context_chunks) == 1:
        bulk_context = context_chunks[0]
        anchor_chunk = context_chunks[0]
    else:
        bulk_context = "\n\n".join(context_chunks[1:])   # chunks 2, 3, … → top
        anchor_chunk = context_chunks[0]                  # chunk 1 → bottom anchor

    # ── Prompt assembly using .format() — NOT f-string — to avoid brace conflicts
    prompt = """--- SUPPORTING POLICY CONTEXT ---
\"\"\"{}\"\"\"

--- WEBPAGE CONTENT ---
\"\"\"{}\"\"\"

--- DETECTED IMAGES ---
\"\"\"{}\"\"\"

--- DETECTED VIDEOS ---
\"\"\"{}\"\"\"

--- TARGET URL ---
{}

================================================================================
You are an AI system specialized in K-12 educational web safety evaluation.

EVALUATION RULES:
- Evaluate THIS SPECIFIC PAGE only — not the general domain or website brand.
- Weight the actual retrieved webpage content above all other signals.
- Use the Supporting Policy Context above AND the anchor rule below to inform
  your age and grade thresholds.
- Do NOT output markdown. Return raw JSON only.
- Do NOT use "..." as placeholders. Generate actual text for every field.

CRITICAL AGE RESTRICTION BASELINES (Must be strictly applied):
- Unmoderated User-Generated Content (Forums/Social Media): Minimum age is "16+".
- Tabloid, Gossip, and Sensationalized Media: Minimum age is "16+".
- Simulated or Real Gambling/Betting: Minimum age is "18+" with zero exceptions.
- DO NOT escalate 16+ sites to 18+ unless they contain explicit gambling,
  illegal drugs, or adult pornography.
================================================================================

CLASSIFICATION SCHEMA — read every rule before writing the JSON:

category
  One of: Educational | Entertainment | News | Gaming | Social Media | Unsafe | Mixed | Other

age_restriction
  The MINIMUM age at which this page is appropriate.
  Must be one exact string from this list ONLY:
  "6+" | "7+" | "8+" | "9+" | "10+" | "11+" | "12+" | "13+" | "14+" | "15+" | "16+" | "17+" | "18+"

educational_genre
  One of: STEM | Language | History | Arts | Social Studies | Life Skills | Health | Other

suitability_for_school
  One of: Suitable | Unsuitable

recommended_grade_level
  If Suitable   → the SINGLE lowest grade at which this page is appropriate.
                  Must be one exact string like "Grade 1", "Grade 8", etc.
  If Unsuitable → null

unsuitability_reasons
  An ARRAY of zero or more strings.
  If Suitable   → []
  If Unsuitable → include ALL that apply:
    "Inappropriate Content" | "Unsafe or Malicious" | "Age-Inappropriate Language" |
    "Gambling or Betting" | "Drug or Substance References" | "Extremist or Hateful Content" |
    "Unmoderated User Content" | "Commercial or Non-Educational" | "Privacy Risk"

ai_generated
  One of: "AI Generated" | "Real"

accessibility_analysis
  A JSON object with EXACTLY these five keys:
    ADHD, Color_Blindness, Hearing_Impairment, Dyslexia, Autism

  Each value must be an INTEGER. 0 and 5 are both valid and inclusive.
  Full scale:
    0 = completely inaccessible (no accommodation whatsoever)
    1 = very poor accessibility (major barriers, almost unusable)
    2 = needs significant improvement (several barriers, partial support)
    3 = somewhat accessible (basic support, some gaps remain)
    4 = mostly accessible (minor gaps only)
    5 = fully accessible (all barriers addressed, best-practice implementation)

  Scoring guidance per disability:
    ADHD             : penalise flashing animations, cluttered ads, no reading mode,
                       infinite scroll, autoplay media
    Color_Blindness  : penalise color-coded information with no text alternative,
                       red/green contrast reliance, colored-only status indicators
    Hearing_Impairment: penalise video/audio with no captions or transcripts,
                        audio-only alerts
    Dyslexia         : penalise dense unformatted text blocks, serif-only fonts,
                       no text resize, low contrast
    Autism           : penalise chaotic layouts, unpredictable navigation,
                       disruptive autoplay, lack of content warnings

safe_alternatives
  If Unsuitable → array of 2-3 specific, working educational URLs.
  If Suitable   → []

timing_breakdown
  Estimate in seconds:
    content_understanding | topic_assessment | classification_decision |
    json_generation | total_estimated_time

================================================================================
--- MOST CRITICAL POLICY RULE (anchor) ---
\"\"\"{}\"\"\"
================================================================================

Return ONLY the JSON object below — no text before or after it, no markdown fences:

{{
  "url": "{}",
  "thought_process": "<REQUIRED — 1-sentence summary of decision>",
  "safety_and_suitability_analysis": "<REQUIRED — Why is it suitable or unsuitable?>",
  "curriculum_and_age_analysis": "<REQUIRED — Youngest age/grade rationale>",
  "category": "Fill this in",
  "age_restriction": "Fill this in",
  "educational_genre": "Fill this in",
  "suitability_for_school": "Fill this in",
  "recommended_grade_level": null,
  "unsuitability_reasons": [],
  "ai_generated": "Real",
  "accessibility_analysis": {{
    "ADHD": 3,
    "Color_Blindness": 3,
    "Hearing_Impairment": 3,
    "Dyslexia": 3,
    "Autism": 3
  }},
  "safe_alternatives": [],
  "timing_breakdown": {{
    "content_understanding": 0.5,
    "topic_assessment": 0.5,
    "classification_decision": 0.5,
    "json_generation": 0.5,
    "total_estimated_time": 2.0
  }}
}}
""".format(
        bulk_context,
        content,
        images,
        video_saved_paths,
        url,
        anchor_chunk,
        url
    )

    return prompt


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def manual_gemini_call(prompt_text, api_key=None):
    """
    Makes a direct HTTP call to the Gemini API.
    Uses v1beta with gemini-flash-latest model.
    """
    key = api_key or API_KEY

    if not key:
        print("\n⚠️  WARNING: API_KEY is missing.")
        print("   Set it in server.py or via GEMINI_API_KEY environment variable.\n")
        return "{}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={key}"
    headers = {'Content-Type': 'application/json'}

    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": 2048
        }
    }

    try:
        print(f"   Calling Gemini API v1beta (gemini-flash-latest)...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)

        if response.status_code != 200:
            print(f"\n🛑 API ERROR ({response.status_code}):")
            print(f"   {response.text}\n")

            if "API_KEY_INVALID" in response.text or "not found" in response.text.lower():
                print("   ❌ API Key is invalid, disabled, or doesn't exist.")
                print("   → Create a new key at: https://console.cloud.google.com/apis/credentials")
                print("   → Enable Generative Language API for this project")
                print("   → Set the key in your .env: GEMINI_API_KEY=your_key_here\n")

            return "{}"

        try:
            json_response = response.json()
            result = json_response['candidates'][0]['content']['parts'][0]['text']
            print(f"   ✅ Gemini API response received ({len(result)} chars)\n")
            return result
        except (KeyError, IndexError) as e:
            print(f"\n🛑 RESPONSE PARSE ERROR: {str(e)}")
            print(f"   Full response: {response.text}\n")
            return "{}"

    except requests.exceptions.Timeout:
        print(f"\n🛑 API TIMEOUT: Request took too long (>60s)\n")
        return "{}"
    except Exception as e:
        print(f"\n🛑 CONNECTION ERROR: {str(e)}\n")
        return "{}"


def fetch_page_text_safe(url):
    """Fetch and clean webpage text."""
    try:
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        return " ".join(soup.stripped_strings)[:10000]
    except Exception as e:
        return f"Scraping failed: {str(e)}"


async def fetch_images_for_llm(url):
    """Placeholder for image fetching."""
    return []


async def run_batch(urls):
    """Placeholder for video fetching."""
    return [{"url": urls[0], "found": []}]


def parse_json(text):
    """Parse JSON from text, handling markdown fences."""
    try:
        return json.loads(text)
    except:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        try:
            return json.loads(match.group(0)) if match else {}
        except:
            return {}


# ──────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.post("/analyze")
async def analyze_url(request: dict):
    """Main evaluation endpoint."""
    policy_file = "policy_output_agentvlm.txt"
    if not os.path.exists(policy_file):
        return {"classification": {"error": f"Policy file '{policy_file}' not found"}}

    with open(policy_file, "r", encoding="utf-8") as f:
        document_text = f.read()

    # Simple chunking (split into 3 chunks)
    chunks = [document_text[i:i+3000] for i in range(0, min(9000, len(document_text)), 3000)]

    url = request.get("url", "")
    print(f"\n🔎 Analyzing: {url}")

    content      = fetch_page_text_safe(url)
    images       = await fetch_images_for_llm(url)
    videos       = await run_batch([url])
    video_paths  = []

    prompt      = build_optimized_prompt(url, chunks, content, images, video_paths)
    result_text = manual_gemini_call(prompt)
    data        = parse_json(result_text)

    return {"classification": data}


# ──────────────────────────────────────────────────────────────────────────────
# RUN SERVER
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("  AGentVLM Server Starting...")
    print("=" * 80)
    print(f"\n  API Key Status: {'✅ LOADED' if API_KEY else '❌ MISSING'}")
    print(f"  Endpoint      : http://0.0.0.0:8000/analyze")
    print(f"  Policy file   : policy_output_agentvlm.txt")
    print("\n  To test:")
    print("    curl -X POST http://localhost:8000/analyze \\")
    print('      -H "Content-Type: application/json" \\')
    print('      -d \'{"url":"https://www.pbslearningmedia.org"}\'')
    print("\n" + "=" * 80 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)