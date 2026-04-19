# server.py
import os
import json
import time
import re
import random
import asyncio
import requests
import faiss
import numpy as np
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from fastapi import FastAPI
import uvicorn
import nest_asyncio
from yt_dlp import YoutubeDL
from tqdm import tqdm
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from PIL import Image
from io import BytesIO
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
import google.genai as genai
from pypdf import PdfReader
# ------------------------------
# CONFIG
# ------------------------------
SAVE_DIR = "./videos"
REPORT_PATH = "./video_fetch_report.jsonl"
os.makedirs(SAVE_DIR, exist_ok=True)

# Gemini API setup
# genai.configure(api_key="AIzaSyCBxwgPtihA3Xd6yw550aP55E_kt47b-nU")
# model = genai.GenerativeModel("gemini-2.5-flash")
client=genai.Client(api_key="AIzaSyCSKKQ4JhR0__9JQ_aM72PJ24rx5ArKWTs")


# Apply nest_asyncio for environments like Jupyter or Colab (optional)
nest_asyncio.apply()

# ------------------------------
# HELPERS
# ------------------------------
def load_pdf(path):
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text, chunk_size=800, overlap=150):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def embed_chunks_safe(chunks, batch_size=50):
    all_embeddings = []

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]

        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch
        )
        time.sleep(60)

        all_embeddings.extend([e.values for e in response.embeddings])
        print(f"Processed {i+batch_size} of {len(chunks)} chunks")

    return all_embeddings

def retrieve(query,index,chunks, top_k=3):
    # Embed query using NEW SDK syntax
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=query
    )

    query_embedding = response.embeddings[0].values
    query_vector = np.array([query_embedding]).astype("float32")

    # Search FAISS
    distances, indices = index.search(query_vector, top_k)

    retrieved_chunks = [chunks[i] for i in indices[0]]
    return retrieved_chunks

def trim_video(source, seconds=8):
    """Trim video to first N seconds to limit size."""
    import subprocess
    if not source or not os.path.exists(source):
        return source
    base, ext = os.path.splitext(source)
    out = f"{base}_trim{seconds}s.mp4"
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", source, "-t", str(seconds),
        "-r", "1", "-vf", "scale=480:-1",
        "-c:v", "libx264", "-preset", "veryfast", "-an",
        out
    ]
    try:
        subprocess.run(cmd, check=True)
        try:
            os.remove(source)
        except: pass
        return out
    except Exception:
        return source

def download_with_ytdlp(url, prefix):
    opts = {
        "outtmpl": os.path.join(SAVE_DIR, f"{prefix}_%(title).80s.%(ext)s"),
        "format": "mp4/best",
        "quiet": True,
        "noplaylist": True,
        "no_warnings": True,
    }
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filepath = ydl.prepare_filename(info)
            if not os.path.exists(filepath):
                base = os.path.splitext(filepath)[0]
                for f in os.listdir(SAVE_DIR):
                    if f.startswith(os.path.basename(base)):
                        filepath = os.path.join(SAVE_DIR, f)
                        break
            trimmed = trim_video(filepath)
            return trimmed
    except Exception as e:
        return f"yt_dlp_error: {e}"

async def download_http_with_retries(session, src, save_path, attempts=2, timeout=25):
    for attempt in range(1, attempts+1):
        try:
            async with session.get(src, timeout=timeout) as r:
                status = r.status
                content_type = r.headers.get("content-type","").lower()
                if status in (200,206) and "video" in content_type:
                    with open(save_path, "wb") as f:
                        async for chunk in r.content.iter_chunked(8192):
                            f.write(chunk)
                    return {"ok": True, "path": save_path, "status": status}
                else:
                    return {"ok": False, "status": status, "content_type": content_type}
        except Exception as e:
            if attempt == attempts:
                return {"ok": False, "error": str(e)}
            await asyncio.sleep(1)
    return {"ok": False, "error":"unknown"}

# ------------------------------
# VIDEO FETCHER
# ------------------------------
async def fetch_videos_dynamic_async(url, limit=3, trim_seconds=8):
    result = {"url": url, "found": [], "errors": []}
    domain = urlparse(url).netloc.replace(".", "_") or "site"
    discovered = set()
    initial_lower = url.lower()
    if any(k in initial_lower for k in ("youtube.com", "youtu.be", "vimeo.com")):
        discovered.add(url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width":1280,"height":720})
        page.on("response", lambda resp: discovered.add(resp.url) if "video" in (resp.headers.get("content-type") or "").lower() else None)

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(4)
        except PlaywrightTimeout:
            result["errors"].append("timeout")
        except Exception as e:
            result["errors"].append(str(e))
        finally:
            await browser.close()
    # For brevity, we will use yt-dlp only for known platforms
    for src in discovered:
        lower = src.lower()
        status = {"src": src}
        if any(k in lower for k in ("youtube.com", "youtu.be", "vimeo.com")):
            status["method"] = "yt_dlp"
            saved = download_with_ytdlp(src, domain)
            status["saved"] = saved
            status["ok"] = os.path.exists(saved) if isinstance(saved,str) else False
        else:
            status["ok"] = False
            status["reason"] = "unsupported"
        result["found"].append(status)
    with open(REPORT_PATH,"a") as f:
        f.write(json.dumps(result)+"\n")
    return result

async def run_batch(urls):
    all_results = []
    for url in tqdm(urls):
        try:
            result = await fetch_videos_dynamic_async(url, limit=2, trim_seconds=8)
            all_results.append(result)
        except Exception as e:
            all_results.append({"url": url, "found": [], "errors":[str(e)]})
        await asyncio.sleep(random.uniform(2,5))
    return all_results

# ------------------------------
# PAGE FETCHING
# ------------------------------
def fetch_page_text_safe(url, max_retries=3, delay_range=(2,5)):
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection": "keep-alive"
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script","style","noscript"]):
                tag.decompose()
            return " ".join(soup.stripped_strings)[:15000]
        except:
            time.sleep(random.uniform(*delay_range))
    return f"ERROR: Could not fetch {url}"

async def fetch_images_for_llm(url: str) -> list:
    detected_images = set()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            html_content = await page.content()
            soup = BeautifulSoup(html_content, 'html.parser')
            for img in soup.find_all('img'):
                src = img.get('src')
                data_src = img.get('data-src')
                if src:
                    detected_images.add(urljoin(url, src))
                if data_src:
                    detected_images.add(urljoin(url, data_src))
        finally:
            await browser.close()
    return list(detected_images)

def parse_json(text):
    try:
        return json.loads(text)
    except:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                pass
    return {}

GRADE_ORDER = {
    "Grades 1–3": 1,
    "Grades 4–6": 2,
    "Grades 7–9": 3,
    "Grades 10–12": 4,
}

def get_grade_rank(g):
    if not g:
        return None
    return GRADE_ORDER.get(g.strip(), None)

def normalize_grade(g):
    if not g:
        return None

    g = str(g).strip()

    # Normalize "None"
    if g.lower() == "none":
        return None

    # Replace ANY dash (hyphen, en dash, em dash) with EN DASH
    g = g.replace("—", "–").replace("-", "–")

    # Remove extra spaces
    g = re.sub(r"\s+", " ", g)

    # Ensure format is exactly "Grades X–Y"
    # Fix cases like "Grades 4 – 6"
    g = g.replace(" – ", "–").replace(" –", "–").replace("– ", "–")

    # Sometimes frontend sends values like "4-6" → convert
    match = re.match(r"^(?:Grades )?(\d)\D+(\d)$", g)
    if match:
        a, b = match.groups()
        g = f"Grades {a}–{b}"

    return g




# ------------------------------
# FASTAPI APP
# ------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5500"] if you serve HTML via live server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_url(request: dict):

    # document_text = load_pdf('C:/Users/20109/OneDrive/Desktop/Masters/Demo/Website Genre Suitability Policy.txt')
    with open("C:/Users/20109/OneDrive/Desktop/Masters/Demo/Website Genre Suitability Policy.txt", "r") as f:
        document_text = f.read()
    chunks = chunk_text(document_text)
    print("Total Chunks:", len(chunks))
    print("Sample Chunk:", chunks[0])
    chunk_embeddings = embed_chunks_safe(chunks, batch_size=50)
    dimension = len(chunk_embeddings[0])
    index = faiss.IndexFlatL2(dimension)

    vectors = np.array(chunk_embeddings).astype("float32")
    index.add(vectors)

    print("FAISS index size:", index.ntotal)
    query="analyze age suitability for website"
    retrieved_chunks = retrieve(query,index, chunks)
    context = "\n\n".join(retrieved_chunks)
    url = request.get("url")
    student_grade = request.get("student_grade")   # << NEW
    print(f"🔎 Processing: {url} for student grade {student_grade}")

    content = fetch_page_text_safe(url)
    images = await fetch_images_for_llm(url)
    videos = await run_batch([url])
    video_saved_paths = [
        video_status.get("saved")
        for url_result in videos
        for video_status in url_result.get("found", [])
        if video_status.get("ok") is True and video_status.get("saved")
    ]
    prompt = f"""
    You are an AI system evaluating webpages for educational safety.

    Analyze answers based on data in this document this webpage and classify it according to:
    - Category: (Educational, Entertainment, News, Gaming, Social Media, Unsafe, Mixed, Other)
    - Age Restriction: [All Ages, 7+, 10+, 13+, 16+, 18+]
    - Educational Genre: [STEM, Language, History, Arts, Social Studies, Life Skills, Health, Other]
    - Suitability for School Use: [Suitable, Unsuitable]
    - Recommended Grade Level (if suitable): [Grades 1–3, 4–6, 7–9, 10–12]
    - Unsuitability Reasons (if unsuitable choose only 1): ["Inappropriate Content", "Unsafe or Malicious"]
    - AI Generated Website: ["AI Generated", "Real"]
    - Accessibility Score: [Accessible, Not Accessible]
    - Provide 2–3 safer educational alternative websites if the page is unsuitable.
    - Hugely consider the current webpage content when classifying.

    Important:
    - Evaluate this specific page’s content, not the general website.
    - Some educational content like (eg. war) should be allowed for specific grades as part of the history class.
    - Do NOT assume all pages from the same domain are safe.
    - Example: A Wikipedia page about World War II may be “Suitable”,
    but a Wikipedia page about suicide is “Unsuitable”.

    Return valid JSON only:
    {{
    "url": "{url}",
    "category": "...",
    "age_restriction": "...",
    "educational_genre": "...",
    "suitability_for_school": "...",
    "recommended_grade_level": "...",
    "unsuitability_reasons": "...",
    "ai_generated": "...",
    "accessibility_score": "...",
    "safe_alternatives": ["...", "...", "..."]
            "timing_breakdown": {{
            "content_understanding": 0.0,
            "topic_assessment": 0.0,
            "classification_decision": 0.0,
            "json_generation": 0.0,
            "total_estimated_time": 0.0
        }}
    }}

    Context:
    \"\"\"{context}\"\"\"

    Webpage content:
    \"\"\"{content}\"\"\"


    Images:
    \"\"\"{images}\"\"\"

    Videos:
    \"\"\"{video_saved_paths}\"\"\"


    """

    response = client.models.generate_content(model="gemini-2.5-flash",contents=prompt)
    print(response.text)
    result_text = response.text
    data = parse_json(result_text)
    model_grade = data.get("recommended_grade_level")
    student_grade_rank = get_grade_rank(normalize_grade(student_grade))
    model_grade_rank = get_grade_rank(normalize_grade(model_grade))
    print(student_grade)
    print(student_grade_rank)
    print(model_grade)
    print(model_grade_rank)

    # If either not recognized → just return original
    if student_grade_rank is None or model_grade_rank is None:
        return {"classification": data}
    if model_grade_rank > student_grade_rank:
        print("⚠ Grade Mismatch: Requesting safer alternatives…")

        # SECOND LLM CALL — ask for suitable alternatives
        refinement_prompt = f"""
        The webpage at {url} was deemed suitable for {model_grade}.
        But the student is in {student_grade}.

        Provide:
        - 1 sentence explaining why this page is not appropriate for this younger grade.
        - A list of 3 ALTERNATIVE WEBSITES suitable for {student_grade}.
        
        Return JSON only:
        {{
            "reason": "...",
            "alternatives": ["...", "...", "..."]
        }}
        """

        refine_resp = model.generate_content(refinement_prompt)
        refine_data = parse_json(refine_resp.text)
        data["suitability_for_school"] = "Unsuitable"
        data["unsuitability_reasons"] = "Age-inappropriate"
        data["safe_alternatives"] = refine_data.get("alternatives", [])
        data["recommended_grade_level"] = student_grade  # override to student grade

        # Keep reason for debugging
        data["age_mismatch_reason"] = refine_data.get("reason", "")
        
        print("⚠ Upgraded to UNSUITABLE due to grade mismatch.")
    return {"classification": data}


# ------------------------------
# RUN SERVER
# ------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
