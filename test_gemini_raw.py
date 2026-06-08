import os
import sys
import requests

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("No Gemini API key found!")
    sys.exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
headers = {"Content-Type": "application/json"}
payload = {
    "contents": [
        {
            "parts": [
                {"text": "Say hello!"}
            ]
        }
    ]
}

try:
    response = requests.post(url, headers=headers, json=payload)
    print("Status:", response.status_code)
    if response.status_code == 200:
        result = response.json()
        print("Response:", result["candidates"][0]["content"]["parts"][0]["text"].strip())
    else:
        print("Error response:", response.text)
except Exception as e:
    print("Request failed:", e)
