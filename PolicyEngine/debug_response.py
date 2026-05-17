#!/usr/bin/env python3
"""
Debug script to see the raw Gemini API response.
Shows exactly what the API is returning.
"""

import json
import requests
from server import build_optimized_prompt, fetch_page_text_safe

API_KEY = "AIzaSyDHAy8gDZ4UBXvsrS8_pV-Z4-k4h5oUEO4"

def test_url(url):
    """Test a single URL and print the raw response."""
    
    print(f"\n{'='*80}")
    print(f"Testing URL: {url}")
    print(f"{'='*80}\n")
    
    # Load policy document
    with open("policy_output_agentvlm.txt", "r", encoding="utf-8") as f:
        document_text = f.read()
    
    # Simple chunking
    chunks = [document_text[i:i+3000] for i in range(0, min(9000, len(document_text)), 3000)]
    
    # Fetch content
    content = fetch_page_text_safe(url)
    images = []
    video_paths = []
    
    # Build prompt
    prompt = build_optimized_prompt(url, chunks, content, images, video_paths)
    
    # Call API
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    headers = {'Content-Type': 'application/json'}
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": 2048
        }
    }
    
    print("📤 Sending request to Gemini API...\n")
    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    
    print(f"Status Code: {response.status_code}\n")
    
    if response.status_code != 200:
        print(f"❌ API Error:\n{response.text}\n")
        return
    
    try:
        json_response = response.json()
        result_text = json_response['candidates'][0]['content']['parts'][0]['text']
        
        print("📥 RAW API RESPONSE TEXT:")
        print("-" * 80)
        print(result_text)
        print("-" * 80)
        
        # Try to parse it
        print("\n🔍 Attempting to parse as JSON...\n")
        try:
            parsed = json.loads(result_text)
            print("✅ Successfully parsed as JSON!")
            print("\n📋 Parsed JSON structure:")
            print(json.dumps(parsed, indent=2)[:2000])  # First 2000 chars
            
            # Check accessibility_matrix
            if "accessibility_matrix" in parsed:
                print("\n✅ accessibility_matrix FOUND:")
                print(json.dumps(parsed["accessibility_matrix"], indent=2))
            else:
                print("\n❌ accessibility_matrix NOT FOUND in response")
                print("   Available keys:", list(parsed.keys()))
        
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {str(e)}")
            print(f"   (Response may not be valid JSON)")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}\n")
        print(f"Full response:\n{response.text}")

if __name__ == "__main__":
    # Test one URL
    test_url("https://www.pbslearningmedia.org")