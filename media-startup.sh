#!/bin/bash
# Startup script for GCP GPU Media Server VM
# Installs NVIDIA drivers, PyTorch, Diffusers, and runs the FastAPI media server

echo "Starting GPU Media Server initialization..."

# 1. Install NVIDIA drivers and container toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-driver-535 nvidia-container-toolkit python3-pip python3-venv git curl

# 2. Setup directory
sudo mkdir -p /opt/gpu-media-server
sudo chown -R ubuntu:ubuntu /opt/gpu-media-server
cd /opt/gpu-media-server

# 3. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 4. Install PyTorch with CUDA 12.1 support and Diffusers library
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate sentencepiece fastapi uvicorn pydantic huggingface_hub pillow

# 5. Fetch Hugging Face Token from GCP VM Metadata
HF_TOKEN=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/hf-token)

# 6. Write the Python media server script
cat << 'EOF' > /opt/gpu-media-server/gpu_media_server.py
import os
import gc
import uuid
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

# Configure logging
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gpu_media_server")

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

app = FastAPI(title="GPU Media Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_pipelines = {
    "image": None,
    "video": None,
    "current_type": None,
    "current_model_id": None
}

class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = ""
    engine: str = "flux"
    width: int = 1024
    height: int = 1024
    steps: int = 4
    guidance_scale: float = 0.0
    seed: Optional[int] = None

class VideoRequest(BaseModel):
    prompt: Optional[str] = None
    image_path: Optional[str] = None
    engine: str = "svd"
    steps: int = 25
    fps: int = 6
    motion_bucket_id: int = 127
    noise_aug_strength: float = 0.02
    seed: Optional[int] = None

def clean_vram():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

def unload_pipelines(category: str = "all"):
    global active_pipelines
    unloaded = False
    if category in ("all", "image") and active_pipelines["image"] is not None:
        active_pipelines["image"] = None
        unloaded = True
    if category in ("all", "video") and active_pipelines["video"] is not None:
        active_pipelines["video"] = None
        unloaded = True
    if unloaded:
        active_pipelines["current_type"] = None
        active_pipelines["current_model_id"] = None
        clean_vram()

@app.get("/status")
def get_status():
    status = {
        "status": "online",
        "device": "cpu",
        "vram": {"total_mb": 0, "allocated_mb": 0, "free_mb": 0},
        "loaded_model_type": active_pipelines["current_type"],
        "loaded_model_id": active_pipelines["current_model_id"]
    }
    if torch.cuda.is_available():
        status["device"] = torch.cuda.get_device_name(0)
        total_mem = torch.cuda.get_device_properties(0).total_memory
        allocated_mem = torch.cuda.memory_allocated(0)
        status["vram"] = {
            "total_mb": int(total_mem / (1024 * 1024)),
            "allocated_mb": int(allocated_mem / (1024 * 1024)),
            "free_mb": int((total_mem - allocated_mem) / (1024 * 1024))
        }
    return JSONResponse(content=status)

@app.post("/generate/image")
async def generate_image(request: ImageRequest):
    global active_pipelines
    if not torch.cuda.is_available():
        raise HTTPException(status_code=500, detail="CUDA GPU not available")
    try:
        from diffusers import DiffusionPipeline
        if active_pipelines["current_type"] == "video":
            unload_pipelines("video")
            
        model_id = "black-forest-labs/FLUX.1-schnell" if request.engine == "flux" else "stabilityai/stable-diffusion-xl-base-1.0"
        
        if active_pipelines["image"] is None or active_pipelines["current_model_id"] != model_id:
            unload_pipelines("image")
            if request.engine == "flux":
                active_pipelines["image"] = DiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.bfloat16)
            else:
                active_pipelines["image"] = DiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
            active_pipelines["image"].enable_model_cpu_offload()
            active_pipelines["current_type"] = "image"
            active_pipelines["current_model_id"] = model_id
            
        generator = torch.Generator("cuda").manual_seed(request.seed) if request.seed is not None else None
        pipeline = active_pipelines["image"]
        
        if request.engine == "flux":
            image = pipeline(prompt=request.prompt, width=request.width, height=request.height, num_inference_steps=request.steps, guidance_scale=request.guidance_scale, generator=generator).images[0]
        else:
            image = pipeline(prompt=request.prompt, negative_prompt=request.negative_prompt, width=request.width, height=request.height, num_inference_steps=request.steps, guidance_scale=request.guidance_scale or 7.5, generator=generator).images[0]
            
        filename = f"image_{uuid.uuid4().hex}.png"
        filepath = os.path.join(MEDIA_DIR, filename)
        image.save(filepath)
        clean_vram()
        return {"success": True, "filename": filename, "filepath": filepath, "url": f"/media/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/generate/video")
async def generate_video(request: VideoRequest):
    global active_pipelines
    if not torch.cuda.is_available():
        raise HTTPException(status_code=500, detail="CUDA GPU not available")
    try:
        from diffusers import StableVideoDiffusionPipeline, CogVideoXPipeline
        from diffusers.utils import load_image, export_to_video
        if active_pipelines["current_type"] == "image":
            unload_pipelines("image")
            
        model_id = "PKU-YuanGroup/CogVideoX-2b" if request.engine == "cogvideo" else "stabilityai/stable-video-diffusion-img2vid-xt"
        
        if active_pipelines["video"] is None or active_pipelines["current_model_id"] != model_id:
            unload_pipelines("video")
            if request.engine == "cogvideo":
                active_pipelines["video"] = CogVideoXPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
            else:
                active_pipelines["video"] = StableVideoDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16, variant="fp16")
            active_pipelines["video"].enable_model_cpu_offload()
            active_pipelines["current_type"] = "video"
            active_pipelines["current_model_id"] = model_id
            
        generator = torch.Generator("cuda").manual_seed(request.seed) if request.seed is not None else None
        filename = f"video_{uuid.uuid4().hex}.mp4"
        filepath = os.path.join(MEDIA_DIR, filename)
        pipeline = active_pipelines["video"]
        
        if request.engine == "cogvideo":
            if not request.prompt:
                raise HTTPException(status_code=400, detail="Prompt required for CogVideo")
            frames = pipeline(prompt=request.prompt, num_inference_steps=request.steps, num_frames=48, generator=generator).frames[0]
            export_to_video(frames, filepath, fps=request.fps)
        else:
            if not request.image_path or not os.path.exists(request.image_path):
                raise HTTPException(status_code=400, detail="Valid image path required for SVD")
            image = load_image(request.image_path).resize((1024, 576))
            frames = pipeline(image, decode_chunk_size=8, num_inference_steps=request.steps, motion_bucket_id=request.motion_bucket_id, noise_aug_strength=request.noise_aug_strength, generator=generator).frames[0]
            export_to_video(frames, filepath, fps=request.fps)
            
        clean_vram()
        return {"success": True, "filename": filename, "filepath": filepath, "url": f"/media/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# 7. Pre-login to Hugging Face if token was supplied
if [ ! -z "$HF_TOKEN" ]; then
  activate-global-python-arg-complete 2>/dev/null || true
  huggingface-cli login --token "$HF_TOKEN" --add-to-git-credential
fi

# 8. Create systemd service
sudo tee /etc/systemd/system/gpu-media-server.service > /dev/null <<EOF
[Unit]
Description=FastAPI GPU Media Generation Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/gpu-media-server
ExecStart=/opt/gpu-media-server/venv/bin/python3 /opt/gpu-media-server/gpu_media_server.py
Restart=always
RestartSec=10
Environment=PORT=8000
Environment=HF_TOKEN=$HF_TOKEN

[Install]
WantedBy=multi-user.target
EOF

# 9. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable gpu-media-server
sudo systemctl start gpu-media-server

# 10. Open firewall rules if UFW is active
sudo ufw allow 8000/tcp 2>/dev/null || true

echo "GPU Media Server API initialized and started on port 8000!"
