import os
import gc
import uuid
import torch
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gpu_media_server")

# Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

app = FastAPI(
    title="RJ Business Solutions GPU Media Server",
    description="GPU-accelerated image, video generation and upscaling server utilising PyTorch and Diffusers (Fully Uncensored)",
    version="1.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for active models
active_pipelines = {
    "image": None,
    "video": None,
    "current_type": None,  # "image", "video" or None
    "current_model_id": None
}

class ImageRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    negative_prompt: Optional[str] = Field("", description="Negative prompt")
    engine: str = Field("flux", description="Model engine to use: 'flux' or 'sdxl'")
    width: int = Field(1024, description="Image width")
    height: int = Field(1024, description="Image height")
    steps: int = Field(4, description="Number of inference steps (Flux: 4, SDXL: 25-30)")
    guidance_scale: float = Field(0.0, description="Guidance scale (Flux uses 0.0 for schnell, SDXL uses 7.5)")
    seed: Optional[int] = Field(None, description="Random seed")

class VideoRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Prompt for text-to-video (CogVideo)")
    image_path: Optional[str] = Field(None, description="Local path to input image for image-to-video (SVD)")
    engine: str = Field("svd", description="Model engine to use: 'svd' or 'cogvideo'")
    steps: int = Field(25, description="Number of inference steps")
    fps: int = Field(6, description="Frames per second")
    motion_bucket_id: int = Field(127, description="Motion level for SVD (1-255)")
    noise_aug_strength: float = Field(0.02, description="Noise amount added for SVD")
    seed: Optional[int] = Field(None, description="Random seed")

class UpscaleRequest(BaseModel):
    image_path: str = Field(..., description="Local path to the image to upscale")
    prompt: Optional[str] = Field("", description="Optional prompt describing the image for guided upscaling")
    scale: int = Field(2, description="Upscaling scale factor (default 2)")
    steps: int = Field(20, description="Inference steps for upscaling (default 20)")

def clean_vram():
    """Run Python garbage collection and empty PyTorch CUDA cache."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
    logger.info("VRAM cleaned and CUDA cache emptied")

def unload_pipelines(category: str = "all"):
    """Unloads pipelines to free VRAM before loading a different model category."""
    global active_pipelines
    unloaded = False
    
    if category in ("all", "image") and active_pipelines["image"] is not None:
        logger.info(f"Unloading image pipeline: {active_pipelines['current_model_id']}")
        active_pipelines["image"] = None
        unloaded = True
        
    if category in ("all", "video") and active_pipelines["video"] is not None:
        logger.info(f"Unloading video pipeline: {active_pipelines['current_model_id']}")
        active_pipelines["video"] = None
        unloaded = True
        
    if unloaded:
        active_pipelines["current_type"] = None
        active_pipelines["current_model_id"] = None
        clean_vram()

@app.get("/status")
def get_status():
    """Retrieve system, GPU, VRAM and loaded model status."""
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
    """Text-to-image generator using Flux.1-schnell or Stable Diffusion XL."""
    global active_pipelines
    
    if not torch.cuda.is_available():
        raise HTTPException(status_code=500, detail="CUDA GPU is not available on this server")
        
    try:
        from diffusers import DiffusionPipeline
        
        # 1. Unload video pipelines if they are active to preserve VRAM
        if active_pipelines["current_type"] == "video":
            logger.info("Unloading video pipeline for image generation task")
            unload_pipelines("video")
            
        # 2. Check if correct image model is loaded
        model_id = (
            "black-forest-labs/FLUX.1-schnell" 
            if request.engine == "flux" 
            else "stabilityai/stable-diffusion-xl-base-1.0"
        )
        
        if active_pipelines["image"] is None or active_pipelines["current_model_id"] != model_id:
            unload_pipelines("image")
            logger.info(f"Loading image pipeline: {model_id}")
            
            # Use FP16 to fit T4 and standard GPUs
            if request.engine == "flux":
                active_pipelines["image"] = DiffusionPipeline.from_pretrained(
                    model_id, 
                    torch_dtype=torch.bfloat16
                )
            else:
                active_pipelines["image"] = DiffusionPipeline.from_pretrained(
                    model_id, 
                    torch_dtype=torch.float16,
                    variant="fp16",
                    use_safetensors=True
                )
                
            # Disable safety checker to make it fully uncensored
            if hasattr(active_pipelines["image"], "safety_checker") and active_pipelines["image"].safety_checker is not None:
                active_pipelines["image"].safety_checker = None
                logger.info("Safety checker disabled on image pipeline")
                
            # CPU Offloading / Memory savings optimizations
            active_pipelines["image"].enable_model_cpu_offload()
            active_pipelines["current_type"] = "image"
            active_pipelines["current_model_id"] = model_id
            
        generator = None
        if request.seed is not None:
            generator = torch.Generator("cuda").manual_seed(request.seed)
            
        logger.info(f"Generating image with prompt: {request.prompt[:100]}...")
        
        # 3. Generate image
        pipeline = active_pipelines["image"]
        
        if request.engine == "flux":
            image = pipeline(
                prompt=request.prompt,
                width=request.width,
                height=request.height,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale,
                generator=generator
            ).images[0]
        else:
            image = pipeline(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                width=request.width,
                height=request.height,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale or 7.5,
                generator=generator
            ).images[0]
            
        # Save output image
        filename = f"image_{uuid.uuid4().hex}.png"
        filepath = os.path.join(MEDIA_DIR, filename)
        image.save(filepath)
        
        logger.info(f"Image generated and saved to {filepath}")
        clean_vram()
        
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "url": f"/media/{filename}"
        }
        
    except Exception as e:
        logger.exception("Failed to generate image")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/generate/video")
async def generate_video(request: VideoRequest):
    """Video generator using CogVideoX (text-to-video) or Stable Video Diffusion (image-to-video)."""
    global active_pipelines
    
    if not torch.cuda.is_available():
        raise HTTPException(status_code=500, detail="CUDA GPU is not available on this server")
        
    try:
        from diffusers import StableVideoDiffusionPipeline, CogVideoXPipeline
        from diffusers.utils import load_image, export_to_video
        
        # 1. Unload image pipelines to free up memory
        if active_pipelines["current_type"] == "image":
            logger.info("Unloading image pipeline for video generation task")
            unload_pipelines("image")
            
        model_id = (
            "PKU-YuanGroup/CogVideoX-2b" 
            if request.engine == "cogvideo" 
            else "stabilityai/stable-video-diffusion-img2vid-xt"
        )
        
        # 2. Check and load the correct model pipeline
        if active_pipelines["video"] is None or active_pipelines["current_model_id"] != model_id:
            unload_pipelines("video")
            logger.info(f"Loading video pipeline: {model_id}")
            
            if request.engine == "cogvideo":
                active_pipelines["video"] = CogVideoXPipeline.from_pretrained(
                    model_id,
                    torch_dtype=torch.float16
                )
            else:
                active_pipelines["video"] = StableVideoDiffusionPipeline.from_pretrained(
                    model_id,
                    torch_dtype=torch.float16,
                    variant="fp16"
                )
                
            # Disable safety checker to make it fully uncensored
            if hasattr(active_pipelines["video"], "safety_checker") and active_pipelines["video"].safety_checker is not None:
                active_pipelines["video"].safety_checker = None
                logger.info("Safety checker disabled on video pipeline")
                
            active_pipelines["video"].enable_model_cpu_offload()
            active_pipelines["current_type"] = "video"
            active_pipelines["current_model_id"] = model_id
            
        generator = None
        if request.seed is not None:
            generator = torch.Generator("cuda").manual_seed(request.seed)
            
        filename = f"video_{uuid.uuid4().hex}.mp4"
        filepath = os.path.join(MEDIA_DIR, filename)
        pipeline = active_pipelines["video"]
        
        # 3. Generate video
        if request.engine == "cogvideo":
            if not request.prompt:
                raise HTTPException(status_code=400, detail="A text prompt is required for CogVideo")
                
            logger.info(f"Generating video with CogVideoX for prompt: {request.prompt[:100]}...")
            frames = pipeline(
                prompt=request.prompt,
                num_inference_steps=request.steps,
                num_frames=48,  # Default for CogVideoX-2b
                generator=generator
            ).frames[0]
            
            export_to_video(frames, filepath, fps=request.fps)
            
        else:
            # Stable Video Diffusion requires an input image
            if not request.image_path or not os.path.exists(request.image_path):
                raise HTTPException(status_code=400, detail="A valid local image path is required for Stable Video Diffusion (SVD)")
                
            logger.info(f"Generating video from image: {request.image_path}...")
            image = load_image(request.image_path)
            image = image.resize((1024, 576))  # SVD works best at 1024x576
            
            frames = pipeline(
                image,
                decode_chunk_size=8,
                num_inference_steps=request.steps,
                motion_bucket_id=request.motion_bucket_id,
                noise_aug_strength=request.noise_aug_strength,
                generator=generator
            ).frames[0]
            
            export_to_video(frames, filepath, fps=request.fps)
            
        logger.info(f"Video generated and saved to {filepath}")
        clean_vram()
        
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "url": f"/media/{filename}"
        }
        
    except Exception as e:
        logger.exception("Failed to generate video")
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@app.post("/upscale")
async def upscale_image(request: UpscaleRequest):
    """Upscale an image using Stable Diffusion Latent Upscaler or PIL Lanczos fallback (Fully Uncensored)."""
    global active_pipelines
    
    if not os.path.exists(request.image_path):
        raise HTTPException(status_code=400, detail="Input image path does not exist")
        
    try:
        input_img = Image.open(request.image_path)
        
        # If GPU is available, try using Stable Diffusion Latent Upscaler
        if torch.cuda.is_available():
            from diffusers import StableDiffusionLatentUpscalePipeline
            
            # Unload other models to save VRAM
            unload_pipelines()
            
            model_id = "stabilityai/sd-x2-latent-upscaler"
            logger.info(f"Loading latent upscaler: {model_id}")
            
            upscaler = StableDiffusionLatentUpscalePipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float16
            )
            upscaler.enable_model_cpu_offload()
            if hasattr(upscaler, "safety_checker") and upscaler.safety_checker is not None:
                upscaler.safety_checker = None
                logger.info("Safety checker disabled on upscaling pipeline")
                
            logger.info("Upscaling image via SD x2 Latent Upscaler...")
            # Upscaler expects prompt. If empty, use a generic high quality prompt
            prompt = request.prompt or "high quality, detailed, 4k"
            
            # Resize input image to be divisible by 64 (requirement of the latent upscaler)
            w, h = input_img.size
            new_w = (w // 64) * 64
            new_h = (h // 64) * 64
            if new_w != w or new_h != h:
                input_img = input_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
            upscaled_image = upscaler(
                prompt=prompt,
                image=input_img,
                num_inference_steps=request.steps,
                guidance_scale=6.0
            ).images[0]
            
            # Clean up upscaler to free VRAM
            del upscaler
            clean_vram()
        else:
            # CPU Fallback - High Quality Lanczos resize
            logger.info("CUDA not available. Using high-quality PIL Lanczos resize fallback.")
            w, h = input_img.size
            upscaled_image = input_img.resize((w * request.scale, h * request.scale), Image.Resampling.LANCZOS)
            
        filename = f"upscaled_{uuid.uuid4().hex}.png"
        filepath = os.path.join(MEDIA_DIR, filename)
        upscaled_image.save(filepath)
        
        logger.info(f"Upscaled image saved to {filepath}")
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "url": f"/media/{filename}"
        }
    except Exception as e:
        logger.exception("Failed to upscale image")
        raise HTTPException(status_code=500, detail=f"Upscaling failed: {str(e)}")

# Mount static files folder to serve generated media
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting GPU Media Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
