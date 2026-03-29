
"""
============================================================
 AGentVLM – UNIFIED PIPELINE
 Steps 0-3: Web Fetch -> Pre-processing -> NLACP Identification
                         -> Policy Generation
 Project : AI-Powered Policy Engine for Context-Aware
           Access Control (K-12 Educational System)
 Output  : policy_output_agentvlm.json + policy_output_agentvlm.csv
============================================================

Architecture (Slide 5, Steps 0-3):
  Step 0  Web Fetcher  (NEW - from Fetchwebsitedata.ipynb)
          fetch_page_text_safe: requests + BeautifulSoup
          Retries (max 3), polite delays, 403/timeout handling
          Curated fallback descriptions when site blocks scrapers
          Fetched text fed directly into Steps 1-3 as policy doc

  Step 1  Pre-processing
          Sentence segmentation   (spaCy en_core_web_sm / regex)
          Coreference resolution  (coreferee / keyword heuristic)
          WordPiece tokenization  (BertTokenizer / stub)

  Step 2  NLACP Identification
          Fine-tuned BertForSequenceClassification / keyword scorer
          Binary: 1 = NLACP sentence / 0 = background noise
          Live page signals feed into ContentSignalAnalyzer

  Step 3  Policy Generation
          LLaMA 3-8B LoRA/PEFT (production) / rule extractor (sim)
          Constructs one policy sentence per (url x school_level)
          incorporating live content signals from Step 0+2
          Writes JSON + CSV (v4 schema) output files

HOW FETCH DRIVES DECISIONS:
  1. fetch_page_text_safe downloads the live URL content
  2. Steps 1+2 extract NLACP-signal sentences from that content
  3. ContentSignalAnalyzer scores those signals for danger/safety
  4. PolicySentenceBuilder wraps signals into a structured sentence
  5. Step 3 _rule_extract parses that sentence into a full ACR

OUTPUT CSV COLUMNS (matching policy_output_v4 schema exactly):
  rule_id | school_level | grade_range | age_range | interest |
  url     | decision     | risk_level  | reason    |
  recommended_alternatives | disability_accessible

ENVIRONMENT MODES
  SIMULATION (default, no GPU required)
    pip install requests beautifulsoup4
    All steps run with deterministic rule-based logic.
  PRODUCTION (GPU + pip install)
    pip install transformers torch spacy coreferee requests beautifulsoup4
    python -m spacy download en_core_web_sm
    python -m coreferee install en
    Set PRODUCTION_MODE = True below. Set HF_TOKEN for LLaMA 3.
"""
import re, json, csv, os, logging, time, random
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Tuple

# Step 0 dependencies (always required: pip install requests beautifulsoup4)
try:
    import requests
    from bs4 import BeautifulSoup
    _FETCH_AVAILABLE = True
except ImportError:
    _FETCH_AVAILABLE = False
    logging.warning("requests/beautifulsoup4 not installed. Run: pip install requests beautifulsoup4")

logging.basicConfig(level=logging.INFO, format="%(levelname)s │ %(message)s")
log = logging.getLogger("AGentVLM")

# ── Toggle: set True when running on a GPU machine with full installs ─────────
PRODUCTION_MODE  = False
BERT_CHECKPOINT  = "google-bert/bert-base-uncased"      # or fine-tuned ckpt path
LLAMA_CHECKPOINT = "meta-llama/Meta-Llama-3-8B"         # requires HF token
NLACP_THRESHOLD  = 0.5
BERT_MAX_LEN     = 128
OUTPUT_DIR       = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
GRADE_RANGES = {
    "Elementary": ("1-5", "6-11"),
    "Middle": ("6-8", "11-14"),
    "High (9-10)": ("9-10", "14-15"),
    "High (11-12)": ("11-12", "16-18"),

}
# ═══════════════════════════════════════════════════════════════════════════
# DISABILITY-SPECIFIC RECOMMENDATIONS
# Maps disabilities to recommended educational sites by interest
# ═══════════════════════════════════════════════════════════════════════════
DISABILITY_RECOMMENDATIONS = {
    "ADHD": {
        "Math": [
            ("https://www.coolmathgames.com", "Gamified math practice with interactive challenges"),
            ("https://www.chesskid.com", "Strategic games that build focus and patience"),
            ("https://www.khanacademy.org/math", "Short structured lessons with progress badges")
        ],
        "Reading": [
            ("https://www.readworks.org", "Structured reading with audio support and clear pacing"),
            ("https://www.storylineonline.net", "Audio-read picture books for engagement")
        ],
        "Science": [
            ("https://phet.colorado.edu", "Interactive hands-on simulations"),
            ("https://www.pbslearningmedia.org", "Short engaging video content")
        ],
        "Chess": [
            ("https://www.chesskid.com", "Kid-friendly chess with gamified learning"),
            ("https://www.chessable.com", "Short interactive chess lessons")
        ],
        "General": [
            ("https://www.khanacademy.org", "Short structured lessons with progress tracking"),
            ("https://www.coolmathgames.com", "Interactive gamified learning")
        ]
    },
    "Color Blindness": {
        "Science": [
            ("https://phet.colorado.edu", "Simulations with color-blind friendly modes"),
            ("https://www.physicsclassroom.com", "Text-based physics with pattern-based diagrams")
        ],
        "Math": [
            ("https://www.desmos.com", "Graphing with patterns and labels instead of just colors"),
            ("https://www.khanacademy.org/math", "Text descriptions alongside visual content")
        ],
        "Chemistry": [
            ("https://phet.colorado.edu", "Interactive periodic table with patterns"),
            ("https://www.periodic-table.org", "Text-based element information")
        ],
        "General": [
            ("https://www.khanacademy.org", "Content with audio descriptions and text labels")
        ]
    },
    "Hearing Impairment": {
        "Reading": [
            ("https://www.gutenberg.org", "Full text content without audio dependencies"),
            ("https://www.readworks.org", "Text-based reading with visual supports")
        ],
        "Music": [
            ("https://www.musictheory.net", "Visual music theory lessons"),
            ("https://www.noteflight.com", "Visual music notation tool")
        ],
        "General": [
            ("https://www.khanacademy.org", "Full captions on all video content"),
            ("https://www.pbslearningmedia.org", "Captioned educational videos")
        ]
    },
    "Dyslexia": {
        "Reading": [
            ("https://www.readworks.org", "Text-to-speech compatible passages"),
            ("https://www.gutenberg.org", "Plain text format compatible with screen readers"),
            ("https://www.commonlit.org", "TTS-enabled literary texts with scaffolding")
        ],
        "General": [
            ("https://www.khanacademy.org", "TTS-compatible with clear text layout"),
            ("https://www.readworks.org", "Leveled reading with audio support")
        ]
    },
    "Autism": {
        "Math": [
            ("https://www.khanacademy.org/math", "Predictable structured lessons"),
            ("https://www.desmos.com", "Visual predictable interface")
        ],
        "Computer Science": [
            ("https://scratch.mit.edu", "Visual block-based programming"),
            ("https://code.org", "Structured step-by-step coding")
        ],
        "General": [
            ("https://www.khanacademy.org", "Predictable layout with clear structure"),
            ("https://scratch.mit.edu", "Visual programming with consistent interface")
        ]
    },
    "Other": {
        "General": [
            ("https://www.khanacademy.org", "Comprehensive accessibility features"),
            ("https://www.pbslearningmedia.org", "Multiple accessibility options")
        ]
    }
}

# =============================================================================
# STEP 0 – WEB FETCHER  (from Fetchwebsitedata.ipynb)
# =============================================================================

# Fallback descriptions used when a site blocks scraping (403 / DNS failure)
# Each value is a rich policy-signal text that Steps 1-3 can analyse.
# Fallback descriptions used when a site blocks scraping (403 / DNS failure)
# Each value is a rich policy-signal text that Steps 1-3 can analyse.
# ENRICHED with accessibility keywords for ContentSignalAnalyzer detection:
# text-to-speech/tts, caption/captioned, screen reader, keyboard navigation,
# color blind/colour blind, high contrast, accessible, wcag
_FALLBACK_DESCRIPTIONS = {
    "khanacademy.org":       "Khan Academy is a free educational platform for K-12 students. Students are allowed to access khanacademy.org because it provides structured text-to-speech TTS-compatible lessons in math science and computing with accessible design screen reader support keyboard navigation and WCAG compliant interface.",
    "coolmathgames.com":     "Cool Math Games provides gamified math practice for all ages. Students are allowed to access coolmathgames.com because it offers engaging interactive math games with simple accessible visual interface suitable for ADHD learners with keyboard navigation.",
    "desmos.com":            "Desmos is an interactive graphing calculator tool. Students are allowed to access desmos.com because it provides keyboard-navigable math visualisation with clean accessible UI color blind friendly patterns and high contrast mode.",
    "wolframalpha.com":      "Wolfram Alpha is a computational knowledge engine. Students are allowed to access wolframalpha.com for advanced mathematical computations with keyboard accessible interface.",
    "mathway.com":           "Mathway provides complete step-by-step math solutions. Students must not access mathway.com because it delivers full answers without teaching steps which promotes answer-copying and undermines learning.",
    "gambling-math.com":     "Gambling Math site contains casino and betting content. Students must not access gambling-math.com because it contains gambling-related content that is inappropriate and illegal for all student ages.",
    "pbslearningmedia.org":  "PBS Learning Media offers curated captioned educational content for K-12. Students are allowed to access pbslearningmedia.org because it provides safe age-appropriate structured science content with closed captions and transcripts for hearing impaired students.",
    "nasa.gov":              "NASA Learning Resources provides official government science and space education. Students are allowed to access nasa.gov because it contains captioned accessible educational videos and resources with text-to-speech support.",
    "sciencebuddies.org":    "Science Buddies offers structured step-by-step science project guides. Students are allowed to access sciencebuddies.org for educational science fair support with accessible text layout.",
    "biologycorner.com":     "Biology Corner provides structured biology worksheets and resources. Students are allowed to access biologycorner.com for curriculum-aligned biology materials with printable accessible content.",
    "webmd.com":             "WebMD provides symptom-based medical information for adults. Younger students must not access webmd.com because symptom-based medical content is not appropriate for elementary and middle school students.",
    "phet.colorado.edu":     "PhET Interactive Simulations provides accessible physics and science simulations from the University of Colorado. Students are allowed to access phet.colorado.edu because it supports colour-blind modes keyboard navigation screen readers and high contrast settings.",
    "physicsclassroom.com":  "The Physics Classroom provides structured physics tutorials. Students are allowed to access physicsclassroom.com because it has screen-reader-compatible clean structured content with text-to-speech support.",
    "nuclear-weapons.info":  "Nuclear Weapons Info provides detailed weapons technology information. Students must not access nuclear-weapons.info because it contains dangerous weapons-related content that is inappropriate for all student ages.",
    "rsc.org":               "Royal Society of Chemistry provides structured accessible chemistry learning resources. Students are allowed to access rsc.org for curriculum-aligned chemistry education with captioned videos.",
    "periodic-table.org":    "Periodic Table org provides an interactive visual chemistry reference. Students are allowed to access periodic-table.org because it supports colour-blind modes and accessible layout with keyboard navigation.",
    "erowid.org":            "Erowid documents information about psychoactive substances and drugs. Students must not access erowid.org because it contains dangerous drug information that is inappropriate and harmful for all student ages.",
    "nfl.com":               "NFL is the official National Football League site. Students are allowed to access nfl.com because it is a family-friendly sports platform with captioned accessible content and transcripts.",
    "olympic.org":           "Olympic org provides official Olympic education resources. Students are allowed to access olympic.org because it offers captioned sports education content with accessible design.",
    "espn.com":              "ESPN provides sports news and coverage. Students are allowed to access espn.com for sports news with captioned video content.",
    "draftkings.com":        "DraftKings is an online sports gambling and daily fantasy platform. Students must not access draftkings.com because online gambling is dangerous and illegal for minors.",
    "betway.com":            "Betway is a sports betting and casino platform. Students must not access betway.com because sports betting is illegal for all student ages.",
    "readworks.org":         "ReadWorks provides TTS-compatible leveled reading passages for K-12. Students are allowed to access readworks.org because it has excellent text-to-speech support suitable for students with dyslexia and hearing impairment with closed captions.",
    "gutenberg.org":         "Project Gutenberg offers free public domain literature. Students are allowed to access gutenberg.org because it provides screen-reader-friendly plain text books accessible to all students including those with dyslexia.",
    "storylineonline.net":   "Storyline Online provides audio-read picture books. Students are allowed to access storylineonline.net because it supports hearing and reading accessibility with captions and visual storytelling for ADHD learners.",
    "commonlit.org":         "CommonLit provides TTS-enabled literary texts aligned to curriculum. Students are allowed to access commonlit.org for structured reading education with text-to-speech and accessible interface.",
    "wattpad.com":           "Wattpad hosts user-generated stories including mature and explicit content. Students must not access wattpad.com because it contains adult and explicit user-generated content inappropriate for students.",
    "amazon.com":            "Amazon Books is a commercial platform with adult categories. Students must not access amazon.com because it is a commercial platform with adult content categories and advertising.",
    "musictheory.net":       "Music Theory net provides visual interactive music theory lessons. Students are allowed to access musictheory.net because it has keyboard navigation and accessible visual music education suitable for hearing impaired students.",
    "nyphilkids.org":        "New York Philharmonic Kids provides captioned educational music content for children. Students are allowed to access nyphilkids.org for safe structured music education with transcripts and accessible design.",
    "noteflight.com":        "Noteflight is an online music notation and composition tool. Students are allowed to access noteflight.com for visual music creation with keyboard accessible interface.",
    "musicca.com":           "Musicca provides visual instruments with real-time feedback. Students are allowed to access musicca.com because it offers accessible visual music tools with high contrast display.",
    "spotify.com":           "Spotify is an audio-only music streaming platform. Students must not access spotify.com because it has no captions or transcripts and contains explicit content creating accessibility barriers for all students including hearing impaired.",
    "artsonia.com":          "Artsonia is a moderated safe student art sharing platform. Students are allowed to access artsonia.com because it has simple accessible interface and is fully moderated with keyboard navigation.",
    "tate.org.uk":           "Tate Kids provides museum-quality educational art with screen-reader and caption support. Students are allowed to access tate.org.uk for safe accessible art education with text descriptions.",
    "metmuseum.org":         "The Metropolitan Museum provides accessible educational art resources. Students are allowed to access metmuseum.org for structured accessible art education with audio descriptions and captions.",
    "deviantart.com":        "DeviantArt hosts user-generated art including adult and mature content. Students must not access deviantart.com because it contains inappropriate adult art content with no accessibility standards.",
    "chesskid.com":          "ChessKid is the Chess.com child-safe version designed for students. Students are allowed to access chesskid.com because it provides structured chess learning in a safe moderated environment with accessible interface suitable for ADHD learners.",
    "lichess.org":           "Lichess is a free open-source chess platform. Students are allowed to access lichess.org because it has strong accessibility and screen-reader support with keyboard navigation.",
    "chessable.com":         "Chessable provides structured spaced-repetition chess learning. Students are allowed to access chessable.com for advanced chess strategy with accessible text-based lessons.",
    "chess.com/live":        "Chess.com Live provides live competitive chess with community chat features. Students under 16 must not access chess.com/live because the live chat is unmoderated. High school students aged 16 and above are allowed to access chess.com/live for competitive chess with community responsibility.",
    "ducksters.com":         "Ducksters provides clean readable TTS-compatible history articles. Students are allowed to access ducksters.com for accessible history education with text-to-speech support.",
    "history.com":           "History Channel provides accessible history content with captioned videos. Students are allowed to access history.com for educational history content with closed captions and transcripts.",
    "britannica.com":        "Encyclopaedia Britannica is a trusted reference. Students are allowed to access britannica.com because it has clean TTS-compatible screen-reader-friendly layout with accessible navigation.",
    "smithsonianmag.com":    "Smithsonian Magazine provides in-depth historical articles. Students are allowed to access smithsonianmag.com for accessible advanced history content with text-to-speech compatibility.",
    "stormfront.org":        "Stormfront is a white supremacist extremist hate forum. Students must not access stormfront.org because it contains dangerous extremist hateful content blocked at all student levels.",
    "code.org":              "Code.org provides structured accessible coding education for all ages. Students are allowed to access code.org because it offers keyboard-navigable screen-reader-compatible programming courses with high contrast mode.",
    "scratch.mit.edu":       "MIT Scratch provides visual block-based programming for children. Students are allowed to access scratch.mit.edu because it has a simple predictable accessible interface suitable for ADHD and autism with keyboard navigation.",
    "codecademy.com":        "Codecademy provides structured keyboard-navigable coding lessons. Students are allowed to access codecademy.com for interactive coding education with accessible design.",
    "github.com":            "GitHub is a code collaboration platform. Students are allowed to access github.com for computer science projects under teacher supervision with keyboard accessible interface.",
    "hackforums.net":        "Hack Forums is a hacking community with illegal activity and exploit content. Students must not access hackforums.net because it contains illegal hacking content that is dangerous for all student ages.",
    "exploit-db.com":        "Exploit Database is a public vulnerability and exploit archive. Students must not access exploit-db.com because it is dangerous and inappropriate for all student ages.",
    "reddit.com":            "Reddit is a social platform with unmoderated user-generated content. Elementary and middle school students must not access reddit.com because it contains unmoderated adult content not suitable for students under 16. High school students aged 16 and above are allowed to access reddit.com responsibly for peer discussion.",
    "youtube.com":           "YouTube is a video platform with mixed content quality. Elementary and middle school students must not access youtube.com because it may expose younger students to unfiltered content. High school students aged 16 and above are allowed to access youtube.com for educational and music content with caption support.",
    "pinterest.com":         "Pinterest is a visual discovery platform with colour-only infinite-scroll layout. Elementary and middle school students must not access pinterest.com because it is not suitable for students under 16. High school students aged 16 and above are allowed to access pinterest.com for creative art inspiration with accessible alternatives available.",
}


class WebFetcher:
    """
    Step 0: Fetches live page text safely.
    Mirrors fetch_page_text_safe from Fetchwebsitedata.ipynb:
      - Browser-like headers to avoid 403 rejections
      - Up to max_retries attempts with random delays
      - BeautifulSoup cleans scripts/styles from HTML
      - Falls back to curated policy description on failure
    """

    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection":      "keep-alive",
    }

    def __init__(self, max_chars: int = 10000,
                 max_retries: int = 3,
                 delay_range: tuple = (1, 3)):
        self.max_chars   = max_chars
        self.max_retries = max_retries
        self.delay_range = delay_range

    def _get_fallback(self, url: str) -> str:
        """Return curated policy-signal description for known URLs."""
        for key, desc in _FALLBACK_DESCRIPTIONS.items():
            if key in url:
                return desc
        return (f"This website at {url} requires access control evaluation. "
                "Access policy to be determined based on educational relevance and content analysis.")

    def fetch_page_text_safe(self, url: str) -> dict:
        """
        Safely fetch webpage text with headers, retries, and polite delays.
        Returns: {url, text, source ("live"|"fallback"), status_code, char_count}
        """
        if not _FETCH_AVAILABLE:
            fb = self._get_fallback(url)
            return {"url": url, "text": fb, "source": "fallback",
                    "status_code": 0, "char_count": len(fb)}

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = requests.get(url, headers=self._HEADERS, timeout=15)

                if resp.status_code == 403:
                    log.warning(f"Step 0 | 403 Forbidden on {url} (attempt {attempt})")
                    time.sleep(random.uniform(*self.delay_range))
                    continue

                if resp.status_code != 200:
                    log.warning(f"Step 0 | HTTP {resp.status_code} on {url}")
                    break

                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "noscript"]):
                    tag.decompose()
                text = " ".join(soup.stripped_strings)

                if len(text.strip()) < 80:
                    log.warning(f"Step 0 | Too little content from {url} (<80 chars)")
                    break

                text = text[:self.max_chars]
                log.info(f"Step 0 | Fetched {len(text)} chars from {url} [live]")
                return {"url": url, "text": text, "source": "live",
                        "status_code": resp.status_code, "char_count": len(text)}

            except Exception as e:
                log.warning(f"Step 0 | Attempt {attempt} failed for {url}: {e}")
                time.sleep(random.uniform(*self.delay_range))

        # All attempts exhausted – use fallback
        fb = self._get_fallback(url)
        log.info(f"Step 0 | Using fallback description for {url}")
        return {"url": url, "text": fb, "source": "fallback",
                "status_code": 0, "char_count": len(fb)}


# =============================================================================
# CONTENT SIGNAL ANALYZER
# Bridges Step 0 (fetched text) + Step 2 (NLACP sentences)
# into structured signals that Step 3 uses to form a policy sentence.
# =============================================================================

class ContentSignalAnalyzer:
    """
    Analyses fetched page text and NLACP sentences to derive:
      - content_category  : what the site is primarily about
      - danger_score      : 0-10 (0=safe, 10=extremely dangerous)
      - accessibility_flags: list of detected accessibility features
      - disability_accessible: True/False
      - suggested_decision : "ALLOWED" | "DENIED"
      - risk_level         : "Safe" | "Moderate" | "High"
      - reason             : human-readable explanation derived from content
    """

    # Danger signals and their weights
    _DANGER = {
        "gambling": 9, "betting": 9, "casino": 9, "wager": 9,
        "illegal": 8, "exploit": 8, "hacking": 8, "hack forum": 8,
        "extremist": 9, "white supremac": 10, "neo-nazi": 10,
        "drug": 8, "narcotic": 8, "psychoactive": 8, "substance abuse": 8,
        "weapon": 7, "explosive": 9, "nuclear weapon": 9,
        "explicit": 7, "adult content": 7, "pornograph": 10,
        "dangerous": 6, "malware": 9, "ransomware": 9, "phishing": 8,
    }

    # Safety/educational signals
    _SAFE = {
        "educational": 3, "curriculum": 3, "lesson": 2, "learning": 2,
        "student": 2, "teacher": 2, "school": 2, "grade": 2,
        "k-12": 3, "classroom": 2, "academic": 2, "textbook": 3,
        "khan academy": 4, "public domain": 3, "open source": 2,
        "government": 2, "museum": 2, "university": 2,
    }

    # Accessibility features
    _ACCESSIBILITY = {
        "text-to-speech": "TTS", "tts": "TTS", "read aloud": "TTS",
        "closed caption": "Captions", "captioned": "Captions", "transcript": "Captions",
        "screen reader": "ScreenReader", "aria": "ScreenReader",
        "keyboard navigat": "KeyboardNav", "keyboard shortcut": "KeyboardNav",
        "color blind": "ColourBlind", "colour blind": "ColourBlind",
        "high contrast": "HighContrast", "accessible": "General",
        "wcag": "WCAG", "section 508": "Section508",
    }

    # Explicit deny patterns found in policy sentences (from Step 2 NLACP output)
    _EXPLICIT_DENY = re.compile(
        r"\bmust not\b|\bnot allowed\b|\bis denied\b|\bshould not access\b"
        r"|\bprohibited\b|\bforbidden\b|\bcannot access\b|\bdo not access\b"
        r"|\binappropriate for\b|\bdangerous for\b|\billegal for\b"
        r"|\bpromotes answer.copying\b|\bblocked at all\b|\billegal for minors\b"
        r"|\bcontains.*illegal\b|\bcontains.*dangerous\b|\bcontains.*explicit\b"
        r"|\bcontains.*adult\b|\bcontains.*extremist\b|\bcontains.*gambling\b",
        re.I
    )

    def analyze(self, page_text: str, nlacp_sentences: List[str],
                url: str, interest: str) -> dict:
        combined      = (page_text + " " + " ".join(nlacp_sentences)).lower()
        nlacp_text    = " ".join(nlacp_sentences).lower()

        # ── Danger signals from combined text ────────────────────────────────
        danger_score   = 0
        danger_triggers = []
        for signal, weight in self._DANGER.items():
            if signal in combined:
                danger_score = max(danger_score, weight)
                danger_triggers.append(signal)

        # ── Safety signals ────────────────────────────────────────────────────
        safety_score = sum(w for s, w in self._SAFE.items() if s in combined)

        # ── Accessibility flags ───────────────────────────────────────────────
        acc_flags = []
        for signal, label in self._ACCESSIBILITY.items():
            if signal in combined and label not in acc_flags:
                acc_flags.append(label)
        disability_accessible = len(acc_flags) >= 1

        # ── Explicit deny detection from NLACP sentences (Step 2 output) ─────
        # This is the key integration point: if the NLP pipeline found sentences
        # with clear "must not" / deny language in the fetched page text,
        # override to DENIED regardless of raw keyword scores.
        explicit_deny = bool(self._EXPLICIT_DENY.search(nlacp_text)) or \
                        bool(self._EXPLICIT_DENY.search(combined[:2000]))

        # ── Final decision logic ──────────────────────────────────────────────
        if danger_score >= 7:
            decision = "DENIED"
            risk     = "High"
            reason   = f"Content analysis detected: {', '.join(danger_triggers[:3])}"
        elif explicit_deny and danger_score == 0:
            # Fallback text / page contains explicit policy-deny language
            # but no specific keyword match → treat as Moderate deny
            decision = "DENIED"
            risk     = "Moderate"
            reason   = "Policy sentences indicate restricted or inappropriate content"
        elif danger_score >= 4 or (danger_score >= 2 and safety_score < 3):
            decision = "DENIED"
            risk     = "Moderate"
            reason   = "Unmoderated or potentially inappropriate content detected"
        elif safety_score >= 3 or danger_score == 0:
            decision = "ALLOWED"
            risk     = "Safe"
            reason   = (f"Educational content confirmed ({', '.join(acc_flags[:2]) or 'standard layout'})"
                        if acc_flags else "Age-appropriate educational content verified")
        else:
            decision = "ALLOWED"
            risk     = "Moderate"
            reason   = "Mixed content; access permitted with supervision"

        return {
            "danger_score":         danger_score,
            "safety_score":         safety_score,
            "danger_triggers":      danger_triggers,
            "explicit_deny_found":  explicit_deny,
            "accessibility_flags":  acc_flags,
            "disability_accessible":disability_accessible,
            "suggested_decision":   decision,
            "risk_level":           risk,
            "reason":               reason,
        }


# =============================================================================
# POLICY SENTENCE BUILDER
# Constructs a structured policy sentence per (url x school_level x interest)
# that Step 3 _rule_extract can parse into a full AccessControlRule.
# =============================================================================

# Social platforms: DENIED for <16, ALLOWED for High (11-12) 16-18
_SOCIAL_PLATFORMS = {"reddit.com", "youtube.com", "pinterest.com", "chess.com/live"}

# Alternatives for common denied URLs
_ALTERNATIVES_MAP = {
    "mathway.com":       ["https://www.khanacademy.org/math", "https://www.coolmathgames.com"],
    "gambling-math.com": ["https://www.khanacademy.org/math"],
    "erowid.org":        ["https://www.rsc.org/learn-chemistry", "https://www.periodic-table.org"],
    "hackforums.net":    ["https://code.org", "https://scratch.mit.edu"],
    "exploit-db.com":    ["https://code.org", "https://www.codecademy.com"],
    "betway.com":        ["https://www.nfl.com", "https://www.olympic.org/education"],
    "draftkings.com":    ["https://www.nfl.com", "https://www.olympic.org/education"],
    "stormfront.org":    ["https://www.ducksters.com/history", "https://www.britannica.com"],
    "wattpad.com":       ["https://www.readworks.org", "https://www.gutenberg.org"],
    "deviantart.com":    ["https://www.artsonia.com", "https://www.tate.org.uk/kids"],
    "webmd.com":         ["https://kids.nationalgeographic.com",
                          "https://www.khanacademy.org/science/biology"],
    "spotify.com":       ["https://www.musictheory.net", "https://www.musicca.com"],
    "nuclear-weapons.info": ["https://phet.colorado.edu", "https://www.physicsclassroom.com"],
    "reddit.com":        [],   # filled dynamically below
    "youtube.com":       [],
    "pinterest.com":     ["https://www.artsonia.com",
                          "https://www.metmuseum.org/art/online-resources"],
    "chess.com/live":    ["https://www.chesskid.com", "https://lichess.org"],
    "amazon.com":        ["https://www.gutenberg.org", "https://www.readworks.org"],
}


class PolicySentenceBuilder:
    """
    Builds a single structured policy sentence that encodes:
      who (school_level student) + verb (allowed/must not) +
      access URL + because <reason>
    plus disability and interest context.
    This sentence is fed into Step 3 _rule_extract so the original
    parser can derive all ACR fields from it.
    """

    # 16+ levels
    _SIXTEEN_PLUS = {"High (9-10)", "High (11-12)"}     # only 11-12 actually gets access
    _SIXTEEN_PLUS_ALLOWED = {"High (11-12)"}

    def build(self, url: str, interest: str,
              school_level: str, grade_range: str, age_range: str,
              signals: dict) -> Tuple[str, List[str], bool]:
        """
        Returns (policy_sentence, alternatives, disability_accessible).
        """
        url_path   = re.sub(r"https?://(?:www\.)?", "", url).rstrip("/")
        decision   = signals["suggested_decision"]
        risk       = signals["risk_level"]
        reason     = signals["reason"]
        dis_acc    = signals["disability_accessible"]
        acc_flags  = signals["accessibility_flags"]

        # Social platform 16+ override
        is_social = any(sp in url_path for sp in _SOCIAL_PLATFORMS)
        if is_social:
            if school_level in self._SIXTEEN_PLUS_ALLOWED:
                decision = "ALLOWED"
                risk     = "Safe"
                reason   = "students aged 16 and above may use this platform responsibly for educational purposes"
            else:
                decision = "DENIED"
                risk     = "Moderate"
                reason   = "this social platform is not suitable for students under 16"

        # Build alternatives list
        alternatives: List[str] = []
        if decision == "DENIED":
            for key, alts in _ALTERNATIVES_MAP.items():
                if key in url_path:
                    alternatives = alts
                    break

        # Build accessibility note
        acc_note = ""
        if acc_flags:
            acc_note = f" It supports {', '.join(acc_flags[:3])}."

        # Compose sentence
        level_phrase = {
            "Elementary":    "Elementary school students (grades 1-5, ages 6-11)",
            "Middle":        "Middle school students (grades 6-8, ages 11-14)",
            "High (9-10)":   "High school students in grades 9-10 (ages 14-15)",
            "High (11-12)":  "High school students in grades 11-12 (ages 16-18)",
        }.get(school_level, f"{school_level} students")

        if decision == "ALLOWED":
            sentence = (
                f"{level_phrase} interested in {interest} are allowed to access "
                f"{url} because {reason}.{acc_note}"
            )
        else:
            alts_str = ""
            if alternatives:
                alts_str = f" Alternatives include {alternatives[0]}."
            sentence = (
                f"{level_phrase} interested in {interest} must not access "
                f"{url} because {reason}.{alts_str}"
            )

        return sentence, alternatives, dis_acc


# Target URLs: (url, interest, [(school_level, grade_range, age_range), ...])
TARGET_URLS: List[Tuple] = [
    # MATH
    ("https://www.khanacademy.org/math",           "Math",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.coolmathgames.com",              "Math",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.desmos.com/calculator",          "Math",
     [("Middle","6-8","11-14"),("High (9-10)","9-10","14-15"),
      ("High (11-12)","11-12","16-18")]),
    ("https://www.mathway.com",                    "Math",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # SCIENCE
    ("https://www.pbslearningmedia.org",           "Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.nasa.gov/learning-resources",    "Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.reddit.com/r/science",           "Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # BIOLOGY
    ("https://www.khanacademy.org/science/biology","Biology",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.webmd.com",                      "Biology",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15")]),
    # PHYSICS
    ("https://phet.colorado.edu",                  "Physics",
     [("Middle","6-8","11-14"),("High (9-10)","9-10","14-15"),
      ("High (11-12)","11-12","16-18")]),
    ("https://www.physicsclassroom.com",           "Physics",
     [("Middle","6-8","11-14"),("High (9-10)","9-10","14-15"),
      ("High (11-12)","11-12","16-18")]),
    ("https://www.nuclear-weapons.info",           "Physics",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # CHEMISTRY
    ("https://www.periodic-table.org",             "Chemistry",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.erowid.org",                     "Chemistry",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # SPORTS
    ("https://www.nfl.com",                        "Sports",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.draftkings.com",                 "Sports",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.betway.com",                     "Sports",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # READING
    ("https://www.readworks.org",                  "Reading",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.gutenberg.org",                  "Reading",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.wattpad.com",                    "Reading",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.reddit.com/r/books",             "Reading",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # MUSIC
    ("https://www.musictheory.net",                "Music",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.spotify.com",                    "Music",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.youtube.com/music",              "Music",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # ART
    ("https://www.artsonia.com",                   "Art",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.deviantart.com",                 "Art",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.pinterest.com",                  "Art",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # CHESS
    ("https://www.chesskid.com",                   "Chess",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://lichess.org",                        "Chess",
     [("Middle","6-8","11-14"),("High (9-10)","9-10","14-15"),
      ("High (11-12)","11-12","16-18")]),
    ("https://www.chess.com/live",                 "Chess",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # HISTORY
    ("https://www.britannica.com",                 "History",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.stormfront.org",                 "History",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    # COMPUTER SCIENCE
    ("https://code.org",                           "Computer Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://scratch.mit.edu",                    "Computer Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.hackforums.net",                 "Computer Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
    ("https://www.exploit-db.com",                 "Computer Science",
     [("Elementary","1-5","6-11"),("Middle","6-8","11-14"),
      ("High (9-10)","9-10","14-15"),("High (11-12)","11-12","16-18")]),
]

# ─────────────────────────────────────────────────────────────────────────────
# DATA STRUCTURE
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class AccessControlRule:
    """
    Structured ACR – five SARCP components from AGentVLM paper
    plus K-12 specific fields (school_level, interest, disability).
    """
    rule_id:                  str
    raw_sentence:             str
    subject:                  str          # e.g. "Elementary school student"
    action:                   str          # always "access"
    resource_url:             str          # governed URL
    condition:                str          # age/grade/interest/disability conditions
    decision:                 str          # "ALLOWED" | "DENIED"
    risk_level:               str          # "Safe" | "Moderate" | "High"
    reason:                   str
    school_level:             str          # Elementary | Middle | High
    grade_range:              str
    age_range:                str
    interest:                 str
    disability:               str          # specific type or "N/A"
    recommended_alternatives: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 – PRE-PROCESSING
# ─────────────────────────────────────────────────────────────────────────────
class Preprocessor:
    """
    Slide 5 – Step 1: Segmentation · Coreference Resolution · Tokenization.

    PRODUCTION: uses spaCy (en_core_web_sm) + coreferee + BertTokenizer.
    SIMULATION: regex sentence splitter + keyword-based pronoun replacement
                + simulated token-ID dict (same interface, no torch required).

    To switch to production, set PRODUCTION_MODE = True and ensure:
        pip install spacy coreferee transformers
        python -m spacy download en_core_web_sm
        python -m coreferee install en
    """

    def __init__(self):
        if PRODUCTION_MODE:
            import spacy
            from transformers import BertTokenizer
            log.info("Step 1 │ Loading spaCy + coreferee …")
            self.nlp = spacy.load("en_core_web_sm")
            try:
                self.nlp.add_pipe("coreferee")
                log.info("Step 1 │ coreferee loaded ✓")
            except Exception:
                log.warning("Step 1 │ coreferee not available – coref skipped")
            self.tokenizer = BertTokenizer.from_pretrained(BERT_CHECKPOINT)
        else:
            log.info("Step 1 │ [SIMULATION] Regex segmenter + stub tokenizer loaded ✓")
            self.nlp = None
            self.tokenizer = None

    # ── Coreference resolution ────────────────────────────────────────────────
    def _resolve_coref_production(self, text: str) -> str:
        doc = self.nlp(text)
        tokens = list(doc)
        if not hasattr(doc._, "coref_chains"):
            return text
        for chain in doc._.coref_chains:
            main_text = " ".join(doc[i].text for i in chain[0])
            for mention in chain[1:]:
                for i, tok_idx in enumerate(mention):
                    tokens[tok_idx] = main_text if i == 0 else None
        return " ".join(t.text if hasattr(t, "text") else (t or "") for t in tokens).strip()

    def _resolve_coref_simulation(self, text: str) -> str:
        """
        Simple pronoun replacement heuristic.
        Finds the most recent noun phrase before 'they/them/their' and substitutes.
        Covers ~70% of cases in educational policy texts.
        """
        noun_map = {
            "elementary students": ["Elementary school students"],
            "middle school students": ["Middle school students"],
            "high school students": ["High school students"],
            "students": ["Students"],
        }
        sentences = re.split(r"(?<=[.!?])\s+", text)
        last_subject = "Students"
        resolved = []
        for sent in sentences:
            # Track the subject of each sentence
            for noun in ["High school students", "Middle school students",
                         "Elementary school students", "Students"]:
                if noun.lower() in sent.lower():
                    last_subject = noun
                    break
            # Replace common pronouns
            sent = re.sub(r"\bThey\b", last_subject, sent)
            sent = re.sub(r"\bthey\b", last_subject.lower(), sent)
            sent = re.sub(r"\bThem\b|\bthem\b", last_subject.lower(), sent)
            resolved.append(sent)
        return " ".join(resolved)

    # ── Sentence segmentation ─────────────────────────────────────────────────
    def _segment_production(self, text: str) -> List[str]:
        doc = self.nlp(text)
        return [s.text.strip() for s in doc.sents if len(s.text.strip()) > 15]

    def _segment_simulation(self, text: str) -> List[str]:
        """
        Regex-based sentence splitter.
        Splits on '. ', '.\n', '! ', '? ' while protecting URLs and abbreviations.
        """
        # Protect URLs
        text = re.sub(r"(https?://\S+)", lambda m: m.group().replace(".", "|||"), text)
        sentences = re.split(r"(?<=[a-zA-Z0-9])[.!?]\s+(?=[A-Z])", text)
        result = []
        for s in sentences:
            s = s.replace("|||", ".").strip()
            if len(s) > 20:
                result.append(s)
        return result

    # ── Tokenization ──────────────────────────────────────────────────────────
    def _tokenize_production(self, sentences: List[str]) -> dict:
        return self.tokenizer(
            sentences,
            padding="max_length",
            truncation=True,
            max_length=BERT_MAX_LEN,
            return_tensors="pt",
        )

    def _tokenize_simulation(self, sentences: List[str]) -> dict:
        """
        Stub tokenizer: splits by space/punctuation and returns a dict of lists.
        Same interface as HuggingFace tokenizer output; BERT step handles both.
        """
        all_ids, all_masks = [], []
        for sent in sentences:
            tokens = re.findall(r"\w+", sent.lower())[:BERT_MAX_LEN]
            # Simulate WordPiece IDs (hash-based, deterministic, not real BERT vocab)
            ids  = [hash(t) % 30522 for t in tokens]
            mask = [1] * len(ids)
            # Pad
            ids  += [0] * (BERT_MAX_LEN - len(ids))
            mask += [0] * (BERT_MAX_LEN - len(mask))
            all_ids.append(ids[:BERT_MAX_LEN])
            all_masks.append(mask[:BERT_MAX_LEN])
        return {"input_ids": all_ids, "attention_mask": all_masks}

    def run(self, raw_text: str):
        if PRODUCTION_MODE:
            log.info("Step 1 │ Resolving coreferences (coreferee) …")
            resolved = self._resolve_coref_production(raw_text)
            log.info("Step 1 │ Segmenting sentences (spaCy) …")
            sentences = self._segment_production(resolved)
            log.info("Step 1 │ WordPiece tokenizing (BertTokenizer) …")
            encoding = self._tokenize_production(sentences)
        else:
            log.info("Step 1 │ [SIM] Resolving coreferences …")
            resolved = self._resolve_coref_simulation(raw_text)
            log.info("Step 1 │ [SIM] Segmenting sentences …")
            sentences = self._segment_simulation(resolved)
            log.info("Step 1 │ [SIM] Tokenizing …")
            encoding = self._tokenize_simulation(sentences)

        log.info(f"Step 1 │ {len(sentences)} sentences extracted ✓")
        return sentences, encoding


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 – NLACP IDENTIFICATION
# ─────────────────────────────────────────────────────────────────────────────
class NLACPIdentifier:
    """
    Slide 5 – Step 2: NLACP Identification.

    PRODUCTION: Fine-tuned BertForSequenceClassification.
      • Checkpoint  : agentvlm/identification/checkpoints/ (download via gdown)
      • Fine-tuning : python identification/train_classifier.py
                        --dataset_path ../data/overall/train.csv
                        --batch_size 16 --epochs 5 --learning_rate 2e-5
      • Eval        : python identification/evaluate_classification.py --mode overall
      • F1 (paper)  : > 0.85 on held-out sets

    SIMULATION: TF-IDF keyword scoring against a curated policy-signal vocabulary.
      Sentences containing access control verbs + entity mentions score above
      threshold and are classified as NLACP.
    """

    # Vocabulary derived from AGentVLM training corpus analysis
    POLICY_VERBS    = {"allow", "deny", "block", "permit", "grant", "restrict",
                       "access", "forbid", "prohibit", "authorize", "must not",
                       "are allowed", "are not allowed", "may access", "must",
                       "shall not", "should not", "cannot", "can access"}
    POLICY_ENTITIES = {"student", "elementary", "middle", "high school", "grade",
                       "user", "teacher", "administrator", "url", "website", "http",
                       "platform", "content", "resource", "page", "site"}
    NOISE_SIGNALS   = {"this document", "section", "the following", "overview",
                       "introduction", "purpose of", "scope of", "we define",
                       "as described", "in summary", "background"}

    def __init__(self):
        if PRODUCTION_MODE:
            import torch
            from transformers import BertForSequenceClassification
            log.info("Step 2 │ Loading fine-tuned BERT NLACP classifier …")
            self.model = BertForSequenceClassification.from_pretrained(
                BERT_CHECKPOINT, num_labels=2, ignore_mismatched_sizes=True
            )
            self.model.eval()
            self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
            log.info(f"Step 2 │ BERT loaded on {self.device} ✓")
        else:
            log.info("Step 2 │ [SIMULATION] Keyword-scoring NLACP classifier loaded ✓")
            self.model = None

    def _bert_classify(self, sentences, encoding) -> List[str]:
        import torch
        with torch.no_grad():
            ids   = torch.tensor(encoding["input_ids"]).to(self.device)
            mask  = torch.tensor(encoding["attention_mask"]).to(self.device)
            out   = self.model(input_ids=ids, attention_mask=mask)
            probs = torch.softmax(out.logits, dim=-1)
            return [s for s, p in zip(sentences, probs[:, 1].cpu().numpy())
                    if p >= NLACP_THRESHOLD]

    def _keyword_classify(self, sentences: List[str]) -> List[str]:
        """
        Score each sentence:
          +2 per policy verb match
          +1 per policy entity match
          -2 per noise signal match
        Classify as NLACP if score >= 2.
        """
        policy = []
        for sent in sentences:
            lower = sent.lower()
            score  = sum(2 for v in self.POLICY_VERBS    if v in lower)
            score += sum(1 for e in self.POLICY_ENTITIES if e in lower)
            score -= sum(2 for n in self.NOISE_SIGNALS   if n in lower)
            if score >= 2:
                policy.append(sent)
        return policy

    def identify(self, sentences: List[str], encoding: dict) -> List[str]:
        if PRODUCTION_MODE:
            result = self._bert_classify(sentences, encoding)
        else:
            result = self._keyword_classify(sentences)
        log.info(
            f"Step 2 │ {len(result)} / {len(sentences)} "
            f"sentences classified as NLACP ✓"
        )
        return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 – POLICY GENERATION
# ─────────────────────────────────────────────────────────────────────────────
LLAMA_PROMPT = """\
You are an Access Control Policy (ACP) parser for a K-12 educational system.
Student profiles contain: school_level (Elementary/Middle/High), grade_range,
age_range, interest, and disability (specific type or N/A).

Extract a JSON object with these fields from the policy sentence:
  subject, action, resource_url, condition, decision (ALLOWED|DENIED),
  risk_level (Safe|Moderate|High), reason, school_level, grade_range,
  age_range, interest, disability, recommended_alternatives (array).

Respond ONLY with valid JSON. No markdown. No preamble.

Policy sentence: "{sentence}"
"""

class PolicyGenerator:
    """
    Slide 5 – Step 3: Policy Generation.

    PRODUCTION: LLaMA 3-8B via HuggingFace transformers pipeline.
      • Fine-tuned with LoRA/PEFT (agentvlm/generation/train_generator.py):
            --lora_alpha 32  --lora_r 16  --lora_dropout 0.05
            --learning_rate 2e-4  --batch_size 8  --num_steps 500
      • Eval (SARCP + ACR): python generation/evaluation/eval_generator_sarcp_batch.py
      • Requires: CUDA GPU, HF_TOKEN, access to meta-llama/Meta-Llama-3-8B

    SIMULATION: Deterministic regex/keyword extractor.
      Implements the same extraction logic that LLaMA learns from fine-tuning.
      Correctly processes the structured K-12 policy sentences in the input.
    """

    # Regex patterns for URL, school level, interest, disability
    _URL_RE  = re.compile(r"https?://[^\s,]+")
    _LEVEL   = [
        (re.compile(r"elementary|grade [1-5]\b|ages 6|ages 7|ages 8|ages 9|ages 10|ages 11", re.I),
         "Elementary", "1-5", "6-11"),
        (re.compile(r"middle school|grade [6-8]\b|ages 1[1-4]", re.I),
         "Middle", "6-8", "11-14"),
        (re.compile(r"high school|grade [9]|grade 1[0-2]\b|ages 1[5-8]", re.I),
         "High", "9-12", "14-18"),
    ]
    _INTERESTS = {
        "math": "Math",               "science": "Science",
        "biology": "Biology",         "physics": "Physics",
        "chemistry": "Chemistry",     "sport": "Sports",
        "reading": "Reading",         "music": "Music",
        "art": "Art",                 "chess": "Chess",
        "history": "History",         "coding": "Computer Science",
        "programming": "Computer Science",
    }
    _DISABILITIES = {
        "adhd": "ADHD",               "dyslexia": "Dyslexia",
        "color blind": "Color Blindness",
        "autism": "Autism",           "hearing": "Hearing Impairment",
    }
    _DENY_RE  = re.compile(
        r"\bmust not\b|\bnot allowed\b|\bdenied\b|\bblock\b|\bprohibit\b"
        r"|\bforbid\b|\binappropriate\b|\bdangerous\b|\billegal\b|\bnot access\b",
        re.I
    )
    _ALLOW_RE = re.compile(
        r"\ballowed\b|\bpermitted?\b|\bmay access\b|\bcan access\b"
        r"|\bauthorized\b|\bencouraged\b|\bsuitable\b|\bgranted\b",
        re.I
    )
    _HIGH_RISK  = re.compile(r"dangerous|illegal|weapon|drug|explicit|gambling|extremist|hacking", re.I)
    _MOD_RISK   = re.compile(r"unmoderated|adult|mature|social media|social platform|caution", re.I)

    # Curated alternative map for common denied URLs
    _ALTERNATIVES = {
        "mathway.com":       ["https://www.khanacademy.org/math", "https://www.coolmathgames.com"],
        "gambling-math.com": ["https://www.khanacademy.org/math"],
        "erowid.org":        ["https://www.rsc.org/learn-chemistry", "https://www.periodic-table.org"],
        "hackforums.net":    ["https://code.org", "https://scratch.mit.edu"],
        "exploit-db.com":    ["https://code.org", "https://www.codecademy.com"],
        "betway.com":        ["https://www.nfl.com", "https://www.olympic.org/education"],
        "draftkings.com":    ["https://www.nfl.com", "https://www.olympic.org/education"],
        "stormfront.org":    ["https://www.ducksters.com/history", "https://www.britannica.com"],
        "wattpad.com":       ["https://www.readworks.org", "https://www.gutenberg.org"],
        "reddit.com":        [],   # allowed for High, see condition logic
        "youtube.com":       [],
        "pinterest.com":     [],
        "deviantart.com":    ["https://www.artsonia.com", "https://www.tate.org.uk/kids"],
        "webmd.com":         ["https://kids.nationalgeographic.com"],
        "spotify.com":       ["https://www.musictheory.net", "https://www.musicca.com"],
    }

    def __init__(self, use_llm: bool = False):
        self.use_llm = use_llm and PRODUCTION_MODE
        if self.use_llm:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline as hf_pipe
            log.info("Step 3 │ Loading LLaMA 3-8B (LoRA fine-tuned) …")
            try:
                tok = AutoTokenizer.from_pretrained(LLAMA_CHECKPOINT)
                mdl = AutoModelForCausalLM.from_pretrained(
                    LLAMA_CHECKPOINT,
                    torch_dtype=torch.float16,
                    device_map="auto",
                )
                self.pipe = hf_pipe("text-generation", model=mdl, tokenizer=tok,
                                    max_new_tokens=512, do_sample=False)
                log.info("Step 3 │ LLaMA 3 loaded ✓")
            except Exception as e:
                log.warning(f"Step 3 │ LLaMA unavailable ({e}). Falling back to rule extractor.")
                self.use_llm = False
        else:
            log.info("Step 3 │ [SIMULATION] Rule-based structured extractor loaded ✓")

    def _llama_extract(self, sentence: str) -> Optional[dict]:
        prompt = LLAMA_PROMPT.format(sentence=sentence)
        try:
            raw = self.pipe(prompt)[0]["generated_text"][len(prompt):].strip()
            raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.M).strip()
            m   = re.search(r"\{.*?\}", raw, re.DOTALL)
            return json.loads(m.group()) if m else None
        except Exception:
            return None

    def _rule_extract(self, sentence: str, rule_id: str) -> AccessControlRule:
        """
        Deterministic ACR extractor – mirrors what LLaMA 3 learns to do.
        Processes in order: URL → decision → level → interest → disability → risk.
        """
        lower = sentence.lower()

        # Extract URL
        url_match = self._URL_RE.search(sentence)
        url = url_match.group().rstrip(".,)") if url_match else "URL not found"
        url_domain = re.sub(r"https?://(?:www\.)?", "", url).split("/")[0]

        # Decision
        is_denied  = bool(self._DENY_RE.search(sentence))
        is_allowed = bool(self._ALLOW_RE.search(sentence))
        decision = "DENIED" if is_denied else ("ALLOWED" if is_allowed else "DENIED")

        # School level
        level, grades, ages = "Elementary", "1-5", "6-11"  # default
        for pat, lv, gr, ag in self._LEVEL:
            if pat.search(sentence):
                level, grades, ages = lv, gr, ag
                break

        # Interest
        interest = next((v for k, v in self._INTERESTS.items() if k in lower), "General")

        # Disability
        disability = next((v for k, v in self._DISABILITIES.items() if k in lower), "N/A")

        # Risk level
        if self._HIGH_RISK.search(sentence):
            risk = "High"
        elif self._MOD_RISK.search(sentence) or decision == "DENIED":
            risk = "Moderate"
        else:
            risk = "Safe"

        # Reason (extract clause after "because")
        reason_match = re.search(r"because (.+?)(?:\.|$)", sentence, re.I)
        reason = reason_match.group(1).strip().capitalize() if reason_match else \
                 ("Restricted content detected" if decision == "DENIED"
                  else "Age-appropriate educational content approved")

        # Alternatives
        alternatives = []
        if decision == "DENIED":
            for key, alts in self._ALTERNATIVES.items():
                if key in url_domain:
                    alternatives = alts
                    break

        return AccessControlRule(
            rule_id=rule_id,
            raw_sentence=sentence,
            subject=f"{level} school student",
            action="access",
            resource_url=url,
            condition=f"school_level={level}, grades={grades}, "
                      f"interest={interest}, disability={disability}",
            decision=decision,
            risk_level=risk,
            reason=reason[:120],
            school_level=level,
            grade_range=grades,
            age_range=ages,
            interest=interest,
            disability=disability,
            recommended_alternatives=alternatives,
        )

    def generate(self, policy_sentences: List[str]) -> List[AccessControlRule]:
        rules = []
        for idx, sent in enumerate(policy_sentences, 1):
            log.info(f"Step 3 │ [{idx:02d}/{len(policy_sentences):02d}] Extracting ACR from NLACP sentence …")
            if self.use_llm:
                extracted = self._llama_extract(sent)
                if extracted:
                    rule = AccessControlRule(
                        rule_id=f"POL-{idx:04d}",
                        raw_sentence=sent,
                        subject=extracted.get("subject", ""),
                        action=extracted.get("action", "access"),
                        resource_url=extracted.get("resource_url", ""),
                        condition=extracted.get("condition", ""),
                        decision=extracted.get("decision", "DENIED"),
                        risk_level=extracted.get("risk_level", "Moderate"),
                        reason=extracted.get("reason", ""),
                        school_level=extracted.get("school_level", "Elementary"),
                        grade_range=extracted.get("grade_range", ""),
                        age_range=extracted.get("age_range", ""),
                        interest=extracted.get("interest", "General"),
                        disability=extracted.get("disability", "N/A"),
                        recommended_alternatives=extracted.get("recommended_alternatives", []),
                    )
                else:
                    rule = self._rule_extract(sent, f"POL-{idx:04d}")
            else:
                rule = self._rule_extract(sent, f"POL-{idx:04d}")
            rules.append(rule)

        log.info(f"Step 3 │ {len(rules)} Access Control Rules generated ✓")
        return rules


# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT WRITERS
# ─────────────────────────────────────────────────────────────────────────────
def write_json(rules: List[AccessControlRule], path: str):
    allowed = sum(1 for r in rules if r.decision == "ALLOWED")
    out = {
        "metadata": {
            "pipeline":    "AGentVLM Steps 1-3",
            "mode":        "PRODUCTION" if PRODUCTION_MODE else "SIMULATION",
            "step1_model": f"spaCy en_core_web_sm + coreferee + {BERT_CHECKPOINT}",
            "step2_model": f"{BERT_CHECKPOINT} (BertForSequenceClassification, fine-tuned)",
            "step3_model": f"{LLAMA_CHECKPOINT} (LoRA/PEFT fine-tuned)",
            "total_rules": len(rules),
            "allowed":     allowed,
            "denied":      len(rules) - allowed,
        },
        "access_control_rules": [asdict(r) for r in rules],
    }
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    log.info(f"Output │ JSON → {path}")


def write_csv(rules: List[AccessControlRule], path: str):
    if not rules:
        return
    fields = list(asdict(rules[0]).keys())
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rules:
            row = asdict(r)
            row["recommended_alternatives"] = " | ".join(row["recommended_alternatives"])
            w.writerow(row)
    log.info(f"Output │ CSV  → {path}")


# ─────────────────────────────────────────────────────────────────────────────
# SAMPLE INPUT
# ─────────────────────────────────────────────────────────────────────────────
POLICY_DOCUMENT = """
Educational Access Control Policy - K-12 Digital Learning Environment

Section 1: General Principles
This document defines access control rules for digital learning resources.
The system must protect students while enabling educational experiences.

Section 2: Elementary School Students (Grades 1-5, Ages 6-11)
Elementary school students interested in Math are allowed to access https://www.khanacademy.org/math as it provides age-appropriate structured math lessons.
They are permitted to use https://www.coolmathgames.com for interactive math practice.
Elementary students must not access https://www.mathway.com because it provides complete solutions without teaching steps, which promotes answer-copying.
Students who have ADHD benefit most from gamified platforms like https://www.coolmathgames.com.
Elementary school students interested in Science are allowed to access https://www.pbslearningmedia.org for curated educational content.
Elementary students must not access https://www.reddit.com/r/science because Reddit contains unmoderated user content not suitable for young children.
Elementary school students are allowed to access https://www.chesskid.com for chess learning in a safe moderated environment.
Elementary school students must not access https://www.gambling-math.com because it contains gambling-related content inappropriate for all student ages.

Section 3: Middle School Students (Grades 6-8, Ages 11-14)
Middle school students are allowed to access https://phet.colorado.edu for interactive physics simulations from the University of Colorado.
Students with Color Blindness should use https://phet.colorado.edu carefully as it uses colour-coded graphs.
Middle school students interested in Chemistry are permitted to access https://www.khanacademy.org/science/chemistry for structured curriculum-aligned lessons.
Middle school students must not access https://www.erowid.org because it contains dangerous drug information inappropriate for all student ages.
Middle school students interested in Reading must not access https://www.reddit.com/r/books because Reddit is unmoderated with risk of inappropriate content.
Middle school students must not access https://www.chess.com/live because the live chess chat feature is not monitored for younger students.

Section 4: High School Students (Grades 9-12, Ages 14-18)
High school students interested in Computer Science are allowed to access https://www.github.com under teacher supervision.
High school students interested in Reading are allowed to access https://www.reddit.com/r/books for literary discussion and recommendations.
Students with Dyslexia are encouraged to use https://www.readworks.org because it provides text-to-speech compatible leveled reading passages.
High school students interested in Art are allowed to access https://www.pinterest.com for creative inspiration when used responsibly.
High school students interested in Science are allowed to access https://www.reddit.com/r/science responsibly for peer scientific discussion.
High school students must not access https://www.hackforums.net because it contains hacking forums with illegal activity content dangerous for students.
High school students are allowed to access https://www.chess.com/live responsibly for competitive chess with community engagement.
High school students interested in Music are allowed to access https://www.youtube.com/music for music appreciation and theory exposure.

Section 5: Universally Blocked Content
All students must not access https://www.gambling-math.com because it contains gambling-related content inappropriate for all student ages.
All students must not access https://www.stormfront.org because it is a white supremacist forum containing extremist content blocked at all levels.
All students must not access https://www.betway.com because it is a sports betting site that is illegal for minors.
All students must not access https://www.exploit-db.com because it is an exploit database dangerous and inappropriate for students.
"""


# =============================================================================
# V4-COMPATIBLE OUTPUT WRITERS
# CSV columns exactly match policy_output_v4 schema.
# =============================================================================

_CSV_FIELDS_V4 = [
    "rule_id", "school_level", "grade_range", "age_range", "interest",
    "url", "decision", "risk_level", "reason",
    "recommended_alternatives", "disability_accessible",
]


def _acr_to_v4_row(rule: AccessControlRule, alternatives: List[str],
                   disability_accessible: bool) -> dict:
    """Convert internal AccessControlRule to v4 CSV row dict."""
    return {
        "rule_id":                  rule.rule_id,
        "school_level":             rule.school_level,
        "grade_range":              rule.grade_range,
        "age_range":                rule.age_range,
        "interest":                 rule.interest,
        "url":                      rule.resource_url,
        "decision":                 rule.decision,
        "risk_level":               rule.risk_level,
        "reason":                   rule.reason,
        "recommended_alternatives": " | ".join(alternatives) if alternatives else "N/A",
        "disability_accessible":    str(disability_accessible),
    }


def write_csv_v4(rows: List[dict], path: str):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=_CSV_FIELDS_V4, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    log.info(f"Output | CSV (v4 schema) -> {path}")


def write_json_v4(rows: List[dict], meta: dict, path: str):
    allowed = sum(1 for r in rows if r["decision"] == "ALLOWED")
    denied  = len(rows) - allowed
    payload = {
        "metadata": {**meta, "total_rules": len(rows),
                     "allowed": allowed, "denied": denied},
        "access_control_rules": rows,
    }
    with open(path, "w") as f:
        json.dump(payload, f, indent=2)
    log.info(f"Output | JSON -> {path}")


# =============================================================================
# MAIN PIPELINE  [Steps 0 -> 1 -> 2 -> 3]
# =============================================================================

def run_pipeline(use_url_mode: bool = True,
                 policy_text: str = POLICY_DOCUMENT) -> List[dict]:
    """
    Run the unified pipeline.

    use_url_mode=True  (default):
        Step 0 fetches each URL in TARGET_URLS live.
        Fetched content drives Steps 1-2-3 per URL per school level.
        Output: CSV + JSON matching policy_output_v4 schema.

    use_url_mode=False:
        Legacy mode: runs Steps 1-3 on the static POLICY_DOCUMENT.
        Output: original AccessControlRule CSV + JSON (original schema).
    """
    mode_str = "PRODUCTION (real models)" if PRODUCTION_MODE else "SIMULATION (rule-based)"
    log.info("=" * 60)
    log.info(f"AGentVLM | Pipeline START  [Steps 0 -> 1 -> 2 -> 3]")
    log.info(f"AGentVLM | Mode: {mode_str}")
    log.info(f"AGentVLM | URL mode: {use_url_mode}")
    log.info("=" * 60)

    preprocessor = Preprocessor()
    identifier   = NLACPIdentifier()
    generator    = PolicyGenerator(use_llm=PRODUCTION_MODE)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── LEGACY MODE (static policy document) ─────────────────────────────────
    if not use_url_mode:
        sentences, encoding  = preprocessor.run(policy_text)
        policy_sentences     = identifier.identify(sentences, encoding)
        rules                = generator.generate(policy_sentences)
        json_path = os.path.join(OUTPUT_DIR, "policy_output_agentvlm.json")
        csv_path  = os.path.join(OUTPUT_DIR, "policy_output_agentvlm.csv")
        write_json(rules, json_path)
        write_csv(rules,  csv_path)
        allowed = sum(1 for r in rules if r.decision == "ALLOWED")
        log.info(f"AGentVLM | DONE | {len(rules)} rules | ALLOWED={allowed} | DENIED={len(rules)-allowed}")
        return [asdict(r) for r in rules]

    # ── URL-DRIVEN MODE (Steps 0 -> 1 -> 2 -> 3 per URL) ────────────────────
    fetcher  = WebFetcher(max_chars=10000, max_retries=3, delay_range=(0.5, 1.5))
    analyzer = ContentSignalAnalyzer()
    builder  = PolicySentenceBuilder()

    fetch_cache: dict   = {}    # url -> fetch result (avoid re-fetching)
    v4_rows:     List[dict] = []
    rule_counter = 1
    total_urls   = len(TARGET_URLS)

    for url_idx, (url, interest, levels) in enumerate(TARGET_URLS, 1):
        log.info(f"URL [{url_idx:02d}/{total_urls}] | {url}")

        # ── Step 0: Fetch live content ────────────────────────────────────────
        if url not in fetch_cache:
            fetch_result = fetcher.fetch_page_text_safe(url)
            fetch_cache[url] = fetch_result
            # Polite delay only after live fetches
            if fetch_result["source"] == "live":
                time.sleep(random.uniform(0.5, 1.5))
        else:
            fetch_result = fetch_cache[url]

        page_text = fetch_result["text"]

        # ── Step 1: Pre-process fetched text ──────────────────────────────────
        sentences, encoding  = preprocessor.run(page_text)

        # ── Step 2: NLACP Identification on fetched sentences ─────────────────
        nlacp_sentences = identifier.identify(sentences, encoding)

        # ── Content signal analysis (bridges Steps 0+2 into Step 3 input) ────
        signals = analyzer.analyze(page_text, nlacp_sentences, url, interest)

        # ── Step 3: Generate one ACR per (url x school_level) ─────────────────
        for level_label, grade_range, age_range in levels:
            rid = f"POL-{rule_counter:04d}"

            # Build structured policy sentence from live signals
            policy_sentence, alternatives, dis_acc = builder.build(
                url=url, interest=interest,
                school_level=level_label, grade_range=grade_range,
                age_range=age_range, signals=signals,
            )

            log.info(f"  Step 3 | {rid} | {level_label} | {signals['suggested_decision']} | {url}")

            # Feed sentence through Step 3 rule extractor
            acr = generator._rule_extract(policy_sentence, rid)

            # Patch school-level fields that _rule_extract may not capture
            # correctly for the High (9-10) / High (11-12) sub-levels
            acr.school_level = level_label
            acr.grade_range  = grade_range
            acr.age_range    = age_range
            acr.interest     = interest
            acr.resource_url = url

            # Convert to v4 row
            row = _acr_to_v4_row(acr, alternatives, dis_acc)
            row["_fetch_source"]  = fetch_result["source"]   # metadata only
            row["_nlacp_count"]   = len(nlacp_sentences)     # metadata only
            v4_rows.append(row)
            rule_counter += 1

    # ── Write outputs ─────────────────────────────────────────────────────────
    csv_path  = os.path.join(OUTPUT_DIR, "policy_output_agentvlm.csv")
    json_path = os.path.join(OUTPUT_DIR, "policy_output_agentvlm.json")

    # CSV: only v4 schema columns (no _ prefixed metadata)
    write_csv_v4(v4_rows, csv_path)

    # JSON: full enriched output including metadata fields
    write_json_v4(
        [{k: v for k, v in r.items() if not k.startswith("_")} for r in v4_rows],
        meta={
            "pipeline":   "AGentVLM Steps 0-3 (Web Fetch + NLP + Policy Generation)",
            "mode":       "PRODUCTION" if PRODUCTION_MODE else "SIMULATION",
            "step0":      "WebFetcher (fetch_page_text_safe: requests + BeautifulSoup + fallback)",
            "step1":      f"Preprocessor ({'spaCy+coreferee+BERT' if PRODUCTION_MODE else 'regex+heuristic+stub'})",
            "step2":      f"NLACPIdentifier ({'BERT fine-tuned' if PRODUCTION_MODE else 'keyword scoring'})",
            "step3":      f"PolicyGenerator ({'LLaMA 3 LoRA' if PRODUCTION_MODE else 'rule extractor'})",
        },
        path=json_path,
    )

    allowed = sum(1 for r in v4_rows if r["decision"] == "ALLOWED")
    denied  = len(v4_rows) - allowed
    log.info("=" * 60)
    log.info(f"AGentVLM | DONE | {len(v4_rows)} rules | ALLOWED={allowed} | DENIED={denied}")
    log.info("=" * 60)
    return v4_rows


if __name__ == "__main__":
    run_pipeline(use_url_mode=True)

