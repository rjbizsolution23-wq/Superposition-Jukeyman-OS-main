import os
import sys
from openai import OpenAI

# Try various Gemini/Google keys
api_key = os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("No Gemini API key found!")
    sys.exit(1)

print("Attempting to call Gemini API via OpenAI-compatible endpoint...")
try:
    client = OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=api_key
    )
    response = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[
            {"role": "user", "content": "Say hello!"}
        ],
        max_tokens=10
    )
    print("Success! Gemini responded:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error calling Gemini: {e}")
