"""
AGentVLM – Student-Friendly Access Control Policy Engine
========================================================
Integrated with Full Pipeline (Steps 0-3)
"""

import re, os, time, random, logging, threading, webbrowser
import tkinter as tk
import tkinter.font as tkfont
from tkinter import ttk, messagebox, simpledialog
from typing import List, Dict, Optional
from datetime import datetime

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
        DISABILITY_RECOMMENDATIONS
        
    )
    PIPELINE_AVAILABLE = True
    logging.info("AGentVLM Pipeline imported successfully")
except ImportError as e:
    PIPELINE_AVAILABLE = False
    logging.warning(f"Pipeline import failed: {e}. Using fallback logic.")

# ── Configuration ──────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("AGentVLM")

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
TXT_PATH = os.path.join(OUTPUT_DIR, "policy_log.txt")
ADMIN_PASSWORD = "admin"

_rule_counter = 1
_admin_overrides = {}

# Initialize Pipeline Components (lazy init on first use)
_pipeline_components = {}

def get_pipeline():
    """Initialize and cache pipeline components."""
    global _pipeline_components
    if not _pipeline_components and PIPELINE_AVAILABLE:
        log.info("Initializing AGentVLM Pipeline components...")
        _pipeline_components = {
            'fetcher': WebFetcher(max_chars=8000, max_retries=2, delay_range=(0.5, 1.0)),
            'preprocessor': Preprocessor(),
            'nlacp_identifier': NLACPIdentifier(),
            'content_analyzer': ContentSignalAnalyzer(),
            'policy_builder': PolicySentenceBuilder(),
            'policy_generator': PolicyGenerator(use_llm=False)  # Rule-based extraction
        }
    return _pipeline_components

# ── Colors ────────────────────────────────────────────────────────────────
COLORS = {
    "bg": "#F0F4F8",
    "card": "#FFFFFF",
    "primary": "#2563EB",
    "success": "#059669",
    "danger": "#DC2626",
    "warning": "#D97706",
    "text": "#1F2937",
    "text_light": "#6B7280",
    "border": "#E5E7EB",
    "accent": "#7C3AED",
    "admin": "#DC2626",
}

# ═══════════════════════════════════════════════════════════════════════════
# DISABILITY OPTIONS
# ═══════════════════════════════════════════════════════════════════════════
DISABILITY_OPTIONS = [
    "NA - No special accommodations needed",
    "ADHD - I learn best with interactive/gamified content",
    "Color Blindness - I need non-color-dependent visuals", 
    "Hearing Impairment - I need captions/transcripts",
    "Other - I have a different accessibility need"
]

DISABILITY_MAP = {
    "NA - No special accommodations needed": "NA",
    "ADHD - I learn best with interactive/gamified content": "ADHD",
    "Color Blindness - I need non-color-dependent visuals": "Color Blindness",
    "Hearing Impairment - I need captions/transcripts": "Hearing Impairment",
    "Other - I have a different accessibility need": "Other"
}

# Legacy fallback data for when pipeline is unavailable
FALLBACK = {
    "khanacademy.org": {
        "desc": "Khan Academy is a free educational platform for K-12 students with structured TTS-compatible lessons.",
        "accessible": ["ADHD", "Color Blindness", "Hearing Impairment"],
        "why_good": "Structured lessons with progress tracking"
    },
    "reddit.com": {
        "desc": "Reddit is a social platform with unmoderated user-generated content.",
        "accessible": [],
        "why_good": None
    },
    "youtube.com": {
        "desc": "YouTube is a video platform with mixed content quality.",
        "accessible": [],
        "why_good": "Educational videos (age restricted)"
    },
}

ALTERNATIVES = {
    "reddit.com": [
        ("https://www.britannica.com", "Reliable information without unmoderated comments"),
        ("https://www.khanacademy.org", "Structured learning without distracting forums")
    ],
    "youtube.com": [
        ("https://www.khanacademy.org", "Educational videos with structured curriculum"),
        ("https://www.pbslearningmedia.org", "Curated educational video content")
    ],
}

GRADE_OPTIONS = {
    "Elementary School": ["1", "2", "3", "4", "5"],
    "Middle School": ["6", "7", "8"],
    "High School (Grades 9-10)": ["9", "10"],
    "High School (Grades 11-12)": ["11", "12"],
}

LEVEL_KEY = {
    "Elementary School": "Elementary",
    "Middle School": "Middle",
    "High School (Grades 9-10)": "High (9-10)",
    "High School (Grades 11-12)": "High (11-12)",
}

# ═══════════════════════════════════════════════════════════════════════════
# ADMIN OVERRIDE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

def load_admin_overrides():
    """Parse the log file to extract admin overrides (URL -> Decision)."""
    global _admin_overrides
    _admin_overrides = {}
    
    if not os.path.exists(TXT_PATH):
        return
    
    try:
        with open(TXT_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        entries = content.split("-" * 80)
        
        for entry in entries:
            url_match = re.search(r"URL:\s*(https?://\S+)", entry, re.IGNORECASE)
            decision_match = re.search(r"Decision:\s*(\w+)", entry, re.IGNORECASE)
            
            if url_match and decision_match:
                url = url_match.group(1).strip().lower()
                decision_raw = decision_match.group(1).strip().upper()
                
                if decision_raw in ["ALLOWED", "ALLOW", "YES", "TRUE", "GRANTED"]:
                    decision = "ALLOWED"
                elif decision_raw in ["DENIED", "DENY", "NO", "FALSE", "BLOCKED"]:
                    decision = "DENIED"
                else:
                    continue
                
                _admin_overrides[url] = decision
                url_no_protocol = re.sub(r"^https?://", "", url)
                _admin_overrides[url_no_protocol] = decision
                
                if url_no_protocol.startswith("www."):
                    _admin_overrides[url_no_protocol[4:]] = decision
                else:
                    _admin_overrides["www." + url_no_protocol] = decision
        
        log.info(f"Loaded {len(_admin_overrides)//3} admin overrides")
    except Exception as e:
        log.warning(f"Could not load admin overrides: {e}")

def check_admin_override(url: str) -> Optional[str]:
    """Check if there's an admin override for this URL."""
    if not url:
        return None
        
    url_normalized = url.strip().lower()
    
    if url_normalized in _admin_overrides:
        return _admin_overrides[url_normalized]
    
    url_no_protocol = re.sub(r"^https?://", "", url_normalized)
    if url_no_protocol in _admin_overrides:
        return _admin_overrides[url_no_protocol]
    
    if url_no_protocol.startswith("www."):
        if url_no_protocol[4:] in _admin_overrides:
            return _admin_overrides[url_no_protocol[4:]]
    else:
        if ("www." + url_no_protocol) in _admin_overrides:
            return _admin_overrides["www." + url_no_protocol]
    
    return None

# ═══════════════════════════════════════════════════════════════════════════
# PIPELINE INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

def run_agentvlm_pipeline(url: str, interest: str, school_level: str, 
                         grade: str, age: str, disability: str) -> dict:
    """
    Execute full AGentVLM Pipeline (Steps 0-3).
    Returns dict compatible with GUI display.
    """
    if not PIPELINE_AVAILABLE:
        raise ImportError("Pipeline not available")
    
    pipe = get_pipeline()
    global _rule_counter
    
    # Step 0: Web Fetch
    log.info(f"Step 0: Fetching {url}")
    fetch_result = pipe['fetcher'].fetch_page_text_safe(url)
    page_text = fetch_result["text"]
    
    # Step 1: Pre-processing
    log.info("Step 1: Pre-processing content")
    sentences, encoding = pipe['preprocessor'].run(page_text)
    
    # Step 2: NLACP Identification
    log.info("Step 2: Identifying NLACP sentences")
    nlacp_sentences = pipe['nlacp_identifier'].identify(sentences, encoding)
    
    # Content Signal Analysis (bridges Step 0+2)
    log.info("Step 2.5: Analyzing content signals")
    signals = pipe['content_analyzer'].analyze(page_text, nlacp_sentences, url, interest)
    
    # Get grade/age ranges
    gr, ar = GRADE_RANGES.get(school_level, (grade, age))
    
    # Step 3: Policy Generation
    log.info("Step 3: Generating policy")
    policy_sentence, alternatives, dis_acc = pipe['policy_builder'].build(
        url=url, 
        interest=interest,
        school_level=school_level, 
        grade_range=gr,
        age_range=ar, 
        signals=signals
    )
    
    # Extract structured rule
    rid = f"POL-{_rule_counter:04d}"
    _rule_counter += 1
    
    acr = pipe['policy_generator']._rule_extract(policy_sentence, rid)
    
    # Override with actual GUI profile data
    acr.school_level = school_level
    acr.grade_range = gr
    acr.age_range = ar
    acr.interest = interest
    acr.disability = disability
    
    # Prepare alternatives list for GUI
    alt_list = []
    for alt_url in alternatives:
        alt_list.append((alt_url, "Educational alternative resource"))
    
    # If no alternatives found but decision is DENIED, check hardcoded map
    if not alt_list and acr.decision == "DENIED":
        url_key = url.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        for key, alts in ALTERNATIVES.items():
            if key in url_key:
                alt_list = alts
                break
    
    return {
        "rule_id": acr.rule_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "school_level": school_level,
        "grade_range": gr,
        "age_range": ar,
        "interest": interest,
        "disability": disability,
        "url": url,
        "decision": acr.decision,
        "risk_level": acr.risk_level,
        "reason": acr.reason,
        "recommended_alternatives": " | ".join([a[0] for a in alt_list]) if alt_list else "N/A",
        "accessibility_features": ", ".join(signals["accessibility_flags"]),
        "disability_compatible": str(dis_acc),
        "alternatives_list": alt_list,
        "admin_override": False,
        "fetch_source": fetch_result.get("source", "unknown"),
        "nlacp_count": len(nlacp_sentences)
    }

def evaluate_single(url, school_level, grade, age, interest, disability, other_disability=None) -> dict:
    """Main evaluation with pipeline integration."""
    global _rule_counter
    
    # Reload overrides before each evaluation
    load_admin_overrides()
    
    # Handle disability text
    actual_disability = disability
    if disability == "Other" and other_disability:
        actual_disability = f"Other ({other_disability})"
    
    # Check for admin override first
    admin_override = check_admin_override(url)
    if admin_override:
        log.info(f"ADMIN OVERRIDE: {url} -> {admin_override}")
        
        # Get alternatives if denied
        alts = []
        if admin_override == "DENIED":
            url_key = url.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            for key, alt_list in ALTERNATIVES.items():
                if key in url_key:
                    alts = alt_list
                    break
        
        gr, ar = GRADE_RANGES.get(school_level, (grade, age))
        rid = f"POL-{_rule_counter:04d}"
        _rule_counter += 1
        
        row = {
            "rule_id": rid,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "school_level": school_level,
            "grade_range": gr,
            "age_range": ar,
            "interest": interest,
            "disability": actual_disability,
            "url": url,
            "decision": admin_override,
            "risk_level": "Safe" if admin_override == "ALLOWED" else "High",
            "reason": f"This decision has been set by administrator as: {admin_override}",
            "recommended_alternatives": " | ".join([a[0] for a in alts]) if alts else "N/A",
            "accessibility_features": "N/A",
            "disability_compatible": "True",
            "alternatives_list": alts,
            "admin_override": True
        }
        
        append_txt(row)
        return row
    
    # Run full AGentVLM Pipeline
    try:
        if PIPELINE_AVAILABLE:
            result = run_agentvlm_pipeline(url, interest, school_level, grade, age, actual_disability)
            append_txt(result)
            return result
        else:
            # Fallback to basic logic if pipeline unavailable
            return _fallback_evaluation(url, school_level, grade, age, interest, actual_disability)
            
    except Exception as e:
        log.error(f"Pipeline error: {e}")
        messagebox.showerror("Analysis Error", f"Error analyzing website: {str(e)}\nFalling back to basic mode.")
        return _fallback_evaluation(url, school_level, grade, age, interest, actual_disability)

def _fallback_evaluation(url, school_level, grade, age, interest, disability):
    """Basic fallback when pipeline is unavailable."""
    global _rule_counter
    
    # Simple keyword-based logic
    danger_keywords = {"gambling": 9, "betting": 9, "casino": 9, "drug": 8, 
                      "weapon": 7, "explicit": 7, "dangerous": 6}
    
    url_lower = url.lower()
    danger_score = sum(1 for k in danger_keywords if k in url_lower)
    
    is_social = any(sp in url_lower for sp in ["reddit.com", "youtube.com", "pinterest.com"])
    is_16plus = school_level == "High (11-12)"
    
    if is_social and not is_16plus:
        decision = "DENIED"
        risk = "High"
        reason = "Social platforms require age 16+ due to unmoderated content"
    elif danger_score > 0:
        decision = "DENIED"
        risk = "High"
        reason = "Potentially inappropriate content detected in URL"
    else:
        decision = "ALLOWED"
        risk = "Safe"
        reason = "No obvious restrictions detected (fallback mode)"
    
    alts = []
    if decision == "DENIED":
        url_key = url_lower.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        for key, alt_list in ALTERNATIVES.items():
            if key in url_key:
                alts = alt_list
                break
    
    gr, ar = GRADE_RANGES.get(school_level, (grade, age))
    rid = f"POL-{_rule_counter:04d}"
    _rule_counter += 1
    
    row = {
        "rule_id": rid,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "school_level": school_level,
        "grade_range": gr,
        "age_range": ar,
        "interest": interest,
        "disability": disability,
        "url": url,
        "decision": decision,
        "risk_level": risk,
        "reason": reason + " (Fallback Mode - Pipeline unavailable)",
        "recommended_alternatives": " | ".join([a[0] for a in alts]) if alts else "N/A",
        "accessibility_features": "N/A",
        "disability_compatible": "True",
        "alternatives_list": alts,
        "admin_override": False,
        "fallback": True
    }
    
    append_txt(row)
    return row

def append_txt(row: dict):
    """Append to text log."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    header = not os.path.exists(TXT_PATH)
    
    with open(TXT_PATH, "a", encoding="utf-8") as f:
        if header:
            f.write("=" * 80 + "\nAGentVLM ACCESS CONTROL POLICY LOG\n" + "=" * 80 + "\n\n")
        
        f.write(f"Rule ID: {row['rule_id']}\n")
        f.write(f"Timestamp: {row['timestamp']}\n")
        f.write(f"Student Profile:\n")
        f.write(f"  - School Level: {row['school_level']}\n")
        f.write(f"  - Grade Range: {row['grade_range']}\n")
        f.write(f"  - Age Range: {row['age_range']}\n")
        f.write(f"  - Interest: {row['interest']}\n")
        f.write(f"  - Disability: {row['disability']}\n")
        f.write(f"URL: {row['url']}\n")
        f.write(f"Decision: {row['decision']}\n")
        f.write(f"Risk Level: {row['risk_level']}\n")
        f.write(f"Reason: {row['reason']}\n")
        if 'fetch_source' in row:
            f.write(f"Fetch Source: {row['fetch_source']}\n")
        if 'nlacp_count' in row:
            f.write(f"NLACP Sentences: {row['nlacp_count']}\n")
        f.write(f"Accessibility Features: {row.get('accessibility_features', 'N/A')}\n")
        f.write(f"Disability Compatible: {row['disability_compatible']}\n")
        f.write(f"Recommended Alternatives: {row['recommended_alternatives']}\n")
        f.write("-" * 80 + "\n\n")

# ═══════════════════════════════════════════════════════════════════════════
# GUI CLASSES
# ═══════════════════════════════════════════════════════════════════════════

class AgentVLMApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AGentVLM - Safe Web Access for Students")
        self.geometry("900x750")
        self.configure(bg=COLORS["bg"])
        self.minsize(800, 650)
        self._setup_fonts()
        self._build_ui()
        
        # Show pipeline status
        if not PIPELINE_AVAILABLE:
            self.status_var.set("⚠️ Pipeline not loaded - Using fallback mode")
        
    def _setup_fonts(self):
        self.fonts = {
            "title": tkfont.Font(family="Segoe UI", size=24, weight="bold"),
            "subtitle": tkfont.Font(family="Segoe UI", size=12),
            "heading": tkfont.Font(family="Segoe UI", size=14, weight="bold"),
            "body": tkfont.Font(family="Segoe UI", size=11),
            "small": tkfont.Font(family="Segoe UI", size=10),
            "mono": tkfont.Font(family="Consolas", size=10),
        }
    
    def _build_ui(self):
        main_container = tk.Frame(self, bg=COLORS["bg"], padx=40, pady=30)
        main_container.pack(fill="both", expand=True)
        
        self._build_header(main_container)
        
        card = tk.Frame(main_container, bg=COLORS["card"], 
                       highlightbackground=COLORS["border"], 
                       highlightthickness=1, bd=0)
        card.pack(fill="both", expand=True, pady=(20, 0))
        
        canvas = tk.Canvas(card, bg=COLORS["card"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(card, orient="vertical", command=canvas.yview)
        self.content_frame = tk.Frame(canvas, bg=COLORS["card"], padx=30, pady=30)
        
        self.content_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
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
        
        mode_text = "Mode: Full Pipeline (Steps 0-3)" if PIPELINE_AVAILABLE else "Mode: Fallback (Pipeline unavailable)"
        self.status_var = tk.StringVar(value=f"{mode_text} | Enter details below to check website safety.")
        tk.Label(header, textvariable=self.status_var, font=self.fonts["small"], 
                bg=COLORS["bg"], fg=COLORS["text_light"]).pack(anchor="w", pady=(10, 0))
    
    def _build_student_section(self, parent):
        section = tk.LabelFrame(parent, text=" Student Profile ", 
                               font=self.fonts["heading"], bg=COLORS["card"],
                               fg=COLORS["text"], padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))
        
        tk.Label(section, text="School Level *", font=self.fonts["body"], 
                bg=COLORS["card"], fg=COLORS["text"]).grid(row=0, column=0, sticky="w", pady=(0, 5))
        
        self.level_var = tk.StringVar()
        self.level_cb = ttk.Combobox(section, textvariable=self.level_var,
                                     values=list(GRADE_OPTIONS.keys()),
                                     state="readonly", font=self.fonts["body"], width=25)
        self.level_cb.grid(row=1, column=0, sticky="ew", padx=(0, 10))
        self.level_cb.bind("<<ComboboxSelected>>", self._on_level_change)
        
        tk.Label(section, text="Grade *", font=self.fonts["body"],
                bg=COLORS["card"], fg=COLORS["text"]).grid(row=0, column=1, sticky="w", pady=(0, 5))
        
        self.grade_var = tk.StringVar()
        self.grade_cb = ttk.Combobox(section, textvariable=self.grade_var,
                                     state="disabled", font=self.fonts["body"], width=15)
        self.grade_cb.grid(row=1, column=1, sticky="w")
        
        tk.Label(section, text="Age *", font=self.fonts["body"],
                bg=COLORS["card"], fg=COLORS["text"]).grid(row=2, column=0, sticky="w", pady=(15, 5))
        
        self.age_var = tk.StringVar()
        tk.Entry(section, textvariable=self.age_var, font=self.fonts["body"], 
                width=10, bg=COLORS["bg"], relief="solid", bd=1).grid(row=3, column=0, sticky="w", padx=(0, 10))
        
        tk.Label(section, text="Interest/Subject *", font=self.fonts["body"],
                bg=COLORS["card"], fg=COLORS["text"]).grid(row=2, column=1, sticky="w", pady=(15, 5))
        
        self.interest_var = tk.StringVar()
        tk.Entry(section, textvariable=self.interest_var,
                font=self.fonts["body"], width=30, bg=COLORS["bg"], 
                relief="solid", bd=1).grid(row=3, column=1, sticky="w")
        
        section.grid_columnconfigure(0, weight=1)
        section.grid_columnconfigure(1, weight=1)
    
    def _build_disability_section(self, parent):
        section = tk.LabelFrame(parent, text=" Accessibility Needs ", 
                               font=self.fonts["heading"], bg=COLORS["card"],
                               fg=COLORS["accent"], padx=15, pady=15)
        section.pack(fill="x", pady=(0, 20))
        
        tk.Label(section, text="Select any accessibility accommodations you need.",
                font=self.fonts["small"], bg=COLORS["card"], 
                fg=COLORS["text_light"], wraplength=700, justify="left").pack(anchor="w", pady=(0, 10))
        
        dropdown_frame = tk.Frame(section, bg=COLORS["card"])
        dropdown_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(dropdown_frame, text="Accessibility Option *", font=self.fonts["body"],
                bg=COLORS["card"], fg=COLORS["text"]).pack(anchor="w")
        
        self.disability_var = tk.StringVar()
        self.disability_var.set(DISABILITY_OPTIONS[0])
        
        self.disability_cb = ttk.Combobox(dropdown_frame, textvariable=self.disability_var,
                                          values=DISABILITY_OPTIONS, state="readonly", 
                                          font=self.fonts["body"], width=50)
        self.disability_cb.pack(fill="x", pady=(5, 0))
        self.disability_cb.bind("<<ComboboxSelected>>", self._on_disability_change)
        
        self.other_frame = tk.Frame(section, bg=COLORS["card"])
        self.other_frame.pack(fill="x", pady=(10, 0))
        self.other_frame.pack_forget()
        
        tk.Label(self.other_frame, text="Please specify your accessibility need:", 
                font=self.fonts["body"], bg=COLORS["card"], fg=COLORS["accent"]).pack(anchor="w")
        
        self.other_disability_var = tk.StringVar()
        self.other_entry = tk.Entry(self.other_frame, textvariable=self.other_disability_var,
                font=self.fonts["body"], width=50, bg="#F0FDFA", 
                relief="solid", bd=1)
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
                width=60, bg=COLORS["bg"], relief="solid", bd=1).pack(fill="x", pady=(5, 0), ipady=5)
        
        tk.Label(section, text="Examples: https://www.khanacademy.org, https://www.coolmathgames.com",
                font=self.fonts["small"], bg=COLORS["card"], fg=COLORS["text_light"]).pack(anchor="w", pady=(5, 0))
    
    def _build_actions(self, parent):
        btn_frame = tk.Frame(parent, bg=COLORS["card"])
        btn_frame.pack(fill="x", pady=(0, 20))
        
        tk.Button(btn_frame, text="🔄 Clear Form", font=self.fonts["body"],
                 bg=COLORS["bg"], fg=COLORS["text"], relief="solid", bd=1,
                 cursor="hand2", command=self._clear).pack(side="left", padx=(0, 10), ipadx=10, ipady=5)
        
        self.eval_btn = tk.Button(btn_frame, text="🔍 Check Access Safety" if PIPELINE_AVAILABLE else "🔍 Check (Fallback)", 
                                 font=self.fonts["heading"], bg=COLORS["primary"], 
                                 fg="white", relief="flat", cursor="hand2",
                                 command=self._on_evaluate)
        self.eval_btn.pack(side="right", ipadx=20, ipady=8)
    
    def _build_history(self, parent):
        history_frame = tk.LabelFrame(parent, text=" Recent Checks ", 
                                     font=self.fonts["heading"], 
                                     bg=COLORS["card"], fg=COLORS["text"])
        history_frame.pack(fill="both", expand=True, pady=(20, 0))
        
        headers = tk.Frame(history_frame, bg=COLORS["card"])
        headers.pack(fill="x", padx=10, pady=5)
        
        tk.Label(headers, text="Status", font=self.fonts["small"], 
                bg=COLORS["card"], fg=COLORS["text_light"], width=10).pack(side="left")
        tk.Label(headers, text="Website", font=self.fonts["small"],
                bg=COLORS["card"], fg=COLORS["text_light"], width=40).pack(side="left")
        tk.Label(headers, text="Decision", font=self.fonts["small"],
                bg=COLORS["card"], fg=COLORS["text_light"], width=15).pack(side="left")
        
        self.history_canvas = tk.Canvas(history_frame, bg=COLORS["card"], 
                                       highlightthickness=0, height=150)
        scrollbar = ttk.Scrollbar(history_frame, orient="vertical", 
                                 command=self.history_canvas.yview)
        self.history_inner = tk.Frame(self.history_canvas, bg=COLORS["card"])
        
        self.history_inner.bind("<Configure>", 
            lambda e: self.history_canvas.configure(scrollregion=self.history_canvas.bbox("all")))
        
        self.history_canvas.create_window((0, 0), window=self.history_inner, anchor="nw")
        self.history_canvas.configure(yscrollcommand=scrollbar.set)
        
        self.history_canvas.pack(side="left", fill="both", expand=True, padx=10, pady=5)
        scrollbar.pack(side="right", fill="y")
        
        tk.Button(history_frame, text="📄 View Full Log File", 
                 font=self.fonts["small"], bg=COLORS["bg"],
                 relief="solid", bd=1, command=self._open_log).pack(anchor="se", padx=10, pady=5)
    
    def _on_level_change(self, event=None):
        level = self.level_var.get()
        grades = GRADE_OPTIONS.get(level, [])
        self.grade_cb["values"] = grades
        self.grade_cb["state"] = "readonly"
        self.grade_var.set("")
        
        if level == "Elementary School":
            self.age_var.set("8")
        elif level == "Middle School":
            self.age_var.set("12")
        elif level == "High School (Grades 9-10)":
            self.age_var.set("15")
        elif level == "High School (Grades 11-12)":
            self.age_var.set("17")
    
    def _clear(self):
        self.level_var.set("")
        self.grade_var.set("")
        self.grade_cb["state"] = "disabled"
        self.age_var.set("")
        self.interest_var.set("")
        self.url_var.set("https://")
        self.disability_var.set(DISABILITY_OPTIONS[0])
        self.other_disability_var.set("")
        self.other_frame.pack_forget()
        self.status_var.set("Ready" if PIPELINE_AVAILABLE else "Fallback mode ready")
    
    def _on_evaluate(self):
        errors = []
        
        if not self.level_var.get():
            errors.append("School Level")
        if not self.grade_var.get():
            errors.append("Grade")
            
        age_txt = self.age_var.get().strip()
        if not age_txt.isdigit() or not (5 <= int(age_txt) <= 19):
            errors.append("Age (must be 5-19)")
            
        interest = self.interest_var.get().strip()
        if not interest:
            errors.append("Interest/Subject")
            
        url = self.url_var.get().strip()
        if not url or url == "https://" or not url.startswith(("http://", "https://")):
            errors.append("Valid Website URL")
        
        disability_selection = self.disability_var.get()
        other_text = self.other_disability_var.get().strip()
        if "Other" in disability_selection and not other_text:
            errors.append("Please specify your accessibility need")
        
        if errors:
            messagebox.showerror("Missing Information", 
                               "Please complete:\n• " + "\n• ".join(errors))
            return
        
        disability = DISABILITY_MAP.get(disability_selection, "NA")
        school_level = LEVEL_KEY[self.level_var.get()]
        
        self.eval_btn.config(state="disabled", text="⏳ Running Pipeline..." if PIPELINE_AVAILABLE else "⏳ Checking...")
        self.status_var.set("🔍 Step 0: Fetching webpage...")
        
        def run_check():
            try:
                result = evaluate_single(
                    url=url, school_level=school_level,
                    grade=self.grade_var.get(), age=age_txt,
                    interest=interest, disability=disability,
                    other_disability=other_text if disability == "Other" else None
                )
                if result:
                    self.after(0, lambda: self._show_result(result))
            except Exception as e:
                log.error(f"Evaluation error: {e}")
                self.after(0, lambda: messagebox.showerror("Error", f"Evaluation failed: {str(e)}"))
                self.after(0, lambda: self.eval_btn.config(state="normal", 
                           text="🔍 Check Access Safety" if PIPELINE_AVAILABLE else "🔍 Check (Fallback)"))
        
        threading.Thread(target=run_check, daemon=True).start()
    
    def _show_result(self, result):
        self.eval_btn.config(state="normal", 
                            text="🔍 Check Access Safety" if PIPELINE_AVAILABLE else "🔍 Check (Fallback)")
        self.status_var.set(f"Last check: {result['decision']} | {result.get('fetch_source', 'unknown')} source")
        self._add_to_history(result)
        ResultWindow(self, result)
    
    def _add_to_history(self, result):
        row = tk.Frame(self.history_inner, bg=COLORS["bg"], padx=5, pady=3)
        row.pack(fill="x", pady=2)
        
        is_allowed = result["decision"] == "ALLOWED"
        icon = "✅" if is_allowed else "🚫"
        color = COLORS["success"] if is_allowed else COLORS["danger"]
        
        tk.Label(row, text=icon, font=self.fonts["body"], 
                bg=COLORS["bg"], width=3).pack(side="left")
        
        display_url = result["url"][:35] + "..." if len(result["url"]) > 35 else result["url"]
        
        if is_allowed:
            url_lbl = tk.Label(row, text=display_url, font=self.fonts["mono"],
                              bg=COLORS["bg"], fg=COLORS["primary"], cursor="hand2")
            url_lbl.pack(side="left", padx=5)
            url_lbl.bind("<Button-1>", lambda e, u=result["url"]: webbrowser.open_new(u))
        else:
            url_lbl = tk.Label(row, text=display_url, font=self.fonts["mono"],
                              bg=COLORS["bg"], fg=COLORS["text_light"])
            url_lbl.pack(side="left", padx=5)
        
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
                                         "Enter admin password:", 
                                         show="*", parent=self)
        
        if password is None:
            return
            
        if password != ADMIN_PASSWORD:
            messagebox.showerror("Access Denied", "Incorrect password.")
            return
        
        AdminLogViewer(self)


class AdminLogViewer(tk.Toplevel):
    """Admin log viewer with editing capabilities."""
    
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Admin Log Viewer - Editable")
        self.configure(bg=COLORS["card"])
        self.geometry("800x600")
        self.resizable(True, True)
        self.transient(parent)
        self.grab_set()
        self._build_ui()
        
        parent_x = parent.winfo_x()
        parent_y = parent.winfo_y()
        parent_w = parent.winfo_width()
        parent_h = parent.winfo_height()
        self.geometry(f"+{parent_x + (parent_w-800)//2}+{parent_y + (parent_h-600)//2}")
    
    def _build_ui(self):
        header = tk.Frame(self, bg=COLORS["admin"], padx=20, pady=10)
        header.pack(fill="x")
        
        tk.Label(header, text="🔐 Admin Log Viewer", 
                font=("Segoe UI", 16, "bold"), bg=COLORS["admin"], 
                fg="white").pack(side="left")
        tk.Label(header, text="Edit decisions to change access policy", 
                font=("Segoe UI", 10), bg=COLORS["admin"], 
                fg="white").pack(side="right")
        
        instr = tk.Frame(self, bg="#FEF3C7", padx=10, pady=5)
        instr.pack(fill="x", padx=10, pady=5)
        tk.Label(instr, 
                text="💡 Change 'Decision: DENIED' to 'Decision: ALLOWED' (or vice versa) and save. Future checks will use the new decision.", 
                font=("Segoe UI", 9), bg="#FEF3C7", fg=COLORS["warning"], 
                wraplength=750, justify="left").pack()
        
        text_frame = tk.Frame(self, bg=COLORS["card"])
        text_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        scrollbar = ttk.Scrollbar(text_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.text_widget = tk.Text(text_frame, wrap="word", padx=10, pady=10,
                                  font=("Consolas", 10), yscrollcommand=scrollbar.set)
        self.text_widget.pack(fill="both", expand=True)
        scrollbar.config(command=self.text_widget.yview)
        
        with open(TXT_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        self.text_widget.insert("1.0", content)
        
        btn_frame = tk.Frame(self, bg=COLORS["card"], padx=10, pady=10)
        btn_frame.pack(fill="x")
        
        tk.Button(btn_frame, text="💾 Save Changes", 
                 font=("Segoe UI", 11, "bold"),
                 bg=COLORS["success"], fg="white", relief="flat",
                 padx=20, pady=8, cursor="hand2", 
                 command=self._save).pack(side="left", padx=(0, 10))
        
        tk.Button(btn_frame, text="❌ Close Without Saving", 
                 font=("Segoe UI", 11), bg=COLORS["bg"], 
                 fg=COLORS["text"], relief="solid", bd=1,
                 padx=20, pady=8, cursor="hand2", 
                 command=self.destroy).pack(side="left")
        
        tk.Label(btn_frame, text="⚠️ Save for changes to take effect!", 
                font=("Segoe UI", 9), bg=COLORS["card"], 
                fg=COLORS["danger"]).pack(side="right")
    
    def _save(self):
        content = self.text_widget.get("1.0", "end-1c")
        
        try:
            with open(TXT_PATH, 'w', encoding='utf-8') as f:
                f.write(content)
            
            load_admin_overrides()
            
            messagebox.showinfo("Success", 
                              "Log saved! Overrides updated.\nFuture checks will use new decisions.", 
                              parent=self)
            self.destroy()
        except Exception as e:
            messagebox.showerror("Error", f"Could not save: {str(e)}", parent=self)


class ResultWindow(tk.Toplevel):
    """Result window with security fix: no clickable links when denied."""
    
    def __init__(self, parent, result):
        super().__init__(parent)
        self.result = result
        self.title("Access Control Result")
        self.configure(bg=COLORS["card"])
        self.geometry("650x550")
        self.resizable(True, True)
        self.transient(parent)
        self.grab_set()
        self._build_content()
        
        parent_x = parent.winfo_x()
        parent_y = parent.winfo_y()
        parent_w = parent.winfo_width()
        parent_h = parent.winfo_height()
        self.geometry(f"+{parent_x + (parent_w-650)//2}+{parent_y + (parent_h-550)//2}")
    
    def _build_content(self):
        main = tk.Frame(self, bg=COLORS["card"], padx=30, pady=30)
        main.pack(fill="both", expand=True)
        
        is_allowed = self.result["decision"] == "ALLOWED"
        
        # Header
        header = tk.Frame(main, bg=COLORS["card"])
        header.pack(fill="x", pady=(0, 20))
        
        icon = "✅" if is_allowed else "🚫"
        icon_color = COLORS["success"] if is_allowed else COLORS["danger"]
        
        tk.Label(header, text=icon, font=("Segoe UI", 48), 
                bg=COLORS["card"], fg=icon_color).pack()
        
        title = "Access Granted!" if is_allowed else "Access Denied"
        tk.Label(header, text=title, font=("Segoe UI", 20, "bold"),
                bg=COLORS["card"], fg=icon_color).pack(pady=(10, 0))
        
        # Badges
        badge_frame = tk.Frame(header, bg=COLORS["card"])
        badge_frame.pack(pady=(5, 0))
        
        if self.result.get("admin_override"):
            tk.Label(badge_frame, text="🔐 Admin Override", 
                    font=("Segoe UI", 10, "bold"),
                    bg="#FEF3C7", fg=COLORS["warning"], padx=10, pady=3).pack(side="left", padx=2)
        
        if self.result.get("fallback"):
            tk.Label(badge_frame, text="⚠️ Fallback Mode", 
                    font=("Segoe UI", 10, "bold"),
                    bg="#FEE2E2", fg=COLORS["danger"], padx=10, pady=3).pack(side="left", padx=2)
        
        # URL display
        url_frame = tk.Frame(header, bg=COLORS["card"])
        url_frame.pack(pady=(10, 0))
        
        if is_allowed:
            url_lbl = tk.Label(url_frame, text=self.result["url"],
                              font=("Consolas", 10, "underline"),
                              bg=COLORS["card"], fg=COLORS["primary"],
                              cursor="hand2")
            url_lbl.pack()
            url_lbl.bind("<Button-1>", lambda e: webbrowser.open_new(self.result["url"]))
            tk.Label(url_frame, text="👆 Click to open", 
                    font=("Segoe UI", 8), bg=COLORS["card"], 
                    fg=COLORS["text_light"]).pack()
        else:
            url_lbl = tk.Label(url_frame, text=self.result["url"],
                              font=("Consolas", 10),
                              bg=COLORS["card"], fg=COLORS["text_light"])
            url_lbl.pack()
            tk.Label(url_frame, text="🔒 Access restricted", 
                    font=("Segoe UI", 8), bg=COLORS["card"], 
                    fg=COLORS["danger"]).pack()
        
        # Decision Box
        box_bg = "#F0FDF4" if is_allowed else "#FEF2F2"
        box = tk.Frame(main, bg=box_bg, padx=20, pady=15, relief="solid", bd=1,
                      highlightbackground=COLORS["success"] if is_allowed else COLORS["danger"],
                      highlightthickness=2)
        box.pack(fill="x", pady=20)
        
        # Risk badge
        risk_colors = {"Safe": COLORS["success"], "Moderate": COLORS["warning"], "High": COLORS["danger"]}
        risk_color = risk_colors.get(self.result['risk_level'], COLORS["text"])
        
        risk_frame = tk.Frame(box, bg=box["bg"])
        risk_frame.pack(fill="x")
        
        tk.Label(risk_frame, text=f"Risk Level: {self.result['risk_level']}",
                font=("Segoe UI", 10, "bold"), bg=risk_color, fg="white",
                padx=10, pady=3).pack(side="left")
        
        # Pipeline info
        if 'nlacp_count' in self.result:
            tk.Label(risk_frame, text=f"NLACP: {self.result['nlacp_count']} sentences",
                    font=("Segoe UI", 9), bg=box["bg"], 
                    fg=COLORS["text_light"]).pack(side="right")
        
        # Reason
        tk.Label(box, text=self.result["reason"], font=("Segoe UI", 11), bg=box["bg"],
                fg=COLORS["text"], wraplength=550, justify="left").pack(fill="x", pady=(10, 0), anchor="w")
        
        # Alternatives only if denied
        if not is_allowed and self.result.get("alternatives_list"):
            alt_section = tk.LabelFrame(main, text=" 🌟 Recommended Safe Alternatives ", 
                                       font=("Segoe UI", 12, "bold"),
                                       bg=COLORS["card"], fg=COLORS["primary"],
                                       padx=15, pady=15)
            alt_section.pack(fill="x", pady=(0, 20))
            
            tk.Label(alt_section, text="These websites offer similar content:",
                    font=("Segoe UI", 10), bg=COLORS["card"],
                    fg=COLORS["text_light"]).pack(anchor="w", pady=(0, 10))
            
            for url, description in self.result["alternatives_list"]:
                alt_card = tk.Frame(alt_section, bg="#EFF6FF", padx=10, pady=10,
                                   relief="solid", bd=1, highlightbackground="#BFDBFE",
                                   highlightthickness=1)
                alt_card.pack(fill="x", pady=5)
                
                url_btn = tk.Label(alt_card, text=f"🔗 {url}", 
                                  font=("Consolas", 10, "underline"),
                                  bg="#EFF6FF", fg=COLORS["primary"],
                                  cursor="hand2")
                url_btn.pack(anchor="w")
                url_btn.bind("<Button-1>", lambda e, u=url: webbrowser.open_new(u))
                
                tk.Label(alt_card, text=f"✓ {description}",
                        font=("Segoe UI", 9), bg="#EFF6FF",
                        fg=COLORS["text"], wraplength=500, justify="left").pack(anchor="w", pady=(5, 0))
        
        # Accessibility info if allowed
        if is_allowed and self.result.get('accessibility_features'):
            acc_text = f"♿ Accessibility Features: {self.result['accessibility_features']}"
            tk.Label(main, text=acc_text, font=("Segoe UI", 10), 
                    bg=COLORS["card"], fg=COLORS["accent"]).pack(anchor="w", pady=(0, 20))
        
        # Close button
        tk.Button(main, text="Close", font=("Segoe UI", 11, "bold"),
                 bg=COLORS["primary"] if is_allowed else COLORS["text"],
                 fg="white", relief="flat", padx=30, pady=10,
                 cursor="hand2", command=self.destroy).pack(pady=(10, 0))


# ═══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    load_admin_overrides()
    app = AgentVLMApp()
    app.mainloop()