#!/usr/bin/env python3
"""
Quick diagnostic script to test if your Gemini API key is working.
Run: python test_api_key.py
"""

import requests
import json
import sys

# Your new API key from Google Cloud
API_KEY = "AIzaSyDHAy8gDZ4UBXvsrS8_pV-Z4-k4h5oUEO4"

def test_api_key():
    """Test the API key with a simple request."""
    
    print("\n" + "="*80)
    print("🔍 TESTING GEMINI API KEY")
    print("="*80)
    print(f"\n📝 API Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"🔗 Using v1beta endpoint (JSON mode supported)")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={API_KEY}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Say 'API Key Works!' in exactly 3 words."
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": 100
        }
    }
    
    print("\n📤 Sending test request...")
    print(f"   Endpoint: {url[:60]}...{url[-20:]}")
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ HTTP 200 OK — API Key is VALID!\n")
            
            try:
                data = response.json()
                result_text = data['candidates'][0]['content']['parts'][0]['text']
                print(f"✨ API Response: {result_text}\n")
                print("="*80)
                print("🎉 SUCCESS! Your API key works. You can run the tests now.")
                print("="*80 + "\n")
                return True
                
            except (KeyError, IndexError) as e:
                print(f"⚠️  Response parse error: {str(e)}")
                print(f"   Full response: {response.text[:500]}\n")
                return False
        
        else:
            print(f"❌ HTTP {response.status_code} — API Key FAILED\n")
            print(f"📋 Error Response:")
            print(f"   {response.text}\n")
            
            # Diagnose the error
            if "API_KEY_INVALID" in response.text:
                print("❌ DIAGNOSIS: API Key is invalid or disabled.")
                print("   → Generate a new key at: https://console.cloud.google.com/apis/credentials")
                print("   → Make sure the 'Generative Language API' is enabled in your project")
            elif "PERMISSION_DENIED" in response.text:
                print("❌ DIAGNOSIS: API key doesn't have permission to use Generative Language API.")
                print("   → Go to APIs & Services → Enable 'Generative Language API'")
            elif "RESOURCE_EXHAUSTED" in response.text:
                print("⚠️  DIAGNOSIS: Rate limit exceeded or quota exceeded.")
                print("   → Wait a moment and try again")
            
            print()
            return False
    
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: Request took too long (>30s)")
        print("   Check your internet connection and try again.\n")
        return False
    
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {str(e)}\n")
        return False

if __name__ == "__main__":
    success = test_api_key()
    sys.exit(0 if success else 1)