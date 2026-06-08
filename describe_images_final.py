import os
import sys
import glob
import base64
import json
import time
import requests
from PIL import Image
from io import BytesIO

# 1. Detect working Google Gemini API key
api_keys = []
for k in ["GOOGLE_GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GOOGLE_API_KEY"]:
    val = os.environ.get(k)
    if val and val not in api_keys:
        api_keys.append(val)

working_key = None
for key in api_keys:
    # Test key with a simple request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": "test"}]}]}
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code in [200, 429, 503]:
            working_key = key
            print(f"Successfully verified working key: ...{key[-6:]} (status {response.status_code})")
            if response.status_code == 429:
                print("Key is working but rate-limited; sleeping 5 seconds...")
                time.sleep(5)
            break
        else:
            print(f"Key ...{key[-6:]} returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error testing key ...{key[-6:]}: {e}")

if not working_key:
    print("Could not find any working Google Gemini API key!")
    sys.exit(1)

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
images = sorted(glob.glob(os.path.join(dir_path, "*.png")), key=lambda x: int(os.path.basename(x).split(".")[0]))

# 2. Load cache
cache_path = os.path.join(dir_path, "image_descriptions.json")
results = {}
if os.path.exists(cache_path):
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        print(f"Loaded {len(results)} cached descriptions.")
    except Exception as e:
        print(f"Error loading cache: {e}")

print(f"Processing {len(images)} images...")

for img_path in images:
    name = os.path.basename(img_path)
    
    # Check if cached already and valid
    if name in results and results[name] and not results[name].startswith("Error") and not results[name].startswith("Failed"):
        print(f"{name}: [CACHED] {results[name]}")
        continue

    # Query Gemini Flash Latest
    max_retries = 5
    retry_delay = 10
    success = False
    
    try:
        with Image.open(img_path) as img:
            img.thumbnail((512, 512))
            buffered = BytesIO()
            img.convert("RGB").save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"Error preparing image {name}: {e}")
        continue
        
    for retry in range(max_retries):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={working_key}"
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
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                description = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean up any characters that might fail terminal encoding
                description = description.encode('ascii', 'ignore').decode('ascii')
                print(f"{name}: {description}")
                results[name] = description
                # Save immediately to preserve progress
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=4)
                success = True
                break
            elif response.status_code == 429 or response.status_code == 503:
                print(f"Status {response.status_code} for {name}. Retrying in {retry_delay}s... (Attempt {retry+1}/{max_retries})")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                print(f"Error status {response.status_code} for {name}: {response.text}")
                time.sleep(5)
        except Exception as e:
            print(f"Exception for {name}: {e}")
            time.sleep(5)
            
    if not success:
        print(f"Failed to analyze {name} after {max_retries} retries.")
        
    # Sleep 5 seconds between successful calls to avoid rate limits
    time.sleep(5)

print("All done!")
