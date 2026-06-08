import os
import requests

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
try:
    response = requests.get(url)
    print("Status:", response.status_code)
    if response.status_code == 200:
        models = response.json()
        print("Available models:")
        for m in models.get("models", []):
            print(m["name"])
    else:
        print("Error:", response.text)
except Exception as e:
    print("Failed to request models:", e)
