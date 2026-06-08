import os
import shutil
import subprocess
from PIL import Image

# Directories
src_dir = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
temp_dir = os.path.join(src_dir, "temp_images")
os.makedirs(temp_dir, exist_ok=True)

# Define target dimensions (matching all other landscape slides)
target_w, target_h = 2752, 1536

print("Processing images...")

# 1. Scale and pad 27.png (portrait) to 2752x1536 (landscape)
port_img_path = os.path.join(src_dir, "27.png")
padded_port_path = os.path.join(temp_dir, "27_padded.png")

try:
    with Image.open(port_img_path) as img:
        # Scale to match height 1536
        scale_ratio = target_h / img.height
        new_w = int(img.width * scale_ratio)
        img_resized = img.resize((new_w, target_h), Image.Resampling.LANCZOS)
        
        # Create black canvas and paste the resized image in center
        canvas = Image.new("RGB", (target_w, target_h), (0, 0, 0))
        paste_x = (target_w - new_w) // 2
        canvas.paste(img_resized, (paste_x, 0))
        canvas.save(padded_port_path, "PNG")
        print(f"Padded portrait image saved to {padded_port_path}")
except Exception as e:
    print(f"Error padding 27.png: {e}")

# 2. Copy other landscape images to temp directory
for i in range(1, 30):
    if i == 17:
        continue
    if i == 27:
        continue
    src_file = os.path.join(src_dir, f"{i}.png")
    dst_file = os.path.join(temp_dir, f"{i}.png")
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)

# Copy 1.png and 7.png for reuse in Chorus 2
shutil.copy2(os.path.join(src_dir, "1.png"), os.path.join(temp_dir, "1_reuse.png"))
shutil.copy2(os.path.join(src_dir, "7.png"), os.path.join(temp_dir, "7_reuse.png"))

# 3. Create mapping and input.txt for FFmpeg
scenes = [
    {"image": "1.png", "duration": 8.0},
    {"image": "2.png", "duration": 7.0},
    {"image": "3.png", "duration": 7.0},
    {"image": "4.png", "duration": 7.0},
    {"image": "5.png", "duration": 8.0},
    {"image": "6.png", "duration": 8.0},
    {"image": "7.png", "duration": 10.0},
    {"image": "8.png", "duration": 10.0},
    {"image": "9.png", "duration": 8.0},
    {"image": "10.png", "duration": 7.0},
    {"image": "11.png", "duration": 7.0},
    {"image": "12.png", "duration": 8.0},
    {"image": "1_reuse.png", "duration": 10.0}, # Scene 13: boss_with_car_main_shot.jpg
    {"image": "7_reuse.png", "duration": 10.0}, # Scene 14: iridescent_rolls_royce.jpg
    {"image": "13.png", "duration": 8.0},
    {"image": "14.png", "duration": 7.0},
    {"image": "15.png", "duration": 7.0},
    {"image": "16.png", "duration": 8.0},
    {"image": "18.png", "duration": 12.0},
    {"image": "19.png", "duration": 13.0},
    {"image": "20.png", "duration": 7.0},
    {"image": "21.png", "duration": 8.0},
    {"image": "22.png", "duration": 7.0},
    {"image": "23.png", "duration": 8.0},
    {"image": "24.png", "duration": 15.0},
    {"image": "25.png", "duration": 10.0},
    {"image": "26.png", "duration": 10.0},
    {"image": "27_padded.png", "duration": 15.0},
    {"image": "28.png", "duration": 10.0},
    {"image": "29.png", "duration": 10.0 + 51.4}, # Stretch final slide to 61.4s to cover remaining audio
]

input_txt_path = os.path.join(src_dir, "input.txt")
with open(input_txt_path, "w", encoding="utf-8") as f:
    for scene in scenes:
        img_abs_path = os.path.join(temp_dir, scene["image"])
        escaped_path = img_abs_path.replace("\\", "/").replace("'", "'\\''")
        f.write(f"file '{escaped_path}'\n")
        f.write(f"duration {scene['duration']}\n")
    last_img_path = os.path.join(temp_dir, scenes[-1]["image"]).replace("\\", "/").replace("'", "'\\''")
    f.write(f"file '{last_img_path}'\n")

print(f"Generated input.txt at {input_txt_path}")

# 4. Compile with FFmpeg
audio_path = os.path.join(src_dir, "FINANCIAL LITERACY BOSS TALK.mp3")
output_path = os.path.join(src_dir, "financial_literacy_boss_talk.mp4")

# FFmpeg command optimized with -preset ultrafast
cmd = [
    "ffmpeg", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", input_txt_path,
    "-i", audio_path,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p",
    "-r", "25",
    "-c:a", "aac",
    "-shortest",
    output_path
]

print("Compiling video with FFmpeg (ultrafast preset)...")
try:
    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    print("Video compilation successful!")
    print(f"Output saved to {output_path}")
except subprocess.CalledProcessError as e:
    print("FFmpeg failed with error:")
    print(e.stderr)
except Exception as e:
    print(f"An error occurred: {e}")
