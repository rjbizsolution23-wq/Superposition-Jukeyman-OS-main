import os
import requests

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

# Test gemini-2.0-flash
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
headers = {"Content-Type": "application/json"}
payload = {"contents": [{"parts": [{"text": "Say hello!"}]}]}

try:
    response = requests.post(url, headers=headers, json=payload)
    print("gemini-2.0-flash Status:", response.status_code)
    if response.status_code == 200:
        print("gemini-2.0-flash Success!")
    else:
        print("gemini-2.0-flash Error:", response.text)
except Exception as e:
    print("gemini-2.0-flash Request failed:", e)

# Test gemini-flash-latest
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
try:
    response = requests.post(url, headers=headers, json=payload)
    print("gemini-flash-latest Status:", response.status_code)
    if response.status_code == 200:
        print("gemini-flash-latest Success!")
    else:
        print("gemini-flash-latest Error:", response.text)
except Exception as e:
    print("gemini-flash-latest Request failed:", e)
