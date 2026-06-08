<div align="center">
<img src="https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg" alt="RJ Business Solutions" width="320"/>

# Superposition Jukeyman OS & Video Pipeline
### Built by **RJ Business Solutions** | Architected by **Rick Jefferson**

📍 1342 NM 333, Tijeras, New Mexico 87059 | 🌐 [rickjeffersonsolutions.com](https://rickjeffersonsolutions.com)
</div>

---

# 🎬 Financial Literacy Video Pipeline

This repository hosts utility scripts for automatically inspecting slide images, mapping them to storyboard scenes, managing API rate limits, and compiling high-resolution synchronized media assets.

## 🛠️ Main Utilities

### 1. `describe_images_final.py`
A cache-aware slide analysis utility that uses the Google Gemini Flash API to:
* Validate local Google API credentials.
* Generate and store concise text/visual summaries for slide files.
* Prevent API rate limits (respects free-tier RPM ceilings).

### 2. `build_video.py`
The final compilation engine that handles:
* Dimension validation and automatic horizontal pillarbox padding of portrait slides (e.g. `27.png`).
* Audio synchronization matching scene timestamps exactly to the audio timeline.
* Generating optimized FFmpeg video packages using the `ultrafast` preset for high-resolution 2.7K output.

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.12+ and FFmpeg installed on your path.

```bash
pip install pillow requests openai
```

### Running the Video Compiler
To run the automated builder and produce the final synchronized video file:
```bash
python build_video.py
```
The output video will be generated directly at `C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det\financial_literacy_boss_talk.mp4`.
