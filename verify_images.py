from PIL import Image
import os
import glob

dir_path = r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
images = sorted(glob.glob(os.path.join(dir_path, "*.png")), key=lambda x: int(os.path.basename(x).split(".")[0]))

print(f"Found {len(images)} PNG files:")
for img_path in images:
    with Image.open(img_path) as img:
        print(f"File: {os.path.basename(img_path)} | Format: {img.format} | Size: {img.size} | Mode: {img.mode}")
