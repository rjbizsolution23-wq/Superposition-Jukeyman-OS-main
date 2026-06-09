# c:\Users\DELL\Downloads\Superposition-Jukeyman-OS-main\supreme_video_creator.py — AI Video System & Hugging Face Integrator
import os
import sys
import json
import time
import argparse
import requests
import subprocess
from PIL import Image

# Setup Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUPREME_OPERATOR_DIR = os.path.join(BASE_DIR, "SUPREME-OPERATOR")
MEDIA_DIR = os.path.join(SUPREME_OPERATOR_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

def load_hf_token():
    """Load Hugging Face Token from env files or environment variables."""
    env_path = os.path.join(SUPREME_OPERATOR_DIR, ".env.local")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("HUGGINGFACE_TOKEN="):
                    return line.strip().split("=", 1)[1].strip('"').strip("'")
    return os.environ.get("HUGGINGFACE_TOKEN")

HF_TOKEN = load_hf_token()

# Default Models
TTS_MODEL = "facebook/mms-tts-eng"
IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"
WHISPER_MODEL = "openai/whisper-large-v3"

def query_hf_api(endpoint, payload, binary=False):
    """General function to call Hugging Face Serverless API with token validation."""
    if not HF_TOKEN:
        print(f"Skipping HF API call to {endpoint}: No HUGGINGFACE_TOKEN configured.")
        return None
        
    url = f"https://router.huggingface.co/hf-inference/models/{endpoint}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    max_retries = 3
    wait_time = 5
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                return response.content if binary else response.json()
            elif response.status_code == 401:
                print(f"Hugging Face API returned 401 Unauthorized (Expired or invalid token). Please check your HF token.")
                return None
            elif response.status_code == 503:
                print(f"Hugging Face model {endpoint} is loading. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
                wait_time *= 1.5
            else:
                print(f"Hugging Face API returned error status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"Exception during Hugging Face API call to {endpoint}: {e}")
            time.sleep(2)
            
    return None

def generate_voiceover(text, index):
    """Generate audio voiceover from narration text using Hugging Face TTS."""
    print(f"Generating voiceover for Scene {index}...")
    output_path = os.path.join(MEDIA_DIR, f"scene_{index}_voice.flac")
    
    payload = {"inputs": text}
    content = query_hf_api(TTS_MODEL, payload, binary=True)
    
    if content:
        with open(output_path, "wb") as f:
            f.write(content)
        print(f"Voiceover generated successfully: {output_path}")
        return output_path
    else:
        print(f"Failed to generate voiceover for Scene {index}.")
        return None

def generate_visual(prompt, index):
    """Generate slide image from visual prompt using Hugging Face Text-to-Image."""
    print(f"Generating image for Scene {index}...")
    output_path = os.path.join(MEDIA_DIR, f"scene_{index}_visual.png")
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "width": 1024,
            "height": 576
        }
    }
    content = query_hf_api(IMAGE_MODEL, payload, binary=True)
    
    if content:
        with open(output_path, "wb") as f:
            f.write(content)
        print(f"Visual generated successfully: {output_path}")
        return output_path
    else:
        print(f"Failed to generate visual for Scene {index}.")
        return None

def get_audio_duration(file_path):
    """Extract audio duration using ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", file_path
        ]
        output = subprocess.check_output(cmd, text=True).strip()
        return float(output)
    except Exception as e:
        print(f"Error checking duration for {file_path}: {e}")
        return 5.0

def transcribe_audio_to_srt(audio_path, output_srt_path):
    """Transcribe audio narration track and write out a synchronized SRT subtitle file."""
    if not HF_TOKEN:
        print("Skipping Whisper transcription: HUGGINGFACE_TOKEN not set.")
        return False
        
    print("Transcribing master narration audio to generate subtitles...")
    url = f"https://router.huggingface.co/hf-inference/models/{WHISPER_MODEL}"
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "audio/flac" if audio_path.endswith(".flac") else "audio/mpeg"
    }
    
    try:
        with open(audio_path, "rb") as f:
            data = f.read()
        
        response = requests.post(
            f"{url}?return_timestamps=true", 
            headers=headers, 
            data=data, 
            timeout=90
        )
        
        if response.status_code == 200:
            result = response.json()
            chunks = result.get("chunks", [])
            write_srt_file(chunks, output_srt_path)
            print(f"SRT Subtitles generated successfully at: {output_srt_path}")
            return True
        else:
            print(f"Whisper API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Exception during Whisper transcription: {e}")
        
    return False

def format_srt_time(seconds):
    """Helper to format float seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def write_srt_file(chunks, srt_path):
    """Write parsed Whisper chunks into standard SRT format."""
    with open(srt_path, "w", encoding="utf-8") as f:
        for idx, chunk in enumerate(chunks, 1):
            timestamp = chunk.get("timestamp")
            text = chunk.get("text", "").strip()
            
            if timestamp and len(timestamp) == 2:
                start, end = timestamp[0], timestamp[1]
                if start is None:
                    start = 0.0
                if end is None:
                    end = start + 3.0
                    
                f.write(f"{idx}\n")
                f.write(f"{format_srt_time(start)} --> {format_srt_time(end)}\n")
                f.write(f"{text}\n\n")
            else:
                f.write(f"{idx}\n")
                f.write(f"{format_srt_time(idx * 4.0)} --> {format_srt_time((idx + 1) * 4.0 - 0.5)}\n")
                f.write(f"{text}\n\n")

def compile_video(storyboard, audio_track, srt_subtitles, output_video_path):
    """Stitch images and audio narration, then overlay subtitles via FFmpeg."""
    print("Stitching slides and audio...")
    
    input_txt_path = os.path.join(MEDIA_DIR, "video_input.txt")
    with open(input_txt_path, "w", encoding="utf-8") as f:
        for idx, scene in enumerate(storyboard):
            img_path = scene["visual_path"].replace("\\", "/")
            f.write(f"file '{img_path}'\n")
            f.write(f"duration {scene['duration']}\n")
        # Write the last slide once more for FFmpeg concat requirements
        last_img_path = storyboard[-1]["visual_path"].replace("\\", "/")
        f.write(f"file '{last_img_path}'\n")
        
    print(f"Generated concat map: {input_txt_path}")
    
    local_srt_name = "temp_subs.srt"
    local_srt_path = os.path.join(os.getcwd(), local_srt_name)
    import shutil
    shutil.copy2(srt_subtitles, local_srt_path)
    
    cmd = [
        "ffmpeg", "-y", "-nostdin",
        "-f", "concat",
        "-safe", "0",
        "-i", input_txt_path,
        "-i", audio_track,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-vf", f"subtitles={local_srt_name}",
        "-pix_fmt", "yuv420p",
        "-r", "25",
        "-c:a", "aac",
        "-shortest",
        output_video_path
    ]
    
    print("Compiling video track and overlaying subtitles with FFmpeg...")
    try:
        process = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, check=True)
        print("Video compilation successful!")
        print(f"Output saved to: {output_video_path}")
    except subprocess.CalledProcessError as e:
        print("FFmpeg failed with error:")
        print(e.stderr)
        raise e
    finally:
        if os.path.exists(local_srt_path):
            os.remove(local_srt_path)
        if os.path.exists(input_txt_path):
            os.remove(input_txt_path)

def create_video_from_script(script_path, output_path=None, assets_dir=None, pre_existing_audio=None):
    """Main pipeline execution with automated fallbacks for asset loading."""
    print(f"Reading script from: {script_path}")
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            storyboard = json.load(f)
    except Exception as e:
        print(f"Error loading script file: {e}")
        return
        
    print(f"Loaded script containing {len(storyboard)} scenes.")
    
    voice_files = []
    
    for idx, scene in enumerate(storyboard, 1):
        # 1. Visual Fallback Check
        visual_path = scene.get("visual_path")
        if not visual_path or not os.path.exists(visual_path):
            # Try generating via API
            generated = generate_visual(scene["visual_prompt"], idx)
            if generated:
                scene["visual_path"] = generated
            elif assets_dir and os.path.exists(assets_dir):
                # Fallback to local slide image if API fails
                img_name = f"{idx}.png"
                local_fallback = os.path.join(assets_dir, img_name)
                if os.path.exists(local_fallback):
                    print(f"Fallback: Using local asset slide {local_fallback}")
                    scene["visual_path"] = local_fallback
                else:
                    # Generic placeholder
                    print(f"Warning: Visual for scene {idx} missing. Copying a dummy visual...")
                    dummy_visual = os.path.join(MEDIA_DIR, f"scene_{idx}_visual.png")
                    img = Image.new("RGB", (1024, 576), color=(20, 20, 20))
                    img.save(dummy_visual)
                    scene["visual_path"] = dummy_visual
            else:
                # Create dummy black slide
                dummy_visual = os.path.join(MEDIA_DIR, f"scene_{idx}_visual.png")
                img = Image.new("RGB", (1024, 576), color=(20, 20, 20))
                img.save(dummy_visual)
                scene["visual_path"] = dummy_visual
                
        # 2. Voiceover Fallback Check
        voice_path = scene.get("voice_path")
        if not voice_path or not os.path.exists(voice_path):
            # Try generating via API
            generated = generate_voiceover(scene["text"], idx)
            if generated:
                scene["voice_path"] = generated
                duration = get_audio_duration(generated)
                scene["duration"] = duration
                voice_files.append(generated)
            else:
                # If generation failed and we have pre_existing_audio, we'll split the single audio track instead
                print(f"Warning: Failed to generate TTS for scene {idx}.")
                scene["voice_path"] = None
        else:
            duration = get_audio_duration(voice_path)
            scene["duration"] = duration
            voice_files.append(voice_path)

    # Compile Narration Audio Track
    master_audio_path = os.path.join(MEDIA_DIR, "master_narration.flac")
    use_pre_existing_narration = False
    
    if len(voice_files) == len(storyboard):
        # We successfully have all individual narration tracks, stitch them
        print("Combining scene audios into master track...")
        concat_cmd = ["ffmpeg", "-y", "-nostdin"]
        for vf in voice_files:
            concat_cmd.extend(["-i", vf])
        
        filter_complex = "".join(f"[{i}:a]" for i in range(len(voice_files)))
        filter_complex += f"concat=n={len(voice_files)}:v=0:a=1[aout]"
        
        concat_cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[aout]",
            master_audio_path
        ])
        
        try:
            subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, check=True)
            print(f"Master narration track compiled: {master_audio_path}")
        except Exception as e:
            print(f"Error concatenating audio files: {e}")
            return
    elif pre_existing_audio and os.path.exists(pre_existing_audio):
        # Fall back to using the pre-existing master audio track
        print(f"Fallback: Using pre-existing master audio track: {pre_existing_audio}")
        master_audio_path = pre_existing_audio
        use_pre_existing_narration = True
        
        # Calculate scene durations by distributing the total audio duration
        total_duration = get_audio_duration(pre_existing_audio)
        duration_per_scene = total_duration / len(storyboard)
        print(f"Distributing total duration of {total_duration:.2f}s equally ({duration_per_scene:.2f}s per slide)")
        for scene in storyboard:
            scene["duration"] = duration_per_scene
    else:
        print("Error: Could not synthesize narration audio and no pre-existing audio track was supplied.")
        sys.exit(1)
        
    # Step 3: Generate Subtitles via Whisper
    srt_path = os.path.join(MEDIA_DIR, "subtitles.srt")
    transcribe_success = transcribe_audio_to_srt(master_audio_path, srt_path)
    
    if not transcribe_success:
        # Generate visual duration SRT
        print("Generating manual synchronized subtitles from script text and scene durations...")
        chunks = []
        current_time = 0.0
        for idx, scene in enumerate(storyboard, 1):
            chunks.append({
                "timestamp": [current_time, current_time + scene["duration"]],
                "text": scene["text"]
            })
            current_time += scene["duration"]
        write_srt_file(chunks, srt_path)
        
    # Step 4: Stitch slides and audio together, burning subtitles
    final_output = output_path or os.path.join(MEDIA_DIR, "huggingface_video_system_output.mp4")
    compile_video(storyboard, master_audio_path, srt_path, final_output)
    
    # Save script progress with generated/mapped paths
    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(storyboard, f, indent=4)
        
    print(f"\n=======================================================")
    print(f"PROCESSED AI VIDEO SUCCESSFULLY!")
    print(f"Output Video Location: {final_output}")
    print(f"=======================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Supreme AI Video Creator System")
    parser.add_argument("--script", help="Path to storyboard script JSON", default=None)
    parser.add_argument("--output", help="Output path of compiled video file", default=None)
    parser.add_argument("--assets-dir", help="Directory containing pre-existing images/slides", default=None)
    parser.add_argument("--audio", help="Path to pre-existing narration audio track", default=None)
    args = parser.parse_args()

    # Determine default paths if not provided
    script_file = args.script or os.path.join(MEDIA_DIR, "financial_literacy_script.json")
    fallback_assets = args.assets_dir or r"C:\Users\DELL\Downloads\finacial det-20260529T221912Z-3-001\finacial det"
    fallback_audio = args.audio or os.path.join(fallback_assets, "FINANCIAL LITERACY BOSS TALK.mp3")

    # Create default script if it doesn't exist
    if not os.path.exists(script_file):
        sample_storyboard = [
            {
                "text": "Welcome to Financial Literacy Boss Talk, presented by RJ Business Solutions.",
                "visual_prompt": "A modern premium penthouse office, gold lines, screens displaying stock charts, photorealistic, 8k"
            },
            {
                "text": "Your credit score is the single most important number for building wealth.",
                "visual_prompt": "A beautiful gold credit card rotating in a dark elegant digital backdrop, hyper detailed, 3d render"
            },
            {
                "text": "Leverage your assets and master your cash flow to claim your financial freedom.",
                "visual_prompt": "An executive looking out at the city skyline from a luxury boardroom, cinematic lighting, professional"
            }
        ]
        with open(script_file, "w", encoding="utf-8") as f:
            json.dump(sample_storyboard, f, indent=4)
            
    create_video_from_script(
        script_path=script_file,
        output_path=args.output,
        assets_dir=fallback_assets,
        pre_existing_audio=fallback_audio
    )
