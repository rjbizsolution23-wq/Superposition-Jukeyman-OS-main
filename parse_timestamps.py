import re

file_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det\video_breakdown_clean.txt"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Find all scenes
scenes = re.findall(r"(Scene \d+:.*?)(?=Scene \d+:|📍|\Z)", text, re.DOTALL)

print(f"Found {len(scenes)} scenes in the breakdown file:")
for i, scene in enumerate(scenes):
    # Extract timestamp
    ts_match = re.search(r"Timestamp:\s*(\d+:\d+)-(\d+:\d+)", scene)
    img_match = re.search(r"Image:\s*(\S+)", scene)
    lyric_match = re.search(r"Lyrics:\s*(.*?)(?=\s*Prompt:)", scene, re.DOTALL)
    
    if ts_match:
        start_str, end_str = ts_match.groups()
        # Convert start_str and end_str (format M:SS) to seconds
        def to_sec(s):
            parts = s.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            return int(parts[0])
            
        start = to_sec(start_str)
        end = to_sec(end_str)
        dur = end - start
        img = img_match.group(1) if img_match else "None"
        lyric = lyric_match.group(1).strip() if lyric_match else "None"
        print(f"{i+1}. Scene {i+1} | {start_str} - {end_str} ({dur}s) | Image: {img} | Lyrics: {lyric[:40]}")
    else:
        print(f"{i+1}. Scene {i+1} | No timestamp found!")
