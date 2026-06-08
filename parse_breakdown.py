import os
import glob
import sys

# Set standard output to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
pattern = os.path.join(dir_path, "*FINANCIAL LITERACY BOSS TALK - FULL V*")
files = glob.glob(pattern)

if not files:
    print("No breakdown file found!")
    sys.exit(1)

breakdown_file = files[0]
print("Found file:", breakdown_file)

with open(breakdown_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Write a clean txt file
clean_txt_path = os.path.join(dir_path, "video_breakdown_clean.txt")
with open(clean_txt_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Cleaned content written to {clean_txt_path}")
print("\n--- FIRST 2000 CHARACTERS ---")
print(content[:2000])
