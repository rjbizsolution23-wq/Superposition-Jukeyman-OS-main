import os
import glob
import base64
import json
from PIL import Image
from io import BytesIO
from openai import OpenAI

# Initialize the client. By default, it will look for OPENAI_API_KEY env var
client = OpenAI()

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
images = sorted(glob.glob(os.path.join(dir_path, "*.png")), key=lambda x: int(os.path.basename(x).split(".")[0]))

print(f"Found {len(images)} images. Analyzing with OpenAI vision model...")

results = {}

for img_path in images:
    name = os.path.basename(img_path)
    try:
        # Load and resize image to keep it lightweight (max 512px)
        with Image.open(img_path) as img:
            img.thumbnail((512, 512))
            buffered = BytesIO()
            img.convert("RGB").save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # Call OpenAI vision api
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this slide image. Mention any prominent text, numbers, labels, or visual elements. Keep it to one short sentence."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_str}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=80
        )
        description = response.choices[0].message.content.strip()
        print(f"{name}: {description}")
        results[name] = description
    except Exception as e:
        print(f"Error analyzing {name}: {e}")

# Save results to a file
output_path = os.path.join(dir_path, "image_descriptions.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4)
print(f"Descriptions saved to {output_path}")
