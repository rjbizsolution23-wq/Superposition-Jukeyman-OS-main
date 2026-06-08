import os
import sys
import glob
import base64
import json
import time
import requests
from PIL import Image
from io import BytesIO

# Gather all unique Google/Gemini keys
keys = []
for k in ["GOOGLE_GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "GOOGLE_API_KEY"]:
    val = os.environ.get(k)
    if val and val not in keys:
        keys.append(val)

if not keys:
    print("No Google/Gemini API keys found!")
    sys.exit(1)

print(f"Loaded {len(keys)} unique Gemini API keys for rotation.")

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
images = sorted(glob.glob(os.path.join(dir_path, "*.png")), key=lambda x: int(os.path.basename(x).split(".")[0]))

# Load cache if exists
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

key_index = 0

for img_path in images:
    name = os.path.basename(img_path)
    
    # Skip if already cached and valid description
    if name in results and not results[name].startswith("Error"):
        print(f"{name}: [CACHED] {results[name]}")
        continue
        
    # Retry loop
    max_retries = 5
    retry_delay = 5
    success = False
    
    # Prepare image
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
        # Rotate key
        current_key = keys[key_index]
        key_index = (key_index + 1) % len(keys)
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={current_key}"
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
            if response.status_code == 200:
                result = response.json()
                description = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"{name}: {description}")
                results[name] = description
                success = True
                break
            elif response.status_code == 429:
                print(f"Key {key_index} rate limited (429) for {name}. Retrying in {retry_delay}s... (Attempt {retry+1}/{max_retries})")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                print(f"Error status {response.status_code} for {name}: {response.text}")
                # Try rotating key immediately on other errors
                time.sleep(1)
        except Exception as e:
            print(f"Exception for {name}: {e}")
            time.sleep(1)
            
    if not success:
        print(f"Failed to analyze {name} after {max_retries} retries.")
        
    # Small sleep to prevent quick rate limits even with rotation
    time.sleep(2)

# Save results
with open(cache_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4)
print(f"Descriptions saved to {cache_path}")
