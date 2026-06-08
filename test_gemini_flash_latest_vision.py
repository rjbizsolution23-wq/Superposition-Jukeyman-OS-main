import os
import sys
import base64
import requests
from PIL import Image
from io import BytesIO

api_key = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
img_path = os.path.join(dir_path, "1.png")

with Image.open(img_path) as img:
    img.thumbnail((512, 512))
    buffered = BytesIO()
    img.convert("RGB").save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
headers = {"Content-Type": "application/json"}
payload = {
    "contents": [
        {
            "parts": [
                {"text": "Describe this slide image. Mention any prominent text, numbers, labels, or visual elements. Keep it to one short sentence."},
                {
                    "inlineData": {
                        "mimeType": "image/jpeg",
                        "data": img_str
                    }
                }
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
        print("Error:", response.text)
except Exception as e:
    print("Request failed:", e)
