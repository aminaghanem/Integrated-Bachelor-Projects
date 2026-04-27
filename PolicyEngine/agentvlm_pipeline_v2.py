"""
============================================================
 AGentVLM – UNIFIED PIPELINE  (v5 – Policy-Compliant)
 Steps 0-3: Web Fetch -> Pre-processing -> NLACP Identification
                         -> Policy Generation
 Project : AI-Powered Policy Engine for Context-Aware
           Access Control (K-12 Educational System)
 Output  : policy_output_agentvlm.txt  (plain text – NOT JSON or CSV)
============================================================

Policy source : policy_output_v5.xlsx
  ALL URLs, alternative URLs, and disability URLs are taken from that file.

Output schema (v5):
  rule_id | school_level | grade_range | age_range | interest |
  url     | decision     | risk_level  | reason    |
  recommended_alternatives | disability_accessible

ENVIRONMENT MODES
  SIMULATION (default – no GPU required)
    pip install requests beautifulsoup4
  PRODUCTION
    pip install transformers torch spacy coreferee requests beautifulsoup4
    python -m spacy download en_core_web_sm && python -m coreferee install en
    Set PRODUCTION_MODE = True and HF_TOKEN for LLaMA 3.
"""

import re, os, logging, time, random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

try:
    import requests
    from bs4 import BeautifulSoup
    _FETCH_AVAILABLE = True
except ImportError:
    _FETCH_AVAILABLE = False
    logging.warning("requests/beautifulsoup4 not installed – fallback only.")

logging.basicConfig(level=logging.INFO, format="%(levelname)s │ %(message)s")
log = logging.getLogger("AGentVLM")

PRODUCTION_MODE  = False
BERT_CHECKPOINT  = "google-bert/bert-base-uncased"
LLAMA_CHECKPOINT = "meta-llama/Meta-Llama-3-8B"
NLACP_THRESHOLD  = 0.5
BERT_MAX_LEN     = 128
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

GRADE_RANGES = {
    "Elementary":   ("1-5",  "6-11"),
    "Middle":       ("6-8",  "11-14"),
    "High (9-10)":  ("9-10", "14-15"),
    "High (11-12)": ("11-12","16-18"),
}

# ═══════════════════════════════════════════════════════════════════════════
# DISABILITY-SPECIFIC RECOMMENDATIONS
# Source: "Disabilities" sheet of policy_output_v5.xlsx
# ═══════════════════════════════════════════════════════════════════════════
DISABILITY_RECOMMENDATIONS = {
    "ADHD": {
        "Math": [
            ("https://www.coolmathgames.com",               "Gamified math practice with interactive challenges helps maintain focus"),
            ("https://www.khanacademy.org/math",            "Short structured lessons with progress badges and clear goals"),
            ("https://www.desmos.com/calculator",           "Visual interactive graphing with immediate feedback"),
        ],
        "Science": [
            ("https://phet.colorado.edu",                   "Interactive hands-on simulations reduce passive reading"),
            ("https://www.pbslearningmedia.org",            "Short engaging video content with varied pacing"),
        ],
        "Reading": [
            ("https://www.readworks.org",                   "Structured reading with audio support and clear pacing"),
            ("https://www.storylineonline.net",             "Audio-read picture books for engagement and focus"),
        ],
        "English": [
            ("https://www.readworks.org",                   "Levelled passages with structured comprehension questions"),
            ("https://www.commonlit.org",                   "Guided reading with clear scaffolding and short texts"),
        ],
        "Social Studies": [
            ("https://www.ducksters.com/history",           "Short digestible articles with clear headings"),
            ("https://www.britannica.com",                  "Well-structured entries with concise summaries"),
        ],
        "History": [
            ("https://www.ducksters.com/history",           "Concise history articles with clear structure"),
            ("https://www.britannica.com",                  "Reliable encyclopaedia with concise well-organised entries"),
        ],
        "Art": [
            ("https://www.artsonia.com",                    "Hands-on creative platform with short project-based tasks"),
            ("https://www.tate.org.uk/kids",                "Interactive art activities with short focused tasks"),
        ],
        "Computer": [
            ("https://scratch.mit.edu",                     "Visual block-based programming with immediate visual results"),
            ("https://code.org",                            "Short structured coding missions with reward badges"),
        ],
        "Arabic": [
            ("https://www.duolingo.com/course/ar",          "Gamified short lessons with streaks and rewards for motivation"),
            ("https://www.arabicpod101.com",                "Short audio/visual lessons with varied formats"),
        ],
        "Biology": [
            ("https://phet.colorado.edu",                   "Interactive simulations for biology concepts"),
            ("https://www.khanacademy.org/science/biology", "Short modular lessons with visual diagrams"),
        ],
        "Physics": [
            ("https://phet.colorado.edu",                   "Interactive physics simulations with hands-on learning"),
            ("https://www.physicsclassroom.com",            "Short structured lessons with visual explanations"),
        ],
        "Chemistry": [
            ("https://phet.colorado.edu",                   "Interactive chemistry simulations reduce boredom"),
            ("https://www.khanacademy.org/science/chemistry","Short focused chemistry modules with progress tracking"),
        ],
        "Sports": [
            ("https://www.pe4life.org",                     "Short structured physical education activities"),
            ("https://www.olympic.org/education",           "Engaging sports education with video and interactive content"),
        ],
        "Chess": [
            ("https://www.chesskid.com",                    "Kid-friendly chess with gamified learning for focus"),
            ("https://www.chessable.com",                   "Short interactive chess lessons with spaced repetition"),
        ],
        "Music": [
            ("https://www.musictheory.net",                 "Visual music theory with short interactive exercises"),
            ("https://www.musicca.com",                     "Real-time visual feedback keeps attention"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "Short structured lessons with progress tracking"),
            ("https://www.coolmathgames.com",               "Interactive gamified learning"),
        ],
    },

    "Color Blindness": {
        "Math": [
            ("https://www.desmos.com",                      "Graphing with patterns and labels instead of just colours"),
            ("https://www.khanacademy.org/math",            "Text descriptions alongside visual content"),
            ("https://mathworld.wolfram.com",               "Text-heavy math reference with minimal colour dependency"),
        ],
        "Science": [
            ("https://phet.colorado.edu",                   "Simulations with colour-blind friendly modes and pattern overlays"),
            ("https://www.physicsclassroom.com",            "Text-based physics with pattern-based diagrams"),
        ],
        "Reading": [
            ("https://www.gutenberg.org",                   "Plain text format with no colour dependency"),
            ("https://www.readworks.org",                   "High-contrast accessible reading interface"),
        ],
        "English": [
            ("https://www.gutenberg.org",                   "Plain text books with no colour dependency"),
            ("https://www.commonlit.org",                   "High-contrast accessible reading interface"),
        ],
        "Social Studies": [
            ("https://www.ducksters.com/history",           "Text-based layout with minimal colour-coded content"),
            ("https://www.britannica.com",                  "High-contrast encyclopaedia with text-first design"),
        ],
        "History": [
            ("https://www.britannica.com",                  "Text-first encyclopaedia design with high contrast"),
            ("https://www.ducksters.com/history",           "Simple accessible layout not reliant on colour"),
        ],
        "Art": [
            ("https://www.metmuseum.org/art/online-resources","Provides detailed text descriptions of artworks"),
            ("https://www.tate.org.uk/kids",                "Includes text descriptions and accessibility options"),
        ],
        "Computer": [
            ("https://code.org",                            "Colour-blind accessible coding interface with pattern cues"),
            ("https://scratch.mit.edu",                     "Block labels supplement colour coding"),
        ],
        "Arabic": [
            ("https://www.madinaharabic.com",               "Text-heavy layout with no colour dependency"),
            ("https://arabic.desert-sky.net",               "Simple black-and-white text layout for Arabic study"),
        ],
        "Biology": [
            ("https://www.khanacademy.org/science/biology", "Text descriptions supplement all diagrams"),
            ("https://www.biologycorner.com",               "Pattern-labelled biological diagrams available"),
        ],
        "Physics": [
            ("https://www.physicsclassroom.com",            "Text-based explanations with labelled diagrams"),
            ("https://phet.colorado.edu",                   "Colour-blind friendly simulation modes"),
        ],
        "Chemistry": [
            ("https://phet.colorado.edu",                   "Interactive periodic table with shape/pattern indicators"),
            ("https://www.periodic-table.org",              "Text-based element information with symbol labels"),
        ],
        "Sports": [
            ("https://www.pe4life.org",                     "Text and image-based PE resources, not colour-dependent"),
            ("https://www.olympic.org/education",           "Educational content with labelled visuals"),
        ],
        "Chess": [
            ("https://lichess.org",                         "Supports colour-blind board themes and pattern pieces"),
            ("https://www.chess.com/play/computer",         "Offers colour-blind piece sets and board themes"),
        ],
        "Music": [
            ("https://www.musictheory.net",                 "Music notation relies on shape/position not just colour"),
            ("https://www.noteflight.com",                  "Score notation accessible without colour distinction"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "Content with audio descriptions and text labels"),
        ],
    },

    "Hearing Impairment": {
        "Math": [
            ("https://www.khanacademy.org/math",            "Full captions on all video lessons"),
            ("https://www.desmos.com/calculator",           "Visual-only tool with no audio dependency"),
        ],
        "Science": [
            ("https://www.pbslearningmedia.org",            "All videos fully captioned for hearing-impaired learners"),
            ("https://phet.colorado.edu",                   "Visual interactive simulations with no audio requirement"),
        ],
        "Reading": [
            ("https://www.gutenberg.org",                   "Full text content without audio dependencies"),
            ("https://www.readworks.org",                   "Text-based reading with visual supports"),
        ],
        "English": [
            ("https://www.gutenberg.org",                   "Pure text literary content with no audio required"),
            ("https://www.commonlit.org",                   "Text-based English literature with captioned videos"),
        ],
        "Social Studies": [
            ("https://www.ducksters.com/history",           "Text-only format, no audio required"),
            ("https://www.britannica.com",                  "Fully text-based reference with no audio dependency"),
        ],
        "History": [
            ("https://www.britannica.com",                  "Fully text-based reference encyclopaedia"),
            ("https://www.ducksters.com/history",           "Text articles fully accessible without audio"),
        ],
        "Art": [
            ("https://www.metmuseum.org/art/online-resources","Text-based art education with no audio dependency"),
            ("https://www.artsonia.com",                    "Visual platform with text descriptions throughout"),
        ],
        "Computer": [
            ("https://code.org",                            "Visual step-by-step coding with no audio required"),
            ("https://scratch.mit.edu",                     "Visual programming fully accessible without sound"),
        ],
        "Arabic": [
            ("https://www.madinaharabic.com",               "Text and visual Arabic grammar with no audio dependency"),
            ("https://arabic.desert-sky.net",               "Written Arabic lessons accessible without audio"),
        ],
        "Biology": [
            ("https://www.khanacademy.org/science/biology", "Captioned video lessons for biology"),
            ("https://www.biologycorner.com",               "Text and diagram-based biology resources"),
        ],
        "Physics": [
            ("https://www.physicsclassroom.com",            "Text-based physics resources with visual diagrams"),
            ("https://phet.colorado.edu",                   "Visual simulations with no audio dependency"),
        ],
        "Chemistry": [
            ("https://www.periodic-table.org",              "Visual and text periodic table with no audio needed"),
            ("https://www.khanacademy.org/science/chemistry","Captioned video chemistry lessons"),
        ],
        "Sports": [
            ("https://www.olympic.org/education",           "Captioned sports education videos and visual content"),
            ("https://www.pe4life.org",                     "Text and image-based physical education resources"),
        ],
        "Music": [
            ("https://www.musictheory.net",                 "Visual music theory lessons with no audio requirement"),
            ("https://www.noteflight.com",                  "Visual music notation tool for hearing-impaired learners"),
        ],
        "Chess": [
            ("https://lichess.org",                         "Fully visual chess platform with no audio required"),
            ("https://www.chesskid.com",                    "Visual chess interface with text instructions"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "Full captions on all video content"),
            ("https://www.pbslearningmedia.org",            "Captioned educational videos"),
        ],
    },

    "Dyslexia": {
        "Math": [
            ("https://www.khanacademy.org/math",            "TTS-compatible with clear text layout and audio explanations"),
            ("https://www.coolmathgames.com",               "Visual and interactive math reduces reading load"),
        ],
        "Science": [
            ("https://phet.colorado.edu",                   "Hands-on simulations reduce reliance on text reading"),
            ("https://www.pbslearningmedia.org",            "Audio-visual content reduces reading barriers"),
        ],
        "Reading": [
            ("https://www.readworks.org",                   "Text-to-speech compatible passages with levelled support"),
            ("https://www.gutenberg.org",                   "Plain text format compatible with screen readers"),
            ("https://www.commonlit.org",                   "TTS-enabled literary texts with scaffolding"),
        ],
        "English": [
            ("https://www.readworks.org",                   "TTS-compatible English passages with audio support"),
            ("https://www.commonlit.org",                   "TTS-enabled English literature with scaffolding"),
            ("https://www.gutenberg.org",                   "Plain text format for use with screen readers"),
        ],
        "Social Studies": [
            ("https://www.ducksters.com/history",           "Short clear articles compatible with TTS tools"),
            ("https://www.britannica.com",                  "Clean layout compatible with browser TTS extensions"),
        ],
        "History": [
            ("https://www.ducksters.com/history",           "Short simple history articles easy for TTS reading"),
            ("https://www.britannica.com",                  "Compatible with browser TTS extensions"),
        ],
        "Art": [
            ("https://www.artsonia.com",                    "Visual creative platform minimising reading demand"),
            ("https://www.tate.org.uk/kids",                "Visual art activities with audio descriptions"),
        ],
        "Computer": [
            ("https://scratch.mit.edu",                     "Visual block-based coding reduces reading demand"),
            ("https://code.org",                            "Visual programming with minimal text reliance"),
        ],
        "Arabic": [
            ("https://www.arabicpod101.com",                "Audio-first Arabic lessons reduce reading pressure"),
            ("https://www.duolingo.com/course/ar",          "Gamified audio-visual Arabic learning"),
        ],
        "Biology": [
            ("https://www.khanacademy.org/science/biology", "Audio-visual biology lessons with TTS support"),
            ("https://phet.colorado.edu",                   "Visual simulations reduce biology reading load"),
        ],
        "Physics": [
            ("https://phet.colorado.edu",                   "Interactive physics simulations reduce text dependency"),
            ("https://www.khanacademy.org/science/physics", "Audio-visual lessons with TTS-compatible text"),
        ],
        "Chemistry": [
            ("https://phet.colorado.edu",                   "Visual chemistry simulations with minimal text"),
            ("https://www.khanacademy.org/science/chemistry","Audio-visual chemistry content with TTS support"),
        ],
        "Sports": [
            ("https://www.olympic.org/education",           "Video-based sports education reduces reading load"),
            ("https://www.pe4life.org",                     "Clear structured PE with visual guides"),
        ],
        "Chess": [
            ("https://www.chesskid.com",                    "Visual chess learning with minimal reading demand"),
            ("https://lichess.org",                         "Clean visual chess interface with screen reader support"),
        ],
        "Music": [
            ("https://www.musicca.com",                     "Visual instruments with minimal text dependency"),
            ("https://www.musictheory.net",                 "Visual lessons reduce reading pressure"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "TTS-compatible with clear text layout"),
            ("https://www.readworks.org",                   "Levelled reading with audio support"),
        ],
    },

    "Autism": {
        "Math": [
            ("https://www.khanacademy.org/math",            "Predictable structured lessons with consistent layout"),
            ("https://www.desmos.com",                      "Visual predictable interface with clear interactions"),
        ],
        "Science": [
            ("https://phet.colorado.edu",                   "Structured predictable simulations with clear controls"),
            ("https://www.pbslearningmedia.org",            "Consistent structured science content"),
        ],
        "Reading": [
            ("https://www.gutenberg.org",                   "Clean minimal text format without distracting elements"),
            ("https://www.readworks.org",                   "Structured reading with predictable layout"),
        ],
        "English": [
            ("https://www.readworks.org",                   "Predictable structured English reading passages"),
            ("https://www.commonlit.org",                   "Consistent layout with structured literary analysis"),
        ],
        "Social Studies": [
            ("https://www.ducksters.com/history",           "Simple consistent layout with predictable structure"),
            ("https://www.britannica.com",                  "Consistent structured reference format"),
        ],
        "History": [
            ("https://www.britannica.com",                  "Highly consistent structured encyclopaedia format"),
            ("https://www.ducksters.com/history",           "Simple predictable article structure"),
        ],
        "Art": [
            ("https://www.artsonia.com",                    "Structured moderated art platform with predictable navigation"),
            ("https://www.metmuseum.org/art/online-resources","Consistent museum-quality layout"),
        ],
        "Computer": [
            ("https://scratch.mit.edu",                     "Visual block-based programming with consistent interface"),
            ("https://code.org",                            "Structured step-by-step coding with predictable progression"),
        ],
        "Arabic": [
            ("https://www.madinaharabic.com",               "Structured classical Arabic with predictable lesson format"),
            ("https://arabic.desert-sky.net",               "Clear consistent lesson structure for Arabic"),
        ],
        "Biology": [
            ("https://www.khanacademy.org/science/biology", "Structured modules with predictable progression"),
            ("https://www.biologycorner.com",               "Organised consistent biology resources"),
        ],
        "Physics": [
            ("https://www.physicsclassroom.com",            "Structured clear physics lessons with consistent format"),
            ("https://phet.colorado.edu",                   "Predictable simulation interface"),
        ],
        "Chemistry": [
            ("https://www.khanacademy.org/science/chemistry","Structured chemistry modules with clear progression"),
            ("https://www.periodic-table.org",              "Consistent visual periodic table layout"),
        ],
        "Sports": [
            ("https://www.pe4life.org",                     "Structured PE resources with clear predictable instructions"),
            ("https://www.olympic.org/education",           "Organised educational sports content"),
        ],
        "Chess": [
            ("https://www.chesskid.com",                    "Structured safe chess environment with predictable interface"),
            ("https://www.chess.com/learn-how-to-play-chess","Step-by-step chess learning with consistent format"),
        ],
        "Music": [
            ("https://www.musictheory.net",                 "Predictable structured music theory lessons"),
            ("https://www.noteflight.com",                  "Consistent visual score-based music tool"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "Predictable layout with clear structure"),
            ("https://scratch.mit.edu",                     "Visual programming with consistent interface"),
        ],
    },

    "Other": {
        "Math": [
            ("https://www.khanacademy.org/math",            "Comprehensive accessibility features including TTS and captions"),
            ("https://www.desmos.com/calculator",           "Accessible visual math tool with multiple input methods"),
        ],
        "Science": [
            ("https://www.pbslearningmedia.org",            "Multiple accessibility options including captions and transcripts"),
            ("https://phet.colorado.edu",                   "Accessible simulations with keyboard navigation support"),
        ],
        "Reading": [
            ("https://www.readworks.org",                   "TTS-compatible accessible reading platform"),
            ("https://www.gutenberg.org",                   "Plain text format works with all assistive technologies"),
        ],
        "English": [
            ("https://www.commonlit.org",                   "Accessible English platform with TTS and structured support"),
            ("https://www.readworks.org",                   "Multi-modal accessible English reading resources"),
        ],
        "Social Studies": [
            ("https://www.britannica.com",                  "Accessible encyclopaedia with screen-reader compatibility"),
            ("https://www.ducksters.com/history",           "Simple accessible layout for all needs"),
        ],
        "History": [
            ("https://www.britannica.com",                  "Accessible reference with screen reader support"),
            ("https://www.ducksters.com/history",           "Simple accessible history articles for all needs"),
        ],
        "Art": [
            ("https://www.metmuseum.org/art/online-resources","Accessible art education with alt text and descriptions"),
            ("https://www.artsonia.com",                    "Accessible creative platform with simple navigation"),
        ],
        "Computer": [
            ("https://code.org",                            "Highly accessible coding platform supporting multiple needs"),
            ("https://scratch.mit.edu",                     "Accessible visual programming with multiple input methods"),
        ],
        "Arabic": [
            ("https://www.arabicpod101.com",                "Multiple learning formats to suit varied accessibility needs"),
            ("https://www.duolingo.com/course/ar",          "Accessible gamified learning with multiple modalities"),
        ],
        "Biology": [
            ("https://www.khanacademy.org/science/biology", "Fully accessible biology content with TTS and captions"),
            ("https://phet.colorado.edu",                   "Accessible biology simulations with keyboard support"),
        ],
        "Physics": [
            ("https://phet.colorado.edu",                   "Accessible physics simulations supporting multiple needs"),
            ("https://www.khanacademy.org/science/physics", "Accessible physics with captions and TTS"),
        ],
        "Chemistry": [
            ("https://www.khanacademy.org/science/chemistry","Accessible chemistry with TTS and visual support"),
            ("https://www.periodic-table.org",              "Accessible periodic table with text and visual formats"),
        ],
        "Sports": [
            ("https://www.olympic.org/education",           "Accessible sports education with captions and text"),
            ("https://www.pe4life.org",                     "Accessible physical education resources"),
        ],
        "Chess": [
            ("https://lichess.org",                         "Open-source accessible chess with full keyboard support"),
            ("https://www.chesskid.com",                    "Accessible chess platform with simple navigation"),
        ],
        "Music": [
            ("https://www.musictheory.net",                 "Accessible music theory with keyboard navigation"),
            ("https://www.noteflight.com",                  "Accessible visual music composition tool"),
        ],
        "General": [
            ("https://www.khanacademy.org",                 "Comprehensive accessibility features"),
            ("https://www.pbslearningmedia.org",            "Multiple accessibility options"),
        ],
    },
}


# =============================================================================
# STEP 0 – WEB FETCHER
# Fallback descriptions enriched with accessibility keywords so the
# ContentSignalAnalyzer can detect TTS / captions / WCAG / colour-blind signals.
# Source: policy_output_v5.xlsx – All Policies + individual school-level sheets.
# =============================================================================
_FALLBACK_DESCRIPTIONS = {
    # MATH
    "khanacademy.org/math":
        "Khan Academy Math is a free educational platform for K-12 students. Students are "
        "allowed to access khanacademy.org/math because it provides structured text-to-speech "
        "TTS-compatible math lessons with screen reader support keyboard navigation and WCAG "
        "compliant interface.",
    "khanacademy.org":
        "Khan Academy is a free educational platform for K-12 students. Students are allowed to "
        "access khanacademy.org because it provides structured text-to-speech TTS-compatible "
        "lessons with accessible design screen reader support keyboard navigation and WCAG "
        "compliant interface.",
    "coolmathgames.com":
        "Cool Math Games provides gamified math practice for all ages. Students are allowed to "
        "access coolmathgames.com because it offers engaging interactive math games with simple "
        "accessible visual interface suitable for ADHD learners with keyboard navigation.",
    "mathworld.wolfram.com":
        "MathWorld by Wolfram is an advanced mathematics encyclopaedia. Students are allowed to "
        "access mathworld.wolfram.com because it is a trusted text-heavy academic math reference "
        "with screen-reader compatible layout suitable for Middle school and above.",
    "desmos.com":
        "Desmos is an interactive graphing calculator. Students are allowed to access desmos.com "
        "because it provides keyboard-navigable math visualisation with clean accessible UI "
        "color blind friendly patterns and high contrast mode.",
    "wolframalpha.com":
        "Wolfram Alpha is a computational knowledge engine. Students are allowed to access "
        "wolframalpha.com for advanced mathematical computations with keyboard accessible "
        "interface.",
    "brilliant.org":
        "Brilliant.org provides advanced structured problem-solving in math and science. "
        "Students are allowed to access brilliant.org because it offers curriculum-aligned "
        "interactive courses with accessible design for high school learners.",
    "mathway.com":
        "Mathway provides complete step-by-step math solutions. Students must not access "
        "mathway.com because it delivers full answers without teaching steps which promotes "
        "answer-copying and undermines learning.",
    "gambling-math.com":
        "Gambling Math site contains casino and betting content. Students must not access "
        "gambling-math.com because it contains gambling-related content that is inappropriate "
        "and illegal for all student ages.",
    # SCIENCE / ELEMENTARY
    "pbslearningmedia.org":
        "PBS Learning Media offers curated captioned educational content for K-12. Students are "
        "allowed to access pbslearningmedia.org because it provides safe age-appropriate "
        "structured science content with closed captions and transcripts for hearing-impaired "
        "students and text-to-speech support.",
    "kids.nationalgeographic.com":
        "National Geographic Kids provides child-safe science articles. Students are allowed to "
        "access kids.nationalgeographic.com because it has a clean layout and screen-reader "
        "friendly science articles suitable for elementary students.",
    "nasa.gov":
        "NASA Learning Resources provides official government science and space education. "
        "Students are allowed to access nasa.gov because it contains captioned accessible "
        "educational videos and resources with text-to-speech support.",
    "reddit.com/r/science":
        "Reddit r/science contains unmoderated user-generated science content. Students must "
        "not access reddit.com/r/science because it is unmoderated and not suitable for "
        "students under 16.",
    "youtube.com/results?search_query=science":
        "YouTube science search provides open unfiltered video results. Students must not "
        "access youtube.com science search because open search may expose unfiltered content "
        "to elementary school students.",
    # BIOLOGY
    "khanacademy.org/science/biology":
        "Khan Academy Biology provides TTS-compatible structured intro biology for all levels. "
        "Students are allowed to access khanacademy.org/science/biology because it is a "
        "curriculum-aligned biology platform with text-to-speech and accessible interface.",
    "biologycorner.com":
        "Biology Corner provides structured biology worksheets and resources. Students are "
        "allowed to access biologycorner.com for curriculum-aligned biology materials with "
        "printable accessible content.",
    "ncbi.nlm.nih.gov":
        "NCBI provides NIH biology textbooks that meet government accessibility standards. "
        "Students are allowed to access ncbi.nlm.nih.gov because it is an official government "
        "academic biology resource with accessible design.",
    "hhmi.org":
        "HHMI BioInteractive provides captioned medical animations and interactive biology "
        "content. Students are allowed to access hhmi.org because it offers accessible "
        "educational biology with captions and interactive features.",
    "webmd.com":
        "WebMD provides symptom-based medical information for adults. Younger students must "
        "not access webmd.com because symptom-based medical content is not appropriate for "
        "elementary and middle school students.",
    "wikipedia.org/wiki/Human_reproduction":
        "Wikipedia Human Reproduction contains adult anatomy content. Students must not access "
        "wikipedia.org/wiki/Human_reproduction because it contains adult anatomy content not "
        "suitable for elementary or middle school students.",
    # PHYSICS
    "phet.colorado.edu":
        "PhET Interactive Simulations provides accessible physics and science simulations from "
        "the University of Colorado. Students are allowed to access phet.colorado.edu because "
        "it supports colour-blind modes keyboard navigation screen readers and high contrast "
        "settings.",
    "physicsclassroom.com":
        "The Physics Classroom provides structured physics tutorials. Students are allowed to "
        "access physicsclassroom.com because it has screen-reader-compatible clean structured "
        "content with text-to-speech support.",
    "khanacademy.org/science/physics":
        "Khan Academy Physics provides TTS-compatible structured physics course. Students are "
        "allowed to access khanacademy.org/science/physics because it is a curriculum-aligned "
        "accessible physics platform.",
    "arxiv.org":
        "arXiv provides open-access research papers in physics and science. Students are "
        "allowed to access arxiv.org for high school advanced research; note that PDFs have "
        "limited accessibility.",
    "nuclear-weapons.info":
        "Nuclear Weapons Info provides detailed weapons technology information. Students must "
        "not access nuclear-weapons.info because it contains dangerous weapons-related content "
        "that is inappropriate for all student ages.",
    # CHEMISTRY
    "rsc.org":
        "Royal Society of Chemistry provides structured accessible chemistry learning resources. "
        "Students are allowed to access rsc.org for curriculum-aligned chemistry education with "
        "captioned videos and accessible layouts.",
    "chemguide.co.uk":
        "ChemGuide provides text-based A-level chemistry guide. Students are allowed to access "
        "chemguide.co.uk for high school chemistry because it is screen-reader compatible with "
        "text-to-speech support.",
    "khanacademy.org/science/chemistry":
        "Khan Academy Chemistry provides TTS-compatible structured chemistry lessons. Students "
        "are allowed to access khanacademy.org/science/chemistry because it is a curriculum-"
        "aligned accessible chemistry platform.",
    "periodic-table.org":
        "Periodic Table org provides an interactive visual chemistry reference. Students are "
        "allowed to access periodic-table.org because it supports colour-blind modes and "
        "accessible layout with keyboard navigation.",
    "erowid.org":
        "Erowid documents information about psychoactive substances and drugs. Students must "
        "not access erowid.org because it contains dangerous drug information that is "
        "inappropriate and harmful for all student ages.",
    "instructables.com":
        "Instructables hosts user-submitted DIY chemistry instructions. Students must not "
        "access instructables.com/chemistry because it contains unvetted DIY chemistry "
        "instructions that pose a safety risk.",
    # SPORTS
    "nfl.com":
        "NFL is the official National Football League site. Students are allowed to access "
        "nfl.com because it is a family-friendly sports platform with captioned accessible "
        "content and transcripts.",
    "olympic.org":
        "Olympic org provides official Olympic education resources. Students are allowed to "
        "access olympic.org because it offers captioned sports education content with "
        "accessible design.",
    "pe4life.org":
        "PE4Life provides structured physical education resources. Students are allowed to "
        "access pe4life.org because it offers curriculum-aligned PE education with accessible "
        "design for all levels.",
    "espn.com":
        "ESPN provides sports news and coverage. Students are allowed to access espn.com for "
        "sports news with captioned video content.",
    "draftkings.com":
        "DraftKings is an online sports gambling and daily fantasy platform. Students must not "
        "access draftkings.com because online gambling is dangerous and illegal for minors.",
    "betway.com":
        "Betway is a sports betting and casino platform. Students must not access betway.com "
        "because sports betting is illegal for all student ages.",
    # READING / ENGLISH
    "readworks.org":
        "ReadWorks provides TTS-compatible levelled reading passages for K-12. Students are "
        "allowed to access readworks.org because it has excellent text-to-speech support "
        "suitable for students with dyslexia and hearing impairment with closed captions.",
    "gutenberg.org":
        "Project Gutenberg offers free public domain literature. Students are allowed to "
        "access gutenberg.org because it provides screen-reader-friendly plain text books "
        "accessible to all students including those with dyslexia.",
    "storylineonline.net":
        "Storyline Online provides audio-read picture books. Students are allowed to access "
        "storylineonline.net because it supports hearing and reading accessibility with "
        "captions and visual storytelling.",
    "commonlit.org":
        "CommonLit provides TTS-enabled literary texts aligned to curriculum. Students are "
        "allowed to access commonlit.org for structured reading education with text-to-speech "
        "and accessible interface.",
    "wattpad.com":
        "Wattpad hosts user-generated stories including mature and explicit content. Students "
        "must not access wattpad.com because it contains adult and explicit user-generated "
        "content inappropriate for students.",
    "amazon.com":
        "Amazon Books is a commercial platform with adult categories. Students must not access "
        "amazon.com because it is a commercial platform with adult content categories and "
        "advertising.",
    "reddit.com/r/books":
        "Reddit r/books is an unmoderated book discussion community. Elementary and middle "
        "school students must not access reddit.com/r/books because it is unmoderated. High "
        "school students aged 16 and above are allowed to access reddit.com/r/books for "
        "literary discussion and recommendations.",
    # MUSIC
    "musictheory.net":
        "Music Theory net provides visual interactive music theory lessons. Students are "
        "allowed to access musictheory.net because it has keyboard navigation and accessible "
        "visual music education suitable for hearing-impaired students.",
    "nyphilkids.org":
        "New York Philharmonic Kids provides captioned educational music content for children. "
        "Students are allowed to access nyphilkids.org for safe structured music education "
        "with transcripts and accessible design.",
    "noteflight.com":
        "Noteflight is an online music notation and composition tool. Students are allowed to "
        "access noteflight.com for visual music creation with keyboard accessible interface.",
    "musicca.com":
        "Musicca provides visual instruments with real-time feedback. Students are allowed to "
        "access musicca.com because it offers accessible visual music tools with high contrast "
        "display.",
    "spotify.com":
        "Spotify is an audio-only music streaming platform. Students must not access "
        "spotify.com because it has no captions or transcripts and contains explicit content "
        "creating accessibility barriers for all students including hearing-impaired.",
    "youtube.com/music":
        "YouTube Music hosts music videos that may contain mature themes. Elementary, middle "
        "and High (9-10) students must not access youtube.com/music because music videos may "
        "contain mature themes not suitable for students under 16. High school students in "
        "grades 11-12 aged 16 and above are allowed to access youtube.com/music for music "
        "appreciation and theory exploration.",
    # ART
    "artsonia.com":
        "Artsonia is a moderated safe student art sharing platform. Students are allowed to "
        "access artsonia.com because it has simple accessible interface and is fully moderated "
        "with keyboard navigation.",
    "tate.org.uk":
        "Tate Kids provides museum-quality educational art with screen-reader and caption "
        "support. Students are allowed to access tate.org.uk for safe accessible art education "
        "with text descriptions.",
    "metmuseum.org":
        "The Metropolitan Museum provides accessible educational art resources. Students are "
        "allowed to access metmuseum.org for structured accessible art education with audio "
        "descriptions and captions.",
    "deviantart.com":
        "DeviantArt hosts user-generated art including adult and mature content. Students must "
        "not access deviantart.com because it contains inappropriate adult art content with no "
        "accessibility standards.",
    "pinterest.com":
        "Pinterest is a visual discovery platform with colour-only infinite-scroll layout. "
        "Elementary and middle school students must not access pinterest.com because it is not "
        "suitable for students under 16. High school students aged 16 and above are allowed "
        "to access pinterest.com for creative art inspiration.",
    # HISTORY / SOCIAL STUDIES
    "ducksters.com":
        "Ducksters provides clean readable TTS-compatible history articles. Students are "
        "allowed to access ducksters.com for accessible history education with text-to-speech "
        "support.",
    "history.com":
        "History Channel provides accessible history content with captioned videos. Students "
        "are allowed to access history.com for educational history content with closed captions "
        "and transcripts.",
    "britannica.com":
        "Encyclopaedia Britannica is a trusted reference. Students are allowed to access "
        "britannica.com because it has clean TTS-compatible screen-reader-friendly layout with "
        "accessible navigation.",
    "smithsonianmag.com":
        "Smithsonian Magazine provides in-depth historical articles. Students are allowed to "
        "access smithsonianmag.com for accessible advanced history content with text-to-speech "
        "compatibility.",
    "stormfront.org":
        "Stormfront is a white supremacist extremist hate forum. Students must not access "
        "stormfront.org because it contains dangerous extremist hateful content blocked at all "
        "student levels.",
    # COMPUTER
    "code.org":
        "Code.org provides structured accessible coding education for all ages. Students are "
        "allowed to access code.org because it offers keyboard-navigable screen-reader-"
        "compatible programming courses with high contrast mode.",
    "scratch.mit.edu":
        "MIT Scratch provides visual block-based programming for children. Students are "
        "allowed to access scratch.mit.edu because it has a simple predictable accessible "
        "interface suitable for ADHD and autism with keyboard navigation.",
    "codecademy.com":
        "Codecademy provides structured keyboard-navigable coding lessons. Students are "
        "allowed to access codecademy.com for interactive coding education with accessible "
        "design.",
    "github.com":
        "GitHub is a code collaboration platform. Students are allowed to access github.com "
        "for computer science projects under teacher supervision with keyboard accessible "
        "interface.",
    "hackforums.net":
        "Hack Forums is a hacking community with illegal activity and exploit content. "
        "Students must not access hackforums.net because it contains illegal hacking content "
        "that is dangerous for all student ages.",
    "exploit-db.com":
        "Exploit Database is a public vulnerability and exploit archive. Students must not "
        "access exploit-db.com because it is dangerous and inappropriate for all student ages.",
    # ARABIC
    "arabicpod101.com":
        "ArabicPod101 provides structured audio/visual Arabic lessons with TTS support. "
        "Students are allowed to access arabicpod101.com because it is a structured TTS-"
        "compatible Arabic language learning platform accessible for all school levels.",
    "madinaharabic.com":
        "Madinah Arabic provides classical Arabic grammar courses that are text-heavy and "
        "screen-reader compatible. Students are allowed to access madinaharabic.com because "
        "it is a trusted curriculum-aligned Arabic grammar resource.",
    "arabic.desert-sky.net":
        "Desert-Sky Arabic provides free structured Arabic lessons with clear accessible "
        "layout. Students are allowed to access arabic.desert-sky.net because it offers a "
        "clean accessible layout for Arabic study.",
    "learnarabiconline.com":
        "Learn Arabic Online provides beginner Arabic lessons with visual aids and audio "
        "support. Students are allowed to access learnarabiconline.com because it supports "
        "accessible language learning with visual and audio content.",
    "duolingo.com":
        "Duolingo provides gamified Arabic learning with accessible structured interface. "
        "Students are allowed to access duolingo.com/course/ar because it is a gamified "
        "accessible language learning platform.",
    "youtube.com/results?search_query=arabic":
        "YouTube Arabic lesson search provides open unfiltered results. Students must not "
        "access youtube.com Arabic lesson searches because open search may expose unfiltered "
        "content to under-16 students.",
    "reddit.com/r/learn_arabic":
        "Reddit r/learn_arabic is an unmoderated community. Students must not access "
        "reddit.com/r/learn_arabic because it is unmoderated community content not suitable "
        "for under-16 students.",
    # CHESS
    "chesskid.com":
        "ChessKid is the Chess.com child-safe version designed for students. Students are "
        "allowed to access chesskid.com because it provides structured chess learning in a "
        "safe moderated environment with accessible interface suitable for ADHD learners.",
    "chess.com/learn-how-to-play-chess":
        "Chess.com Learn provides clear step-by-step chess tutorials that are keyboard "
        "navigable. Students are allowed to access chess.com/learn-how-to-play-chess because "
        "it is a structured educational chess resource.",
    "lichess.org":
        "Lichess is a free open-source chess platform. Students are allowed to access "
        "lichess.org because it has strong accessibility and screen-reader support with "
        "keyboard navigation and colour-blind board themes.",
    "chess.com/play/computer":
        "Chess.com Computer Play provides AI opponent chess with no live chat and a structured "
        "predictable interface. Students are allowed to access chess.com/play/computer because "
        "it is a safe chess learning tool with no unmoderated chat.",
    "chessable.com":
        "Chessable provides structured spaced-repetition chess learning. Students are allowed "
        "to access chessable.com for advanced chess strategy with accessible text-based "
        "lessons.",
    "chess.com/live":
        "Chess.com Live provides live competitive chess with unmoderated community chat. "
        "Students under 16 must not access chess.com/live because the live chat is "
        "unmoderated. High school students aged 16 and above are allowed to access "
        "chess.com/live for competitive chess.",
    "chess.com/forum":
        "Chess.com Forum is an unmoderated community discussion board. Students must not "
        "access chess.com/forum because it is an unmoderated community forum not appropriate "
        "for school use.",
    # SOCIAL MEDIA
    "reddit.com":
        "Reddit is a social platform with unmoderated user-generated content. Elementary and "
        "middle school students must not access reddit.com because it contains unmoderated "
        "adult content not suitable for students under 16. High school students aged 16 and "
        "above are allowed to access reddit.com responsibly.",
    "youtube.com":
        "YouTube is a video platform with mixed content quality. Elementary and middle school "
        "students must not access youtube.com because it may expose younger students to "
        "unfiltered content. High school students aged 16 and above are allowed to access "
        "youtube.com for educational and music content with caption support.",
}


class WebFetcher:
    """Step 0 – Fetches live page text; falls back to curated descriptions."""
    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection": "keep-alive",
    }

    def __init__(self, max_chars=10000, max_retries=3, delay_range=(1, 3)):
        self.max_chars, self.max_retries, self.delay_range = max_chars, max_retries, delay_range

    def _get_fallback(self, url: str) -> str:
        for key, desc in _FALLBACK_DESCRIPTIONS.items():
            if key in url:
                return desc
        return (f"This website at {url} requires access control evaluation. "
                "Access policy to be determined based on educational relevance.")

    def fetch_page_text_safe(self, url: str) -> dict:
        if not _FETCH_AVAILABLE:
            fb = self._get_fallback(url)
            return {"url": url, "text": fb, "source": "fallback", "status_code": 0, "char_count": len(fb)}
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = requests.get(url, headers=self._HEADERS, timeout=15)
                if resp.status_code == 403:
                    time.sleep(random.uniform(*self.delay_range)); continue
                if resp.status_code != 200:
                    break
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "noscript"]): tag.decompose()
                text = " ".join(soup.stripped_strings)
                if len(text.strip()) < 80: break
                text = text[:self.max_chars]
                log.debug(f"Step 0 | Fetched {len(text)} chars from {url} [live]")
                return {"url": url, "text": text, "source": "live",
                        "status_code": resp.status_code, "char_count": len(text)}
            except Exception as e:
                log.debug(f"Step 0 | Attempt {attempt} failed for {url}: {e}")
                time.sleep(random.uniform(*self.delay_range))
        fb = self._get_fallback(url)
        log.debug(f"Step 0 | Using fallback for {url}")
        return {"url": url, "text": fb, "source": "fallback", "status_code": 0, "char_count": len(fb)}


# =============================================================================
# CONTENT SIGNAL ANALYZER
# =============================================================================
class ContentSignalAnalyzer:
    _DANGER = {
        "gambling": 9, "betting": 9, "casino": 9, "wager": 9,
        "illegal": 8, "exploit": 8, "hacking": 8, "hack forum": 8,
        "extremist": 9, "white supremac": 10, "neo-nazi": 10,
        "drug": 8, "narcotic": 8, "psychoactive": 8, "substance abuse": 8,
        "weapon": 7, "explosive": 9, "nuclear weapon": 9,
        "explicit": 7, "adult content": 7 : 10,
        "dangerous": 6, "malware": 9, "ransomware": 9, "phishing": 8,
    }
    _SAFE = {
        "educational": 3, "curriculum": 3, "lesson": 2, "learning": 2,
        "student": 2, "teacher": 2, "school": 2, "grade": 2,
        "k-12": 3, "classroom": 2, "academic": 2, "textbook": 3,
        "khan academy": 4, "public domain": 3, "open source": 2,
        "government": 2, "museum": 2, "university": 2,
    }
    _ACCESSIBILITY = {
        "text-to-speech": "TTS", "tts": "TTS", "read aloud": "TTS",
        "closed caption": "Captions", "captioned": "Captions", "transcript": "Captions",
        "screen reader": "ScreenReader", "aria": "ScreenReader",
        "keyboard navigat": "KeyboardNav", "keyboard shortcut": "KeyboardNav",
        "color blind": "ColourBlind", "colour blind": "ColourBlind",
        "high contrast": "HighContrast", "accessible": "General",
        "wcag": "WCAG", "section 508": "Section508",
    }
    _EXPLICIT_DENY = re.compile(
        r"\bmust not\b|\bnot allowed\b|\bis denied\b|\bshould not access\b"
        r"|\bprohibited\b|\bforbidden\b|\bcannot access\b|\bdo not access\b"
        r"|\binappropriate for\b|\bdangerous for\b|\billegal for\b"
        r"|\bpromotes answer.copying\b|\bblocked at all\b|\billegal for minors\b"
        r"|\bcontains.*illegal\b|\bcontains.*dangerous\b|\bcontains.*explicit\b"
        r"|\bcontains.*adult\b|\bcontains.*extremist\b|\bcontains.*gambling\b", re.I)

    def analyze(self, page_text: str, nlacp_sentences: List[str],
                url: str, interest: str) -> dict:
        combined   = (page_text + " " + " ".join(nlacp_sentences)).lower()
        nlacp_text = " ".join(nlacp_sentences).lower()
        danger_score, danger_triggers = 0, []
        for signal, weight in self._DANGER.items():
            if signal in combined:
                danger_score = max(danger_score, weight)
                danger_triggers.append(signal)
        safety_score = sum(w for s, w in self._SAFE.items() if s in combined)
        acc_flags = []
        for signal, label in self._ACCESSIBILITY.items():
            if signal in combined and label not in acc_flags:
                acc_flags.append(label)
        disability_accessible = len(acc_flags) >= 1
        explicit_deny = (bool(self._EXPLICIT_DENY.search(nlacp_text)) or
                         bool(self._EXPLICIT_DENY.search(combined[:2000])))
        if danger_score >= 7:
            decision, risk = "DENIED", "High"
            reason = f"Content analysis detected: {', '.join(danger_triggers[:3])}"
        elif explicit_deny and danger_score == 0:
            decision, risk = "DENIED", "Moderate"
            reason = "Policy sentences indicate restricted or inappropriate content"
        elif danger_score >= 4 or (danger_score >= 2 and safety_score < 3):
            decision, risk = "DENIED", "Moderate"
            reason = "Unmoderated or potentially inappropriate content detected"
        elif safety_score >= 3 or danger_score == 0:
            decision, risk = "ALLOWED", "Safe"
            reason = (f"Educational content confirmed ({', '.join(acc_flags[:2]) or 'standard layout'})"
                      if acc_flags else "Age-appropriate educational content verified")
        else:
            decision, risk = "ALLOWED", "Moderate"
            reason = "Mixed content; access permitted with supervision"
        return {
            "danger_score": danger_score, "safety_score": safety_score,
            "danger_triggers": danger_triggers, "explicit_deny_found": explicit_deny,
            "accessibility_flags": acc_flags, "disability_accessible": disability_accessible,
            "suggested_decision": decision, "risk_level": risk, "reason": reason,
        }


# =============================================================================
# POLICY SENTENCE BUILDER
# =============================================================================
_SOCIAL_PLATFORMS = {"reddit.com", "youtube.com", "pinterest.com", "chess.com/live"}

# All alternatives taken directly from "Recommended Alternatives" column – policy_output_v5.xlsx
_ALTERNATIVES_MAP = {
    "mathway.com":              ["https://www.khanacademy.org/math", "https://www.coolmathgames.com"],
    "gambling-math.com":        ["https://www.khanacademy.org/math"],
    "reddit.com/r/science":     ["https://www.pbslearningmedia.org", "https://kids.nationalgeographic.com"],
    "youtube.com/results?search_query=science":
                                ["https://www.pbslearningmedia.org", "https://www.khanacademy.org/science"],
    "webmd.com":                ["https://kids.nationalgeographic.com", "https://www.khanacademy.org/science/biology"],
    "wikipedia.org/wiki/Human_reproduction":
                                ["https://kids.nationalgeographic.com", "https://www.khanacademy.org/science/biology"],
    "nuclear-weapons.info":     ["https://phet.colorado.edu", "https://www.physicsclassroom.com"],
    "erowid.org":               ["https://www.rsc.org/learn-chemistry", "https://www.periodic-table.org"],
    "instructables.com":        ["https://www.rsc.org/learn-chemistry", "https://phet.colorado.edu"],
    "draftkings.com":           ["https://www.nfl.com", "https://www.olympic.org/education"],
    "betway.com":               ["https://www.nfl.com", "https://www.olympic.org/education"],
    "wattpad.com":              ["https://www.readworks.org", "https://www.gutenberg.org"],
    "reddit.com/r/books":       ["https://www.readworks.org", "https://www.commonlit.org"],
    "amazon.com":               ["https://www.gutenberg.org", "https://www.readworks.org"],
    "spotify.com":              ["https://www.musictheory.net", "https://www.musicca.com"],
    "youtube.com/music":        ["https://www.nyphilkids.org", "https://www.musictheory.net"],
    "deviantart.com":           ["https://www.artsonia.com", "https://www.tate.org.uk/kids"],
    "pinterest.com":            ["https://www.artsonia.com", "https://www.metmuseum.org/art/online-resources"],
    "stormfront.org":           ["https://www.ducksters.com/history", "https://www.britannica.com"],
    "hackforums.net":            ["https://code.org", "https://scratch.mit.edu"],
    "exploit-db.com":           ["https://code.org", "https://www.codecademy.com"],
    "youtube.com/results?search_query=arabic":
                                ["https://www.arabicpod101.com", "https://www.madinaharabic.com"],
    "reddit.com/r/learn_arabic":["https://www.arabicpod101.com", "https://arabic.desert-sky.net"],
    "chess.com/live":           ["https://www.chesskid.com", "https://lichess.org"],
    "chess.com/forum":          ["https://www.chesskid.com", "https://www.chess.com/learn-how-to-play-chess"],
    "reddit.com":               [],
    "youtube.com":              [],
}


class PolicySentenceBuilder:
    _SIXTEEN_PLUS_ALLOWED = {"High (11-12)"}

    def build(self, url: str, interest: str, school_level: str,
              grade_range: str, age_range: str, signals: dict) -> Tuple[str, List[str], bool]:
        url_path  = re.sub(r"https?://(?:www\.)?", "", url).rstrip("/")
        decision  = signals["suggested_decision"]
        risk      = signals["risk_level"]
        reason    = signals["reason"]
        dis_acc   = signals["disability_accessible"]
        acc_flags = signals["accessibility_flags"]
        is_social = any(sp in url_path for sp in _SOCIAL_PLATFORMS)
        if is_social:
            if school_level in self._SIXTEEN_PLUS_ALLOWED:
                decision, risk = "ALLOWED", "Safe"
                reason = "students aged 16 and above may use this platform responsibly"
            else:
                decision, risk = "DENIED", "Moderate"
                reason = "this social platform is not suitable for students under 16"
        alternatives: List[str] = []
        if decision == "DENIED":
            for key, alts in _ALTERNATIVES_MAP.items():
                if key in url_path:
                    alternatives = alts
                    break
        acc_note = f" It supports {', '.join(acc_flags[:3])}." if acc_flags else ""
        level_phrase = {
            "Elementary":   "Elementary school students (grades 1-5, ages 6-11)",
            "Middle":       "Middle school students (grades 6-8, ages 11-14)",
            "High (9-10)":  "High school students in grades 9-10 (ages 14-15)",
            "High (11-12)": "High school students in grades 11-12 (ages 16-18)",
        }.get(school_level, f"{school_level} students")
        if decision == "ALLOWED":
            sentence = (f"{level_phrase} interested in {interest} are allowed to access "
                        f"{url} because {reason}.{acc_note}")
        else:
            alts_str = f" Alternatives include {alternatives[0]}." if alternatives else ""
            sentence = (f"{level_phrase} interested in {interest} must not access "
                        f"{url} because {reason}.{alts_str}")
        return sentence, alternatives, dis_acc


# =============================================================================
# TARGET URLs – COMPLETE list from policy_output_v5.xlsx
# =============================================================================
E   = ("Elementary",   "1-5",  "6-11")
M   = ("Middle",       "6-8",  "11-14")
H9  = ("High (9-10)",  "9-10", "14-15")
H11 = ("High (11-12)", "11-12","16-18")

TARGET_URLS: List[Tuple] = [
    # MATH
    ("https://www.khanacademy.org/math",                      "Math",          [E, M, H9, H11]),
    ("https://www.coolmathgames.com",                         "Math",          [E, M, H9, H11]),
    ("https://mathworld.wolfram.com",                         "Math",          [M, H9, H11]),
    ("https://www.desmos.com/calculator",                     "Math",          [M, H9, H11]),
    ("https://www.wolframalpha.com",                          "Math",          [H9, H11]),
    ("https://brilliant.org/math",                            "Math",          [H9, H11]),
    ("https://www.mathway.com",                               "Math",          [E, M, H9, H11]),
    ("https://www.gambling-math.com",                         "Math",          [E, M, H9, H11]),
    # SCIENCE (Elementary only – Middle/High split into subjects)
    ("https://www.pbslearningmedia.org",                      "Science",       [E]),
    ("https://kids.nationalgeographic.com",                   "Science",       [E]),
    ("https://www.nasa.gov/learning-resources",               "Science",       [E]),
    ("https://www.khanacademy.org/science/biology",           "Science",       [E]),
    ("https://www.periodic-table.org",                        "Science",       [E]),
    ("https://www.reddit.com/r/science",                      "Science",       [E, M, H9]),
    ("https://www.youtube.com/results?search_query=science",  "Science",       [E]),
    ("https://www.webmd.com",                                 "Science",       [E]),
    ("https://www.nuclear-weapons.info",                      "Science",       [E]),
    ("https://www.erowid.org",                                "Science",       [E]),
    ("https://www.instructables.com/chemistry",               "Science",       [E]),
    ("https://www.wikipedia.org/wiki/Human_reproduction",     "Science",       [E]),
    # BIOLOGY
    ("https://www.khanacademy.org/science/biology",           "Biology",       [M, H9, H11]),
    ("https://www.biologycorner.com",                         "Biology",       [M, H9, H11]),
    ("https://www.ncbi.nlm.nih.gov/books/NBK21054",           "Biology",       [H9, H11]),
    ("https://www.hhmi.org/biointeractive",                   "Biology",       [H9, H11]),
    ("https://www.webmd.com",                                 "Biology",       [M, H9]),
    ("https://www.wikipedia.org/wiki/Human_reproduction",     "Biology",       [M]),
    # PHYSICS
    ("https://phet.colorado.edu",                             "Physics",       [M, H9, H11]),
    ("https://www.physicsclassroom.com",                      "Physics",       [M, H9, H11]),
    ("https://www.khanacademy.org/science/physics",           "Physics",       [H9, H11]),
    ("https://arxiv.org/physics",                             "Physics",       [H9, H11]),
    ("https://www.nuclear-weapons.info",                      "Physics",       [M, H9, H11]),
    # CHEMISTRY
    ("https://www.rsc.org/learn-chemistry",                   "Chemistry",     [M, H9, H11]),
    ("https://www.chemguide.co.uk",                           "Chemistry",     [H9, H11]),
    ("https://www.khanacademy.org/science/chemistry",         "Chemistry",     [M, H9, H11]),
    ("https://www.periodic-table.org",                        "Chemistry",     [M, H9, H11]),
    ("https://www.erowid.org",                                "Chemistry",     [M, H9, H11]),
    ("https://www.instructables.com/chemistry",               "Chemistry",     [M, H9, H11]),
    # SPORTS
    ("https://www.nfl.com",                                   "Sports",        [E, M, H9, H11]),
    ("https://www.olympic.org/education",                     "Sports",        [E, M, H9, H11]),
    ("https://www.pe4life.org",                               "Sports",        [E, M, H9, H11]),
    ("https://www.espn.com",                                  "Sports",        [M, H9, H11]),
    ("https://www.draftkings.com",                            "Sports",        [E, M, H9, H11]),
    ("https://www.betway.com",                                "Sports",        [E, M, H9, H11]),
    # READING (Elementary) / ENGLISH (Middle & High)
    ("https://www.readworks.org",                             "Reading",       [E]),
    ("https://www.readworks.org",                             "English",       [M, H9, H11]),
    ("https://www.gutenberg.org",                             "Reading",       [E]),
    ("https://www.gutenberg.org",                             "English",       [M, H9, H11]),
    ("https://www.storylineonline.net",                       "Reading",       [E]),
    ("https://www.storylineonline.net",                       "English",       [M]),
    ("https://www.commonlit.org",                             "English",       [M, H9, H11]),
    ("https://www.wattpad.com",                               "Reading",       [E]),
    ("https://www.wattpad.com",                               "English",       [M, H9, H11]),
    ("https://www.reddit.com/r/books",                        "Reading",       [E]),
    ("https://www.reddit.com/r/books",                        "English",       [M, H9, H11]),
    ("https://www.amazon.com/books",                          "Reading",       [E]),
    ("https://www.amazon.com/books",                          "English",       [M, H9, H11]),
    # MUSIC
    ("https://www.musictheory.net",                           "Music",         [E, M, H9, H11]),
    ("https://www.nyphilkids.org",                            "Music",         [E, M]),
    ("https://www.noteflight.com",                            "Music",         [M, H9, H11]),
    ("https://www.musicca.com",                               "Music",         [E, M, H9, H11]),
    ("https://www.spotify.com",                               "Music",         [E, M, H9, H11]),
    ("https://www.youtube.com/music",                         "Music",         [E, M, H9, H11]),
    # ART
    ("https://www.artsonia.com",                              "Art",           [E, M, H9, H11]),
    ("https://www.tate.org.uk/kids",                          "Art",           [E, M, H9, H11]),
    ("https://www.metmuseum.org/art/online-resources",        "Art",           [E, M, H9, H11]),
    ("https://www.deviantart.com",                            "Art",           [E, M, H9, H11]),
    ("https://www.pinterest.com",                             "Art",           [E, M, H9, H11]),
    # SOCIAL STUDIES (Elementary) / HISTORY (Middle & High)
    ("https://www.ducksters.com/history",                     "Social Studies",[E]),
    ("https://www.ducksters.com/history",                     "History",       [M, H9, H11]),
    ("https://www.history.com/topics",                        "History",       [M, H9, H11]),
    ("https://www.britannica.com",                            "Social Studies",[E]),
    ("https://www.britannica.com",                            "History",       [M, H9, H11]),
    ("https://www.smithsonianmag.com",                        "History",       [H9, H11]),
    ("https://www.stormfront.org",                            "Social Studies",[E]),
    ("https://www.stormfront.org",                            "History",       [M, H9, H11]),
    # COMPUTER
    ("https://code.org",                                      "Computer",      [E, M, H9, H11]),
    ("https://scratch.mit.edu",                               "Computer",      [E, M, H9, H11]),
    ("https://www.codecademy.com",                            "Computer",      [M, H9, H11]),
    ("https://www.github.com",                                "Computer",      [H9, H11]),
    ("https://www.hackforums.net",                            "Computer",      [E, M, H9, H11]),
    ("https://www.exploit-db.com",                            "Computer",      [E, M, H9, H11]),
    # ARABIC
    ("https://www.arabicpod101.com",                          "Arabic",        [E, M, H9, H11]),
    ("https://www.madinaharabic.com",                         "Arabic",        [E, M, H9, H11]),
    ("https://arabic.desert-sky.net",                         "Arabic",        [E, M, H9, H11]),
    ("https://www.learnarabiconline.com",                     "Arabic",        [E, M, H9, H11]),
    ("https://www.duolingo.com/course/ar",                    "Arabic",        [E, M, H9, H11]),
    ("https://www.youtube.com/results?search_query=arabic+lessons","Arabic",   [E, M, H9, H11]),
    ("https://www.reddit.com/r/learn_arabic",                 "Arabic",        [E, M, H9, H11]),
    # CHESS
    ("https://www.chesskid.com",                              "Chess",         [E, M, H9, H11]),
    ("https://www.chess.com/learn-how-to-play-chess",         "Chess",         [E, M, H9, H11]),
    ("https://lichess.org",                                   "Chess",         [E, M, H9, H11]),
    ("https://www.chess.com/play/computer",                   "Chess",         [E, M, H9, H11]),
    ("https://www.chessable.com",                             "Chess",         [H9, H11]),
    ("https://www.chess.com/live",                            "Chess",         [E, M, H9, H11]),
    ("https://www.chess.com/forum",                           "Chess",         [E, M, H9, H11]),
]


# =============================================================================
# DATA STRUCTURE
# =============================================================================
@dataclass
class AccessControlRule:
    rule_id: str; raw_sentence: str; subject: str; action: str
    resource_url: str; condition: str; decision: str; risk_level: str
    reason: str; school_level: str; grade_range: str; age_range: str
    interest: str; disability: str
    recommended_alternatives: List[str] = field(default_factory=list)


# =============================================================================
# STEP 1 – PRE-PROCESSING
# =============================================================================
class Preprocessor:
    def __init__(self):
        if PRODUCTION_MODE:
            import spacy
            from transformers import BertTokenizer
            log.info("Step 1 │ Loading spaCy + coreferee …")
            self.nlp = spacy.load("en_core_web_sm")
            try: self.nlp.add_pipe("coreferee")
            except Exception: log.warning("Step 1 │ coreferee unavailable")
            self.tokenizer = BertTokenizer.from_pretrained(BERT_CHECKPOINT)
        else:
            log.info("Step 1 │ [SIM] Regex + stub tokenizer loaded ✓")
            self.nlp = self.tokenizer = None

    def _resolve_coref_sim(self, text: str) -> str:
        sentences, last, resolved = re.split(r"(?<=[.!?])\s+", text), "Students", []
        for sent in sentences:
            for noun in ["High school students","Middle school students","Elementary school students","Students"]:
                if noun.lower() in sent.lower(): last = noun; break
            sent = re.sub(r"\bThey\b", last, sent)
            sent = re.sub(r"\bthey\b", last.lower(), sent)
            sent = re.sub(r"\bThem\b|\bthem\b", last.lower(), sent)
            resolved.append(sent)
        return " ".join(resolved)

    def _segment_sim(self, text: str) -> List[str]:
        text = re.sub(r"(https?://\S+)", lambda m: m.group().replace(".", "|||"), text)
        return [s.replace("|||", ".").strip()
                for s in re.split(r"(?<=[a-zA-Z0-9])[.!?]\s+(?=[A-Z])", text) if len(s) > 20]

    def _tokenize_sim(self, sentences: List[str]) -> dict:
        all_ids, all_masks = [], []
        for sent in sentences:
            tokens = re.findall(r"\w+", sent.lower())[:BERT_MAX_LEN]
            ids = [hash(t) % 30522 for t in tokens]
            mask = [1]*len(ids)
            ids  += [0]*(BERT_MAX_LEN-len(ids));  mask += [0]*(BERT_MAX_LEN-len(mask))
            all_ids.append(ids[:BERT_MAX_LEN]);    all_masks.append(mask[:BERT_MAX_LEN])
        return {"input_ids": all_ids, "attention_mask": all_masks}

    def run(self, raw_text: str):
        if PRODUCTION_MODE:
            doc = self.nlp(raw_text)
            sents = [s.text.strip() for s in doc.sents if len(s.text.strip()) > 15]
            enc   = self.tokenizer(sents, padding="max_length", truncation=True,
                                   max_length=BERT_MAX_LEN, return_tensors="pt")
        else:
            sents = self._segment_sim(self._resolve_coref_sim(raw_text))
            enc   = self._tokenize_sim(sents)
        log.debug(f"Step 1 │ {len(sents)} sentences ✓")
        return sents, enc


# =============================================================================
# STEP 2 – NLACP IDENTIFICATION
# =============================================================================
class NLACPIdentifier:
    POLICY_VERBS    = {"allow","deny","block","permit","grant","restrict","access","forbid",
                       "prohibit","authorize","must not","are allowed","are not allowed",
                       "may access","must","shall not","should not","cannot","can access"}
    POLICY_ENTITIES = {"student","elementary","middle","high school","grade","user","teacher",
                       "administrator","url","website","http","platform","content","resource","page","site"}
    NOISE_SIGNALS   = {"this document","section","the following","overview","introduction",
                       "purpose of","scope of","we define","as described","in summary","background"}

    def __init__(self):
        if PRODUCTION_MODE:
            import torch
            from transformers import BertForSequenceClassification
            self.model = BertForSequenceClassification.from_pretrained(
                BERT_CHECKPOINT, num_labels=2, ignore_mismatched_sizes=True)
            self.model.eval()
            self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
        else:
            self.model = None

    def _keyword_classify(self, sentences: List[str]) -> List[str]:
        return [s for s in sentences
                if (sum(2 for v in self.POLICY_VERBS if v in s.lower()) +
                    sum(1 for e in self.POLICY_ENTITIES if e in s.lower()) -
                    sum(2 for n in self.NOISE_SIGNALS if n in s.lower())) >= 2]

    def identify(self, sentences: List[str], encoding: dict) -> List[str]:
        if PRODUCTION_MODE:
            import torch
            with torch.no_grad():
                ids   = torch.tensor(encoding["input_ids"]).to(self.device)
                mask  = torch.tensor(encoding["attention_mask"]).to(self.device)
                probs = torch.softmax(self.model(input_ids=ids, attention_mask=mask).logits, dim=-1)
                result = [s for s, p in zip(sentences, probs[:, 1].cpu().numpy()) if p >= NLACP_THRESHOLD]
        else:
            result = self._keyword_classify(sentences)
        log.debug(f"Step 2 │ {len(result)}/{len(sentences)} NLACP ✓")
        return result


# =============================================================================
# STEP 3 – POLICY GENERATION
# =============================================================================
class PolicyGenerator:
    _URL_RE   = re.compile(r"https?://[^\s,]+")
    _LEVEL    = [
        (re.compile(r"elementary|grade [1-5]\b|ages 6|ages 7|ages 8|ages 9|ages 10|ages 11", re.I),
         "Elementary","1-5","6-11"),
        (re.compile(r"middle school|grade [6-8]\b|ages 1[1-4]", re.I),
         "Middle","6-8","11-14"),
        (re.compile(r"high school|grade [9]|grade 1[0-2]\b|ages 1[5-8]", re.I),
         "High","9-12","14-18"),
    ]
    _INTERESTS = {
        "math":"Math","science":"Science","biology":"Biology","physics":"Physics",
        "chemistry":"Chemistry","sport":"Sports","reading":"Reading","english":"English",
        "music":"Music","art":"Art","chess":"Chess","history":"History",
        "social studi":"Social Studies","computer":"Computer","arabic":"Arabic",
        "coding":"Computer","programming":"Computer",
    }
    _DISABILITIES = {
        "adhd":"ADHD","dyslexia":"Dyslexia","color blind":"Color Blindness",
        "colour blind":"Color Blindness","autism":"Autism","hearing":"Hearing Impairment",
    }
    _DENY_RE   = re.compile(
        r"\bmust not\b|\bnot allowed\b|\bdenied\b|\bblock\b|\bprohibit\b"
        r"|\bforbid\b|\binappropriate\b|\bdangerous\b|\billegal\b|\bnot access\b", re.I)
    _ALLOW_RE  = re.compile(
        r"\ballowed\b|\bpermitted?\b|\bmay access\b|\bcan access\b"
        r"|\bauthorized\b|\bencouraged\b|\bsuitable\b|\bgranted\b", re.I)
    _HIGH_RISK = re.compile(r"dangerous|illegal|weapon|drug|explicit|gambling|extremist|hacking", re.I)
    _MOD_RISK  = re.compile(r"unmoderated|adult|mature|social media|social platform|caution", re.I)

    def __init__(self, use_llm=False):
        self.use_llm = use_llm and PRODUCTION_MODE
        log.debug("Step 3 │ [SIM] Rule-based extractor loaded ✓" if not self.use_llm else
                 "Step 3 │ LLaMA mode active")

    def _rule_extract(self, sentence: str, rule_id: str) -> "AccessControlRule":
        lower    = sentence.lower()
        url_m    = self._URL_RE.search(sentence)
        url      = url_m.group().rstrip(".,)") if url_m else "URL not found"
        decision = "DENIED" if bool(self._DENY_RE.search(sentence)) else \
                   ("ALLOWED" if bool(self._ALLOW_RE.search(sentence)) else "DENIED")
        level, grades, ages = "Elementary","1-5","6-11"
        for pat, lv, gr, ag in self._LEVEL:
            if pat.search(sentence): level, grades, ages = lv, gr, ag; break
        interest   = next((v for k, v in self._INTERESTS.items() if k in lower), "General")
        disability = next((v for k, v in self._DISABILITIES.items() if k in lower), "N/A")
        risk = ("High" if self._HIGH_RISK.search(sentence) else
                "Moderate" if (self._MOD_RISK.search(sentence) or decision == "DENIED") else "Safe")
        rm     = re.search(r"because (.+?)(?:\.|$)", sentence, re.I)
        reason = (rm.group(1).strip().capitalize() if rm else
                  ("Restricted content detected" if decision == "DENIED"
                   else "Age-appropriate educational content approved"))
        alts = []
        if decision == "DENIED":
            for key, a in _ALTERNATIVES_MAP.items():
                if key in url: alts = a; break
        return AccessControlRule(
            rule_id=rule_id, raw_sentence=sentence, subject=f"{level} school student",
            action="access", resource_url=url,
            condition=f"school_level={level}, grades={grades}, interest={interest}, disability={disability}",
            decision=decision, risk_level=risk, reason=reason[:150],
            school_level=level, grade_range=grades, age_range=ages,
            interest=interest, disability=disability, recommended_alternatives=alts,
        )

    def generate(self, sentences: List[str]) -> List["AccessControlRule"]:
        rules = [self._rule_extract(s, f"POL-{i:04d}") for i, s in enumerate(sentences, 1)]
        log.debug(f"Step 3 │ {len(rules)} ACRs generated ✓")
        return rules


# =============================================================================
# ROW BUILDER
# =============================================================================
def _acr_to_row(rule: AccessControlRule, alternatives: List[str],
                disability_accessible: bool) -> dict:
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


# =============================================================================
# OUTPUT WRITER – PLAIN TEXT ONLY
# =============================================================================
def write_txt(rows: List[dict], path: str, meta: dict) -> None:
    """Write all policy rules + disability recommendations to a plain-text file.
    
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    allowed = sum(1 for r in rows if r["decision"] == "ALLOWED")
    denied  = len(rows) - allowed
    sep     = "─" * 80

    with open(path, "w", encoding="utf-8") as f:
        # ── Header ───────────────────────────────────────────────────────────
        f.write("=" * 80 + "\n")
        f.write("  AGentVLM – ACCESS CONTROL POLICY OUTPUT  (v5)\n")
        # f.write("  Pipeline  : Steps 0 → 1 → 2 → 3\n")
        # f.write("  Source    : policy_output_v5.xlsx\n")
        # f.write("=" * 80 + "\n\n")
        # f.write(f"  Mode          : {meta.get('mode','SIMULATION')}\n")
        # f.write(f"  Step 0        : {meta.get('step0','WebFetcher')}\n")
        # f.write(f"  Step 1        : {meta.get('step1','Preprocessor')}\n")
        # f.write(f"  Step 2        : {meta.get('step2','NLACPIdentifier')}\n")
        f.write(f"  Step 3        : {meta.get('step3','PolicyGenerator')}\n")
        f.write(f"\n  Total Rules   : {len(rows)}\n")
        f.write(f"  ALLOWED       : {allowed}\n")
        f.write(f"  DENIED        : {denied}\n")
        f.write(f"  Total URLs    : {len(TARGET_URLS)}\n")
        f.write("\n" + "=" * 80 + "\n")

        # ── Disability-specific URL recommendations ───────────────────────────
        f.write("\n\n  DISABILITY-SPECIFIC RECOMMENDED URLs\n")
        f.write("  Source: Disabilities sheet – policy_output_v5.xlsx\n")
        f.write("  " + sep + "\n")
        for disability, subjects in DISABILITY_RECOMMENDATIONS.items():
            f.write(f"\n  ┌─ {disability} ─\n")
            for subject, rec_list in subjects.items():
                if subject == "General":
                    continue
                f.write(f"  │  {subject}:\n")
                for rec_url, rec_reason in rec_list:
                    f.write(f"  │    • {rec_url}\n")
                    f.write(f"  │      Reason : {rec_reason}\n")
            f.write("  └" + "─" * 40 + "\n")

        f.write("\n\n" + "=" * 80 + "\n")

        # ── Access Control Rules ─────────────────────────────────────────────
        f.write("\n  ACCESS CONTROL RULES\n")
        f.write("  (Ordered: Elementary → Middle → High (9-10) → High (11-12))\n\n")
        current_level = None
        for row in rows:
            # Print a section header whenever the school level changes
            if row["school_level"] != current_level:
                current_level = row["school_level"]
                f.write(f"\n  {'─' * 30}\n")
                f.write(f"  ◆  {current_level.upper()} SCHOOL POLICIES\n")
                f.write(f"  {'─' * 30}\n\n")
            f.write(f"  Rule ID                  : {row['rule_id']}\n")
            f.write(f"  School Level             : {row['school_level']}\n")
            f.write(f"  Grade Range              : {row['grade_range']}\n")
            f.write(f"  Age Range                : {row['age_range']}\n")
            f.write(f"  Interest                 : {row['interest']}\n")
            f.write(f"  URL                      : {row['url']}\n")
            f.write(f"  Decision                 : {row['decision']}\n")
            f.write(f"  Risk Level               : {row['risk_level']}\n")
            f.write(f"  Reason                   : {row['reason']}\n")
            f.write(f"  Recommended Alternatives : {row['recommended_alternatives']}\n")
            f.write(f"  Disability Accessible    : {row['disability_accessible']}\n")
            if row.get("_fetch_source"):
                f.write(f"  Fetch Source             : {row['_fetch_source']}\n")
            if row.get("_nlacp_count") is not None:
                f.write(f"  NLACP Sentences          : {row['_nlacp_count']}\n")
            f.write("  " + sep + "\n\n")

    log.info(f"Output │ TXT → {path}")


# =============================================================================
# MAIN PIPELINE  [Steps 0 → 1 → 2 → 3]
# =============================================================================
def run_pipeline(use_url_mode: bool = True) -> List[dict]:
    mode_str = "PRODUCTION" if PRODUCTION_MODE else "SIMULATION"
    log.info("=" * 60)
    log.info("AGentVLM | Pipeline START  [Steps 0 → 1 → 2 → 3]")
    log.info(f"AGentVLM | Mode : {mode_str}")
    log.info("=" * 60)

    preprocessor = Preprocessor()
    identifier   = NLACPIdentifier()
    generator    = PolicyGenerator(use_llm=PRODUCTION_MODE)
    fetcher      = WebFetcher(max_chars=10000, max_retries=3, delay_range=(0.5, 1.5))
    analyzer     = ContentSignalAnalyzer()
    builder      = PolicySentenceBuilder()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    fetch_cache: dict       = {}
    rows:        List[dict] = []
    total                   = len(TARGET_URLS)

    # ── Step 0–3: collect all rows (temporary IDs, no console output per step) ──
    temp_counter = 1
    for idx, (url, interest, levels) in enumerate(TARGET_URLS, 1):
        # Step 0 – fetch (cached)
        if url not in fetch_cache:
            fr = fetcher.fetch_page_text_safe(url)
            fetch_cache[url] = fr
            if fr["source"] == "live":
                time.sleep(random.uniform(0.5, 1.5))
        else:
            fr = fetch_cache[url]

        # Step 1
        sents, enc = preprocessor.run(fr["text"])
        # Step 2
        nlacp = identifier.identify(sents, enc)
        # Content signals
        signals = analyzer.analyze(fr["text"], nlacp, url, interest)

        # Step 3 – one ACR per (url × school_level)
        for level_label, grade_range, age_range in levels:
            rid = f"POL-{temp_counter:04d}"
            policy_sentence, alternatives, dis_acc = builder.build(
                url=url, interest=interest, school_level=level_label,
                grade_range=grade_range, age_range=age_range, signals=signals,
            )
            acr = generator._rule_extract(policy_sentence, rid)
            acr.school_level = level_label
            acr.grade_range  = grade_range
            acr.age_range    = age_range
            acr.interest     = interest
            acr.resource_url = url
            row = _acr_to_row(acr, alternatives, dis_acc)
            row["_fetch_source"] = fr["source"]
            row["_nlacp_count"]  = len(nlacp)
            rows.append(row)
            temp_counter += 1

    # ── Sort rows chronologically by school level ─────────────────────────────
    _LEVEL_ORDER = {"Elementary": 0, "Middle": 1, "High (9-10)": 2, "High (11-12)": 3}
    rows.sort(key=lambda r: _LEVEL_ORDER.get(r["school_level"], 99))

    # ── Re-assign rule IDs in sorted order ───────────────────────────────────
    for i, row in enumerate(rows, 1):
        row["rule_id"] = f"POL-{i:04d}"

    # ── Log final decisions only, in sorted order ────────────────────────────
    log.info("-" * 60)
    log.info("AGentVLM | ACCESS CONTROL DECISIONS (Elementary → Middle → High)")
    log.info("-" * 60)
    for row in rows:
        alts = row["recommended_alternatives"] if row["recommended_alternatives"] != "N/A" else "N/A"
        log.info(
            f"{row['rule_id']} | {row['school_level']:12s} | {row['interest']:15s} | "
            f"Ages {row['age_range']:6s} | Grades {row['grade_range']:6s} | "
            f"{row['url']} | {row['decision']} | {alts}"
        )

    # ── Write plain-text output ───────────────────────────────────────────────
    txt_path = os.path.join(OUTPUT_DIR, "policy_output_agentvlm.txt")
    write_txt(rows, txt_path, meta={
        "mode":  mode_str,
        "step3": f"PolicyGenerator ({'LLaMA 3 LoRA' if PRODUCTION_MODE else 'rule extractor'})",
    })

    allowed = sum(1 for r in rows if r["decision"] == "ALLOWED")
    denied  = len(rows) - allowed
    log.info("=" * 60)
    log.info(f"AGentVLM | DONE | {len(rows)} rules | ALLOWED={allowed} | DENIED={denied}")
    log.info(f"AGentVLM | Output → {txt_path}")
    log.info("=" * 60)
    return rows


if __name__ == "__main__":
    run_pipeline(use_url_mode=True)