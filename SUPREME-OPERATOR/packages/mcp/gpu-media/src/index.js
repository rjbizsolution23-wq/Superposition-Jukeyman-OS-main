// packages/mcp/gpu-media/src/index.ts — GPU Media MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import dotenv from "dotenv";
const BASE_DIR = path.resolve("c:/Users/DELL/Downloads/Superposition-Jukeyman-OS-main/SUPREME-OPERATOR");
const DEFAULT_MEDIA_DIR = path.join(BASE_DIR, "media");
// Load environment from .env.local in project root
dotenv.config({ path: path.join(BASE_DIR, ".env.local") });
const GPU_MEDIA_SERVER_URL = process.env.GPU_MEDIA_SERVER_URL || "http://localhost:8000";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
if (!fs.existsSync(DEFAULT_MEDIA_DIR)) {
    fs.mkdirSync(DEFAULT_MEDIA_DIR, { recursive: true });
}
// Initialize Replicate if token is available
let replicate = null;
if (REPLICATE_API_TOKEN) {
    replicate = new Replicate({
        auth: REPLICATE_API_TOKEN,
    });
}
const server = new Server({ name: "supreme-operator-gpu-media", version: "1.1.0" }, { capabilities: { tools: {} } });
// Helper function to download file
async function downloadFile(url, destPath) {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream"
    });
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}
// Helper to check if local GPU server is online
async function checkGpuServerOnline() {
    try {
        const response = await axios.get(`${GPU_MEDIA_SERVER_URL}/status`, { timeout: 2000 });
        return response.status === 200 && response.data.status === "online";
    }
    catch (error) {
        return false;
    }
}
// Helper to send Twilio SMS
async function sendSmsNotification(to, body) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.error("SMS notification skipped: Twilio credentials not configured in .env.local");
        return;
    }
    try {
        const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
        const params = new URLSearchParams({
            From: TWILIO_PHONE_NUMBER,
            To: to,
            Body: body
        });
        await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, params.toString(), {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        console.error(`SMS notification sent successfully to ${to}`);
    }
    catch (error) {
        console.error("Failed to send Twilio SMS notification:", error.response?.data || error.message);
    }
}
// Argument Validation Schemas
const GenerateImageSchema = z.object({
    prompt: z.string(),
    negativePrompt: z.string().optional(),
    engine: z.enum(["flux", "sdxl"]).default("flux"),
    width: z.number().default(1024),
    height: z.number().default(1024),
    steps: z.number().optional(),
    guidanceScale: z.number().optional(),
    seed: z.number().optional(),
    outputPath: z.string().optional(),
    notifyPhoneNumber: z.string().optional()
});
const GenerateVideoSchema = z.object({
    prompt: z.string().optional(),
    imagePath: z.string().optional(),
    engine: z.enum(["svd", "cogvideo"]).default("svd"),
    steps: z.number().optional(),
    fps: z.number().default(6),
    motionBucketId: z.number().default(127),
    noiseAugStrength: z.number().default(0.02),
    seed: z.number().optional(),
    outputPath: z.string().optional(),
    notifyPhoneNumber: z.string().optional()
});
const UpscaleImageSchema = z.object({
    imagePath: z.string(),
    prompt: z.string().optional(),
    scale: z.number().default(2),
    steps: z.number().default(20),
    outputPath: z.string().optional()
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "generate_image",
                description: "Generate an image using GPU-accelerated local server or Replicate API fallback (Fully Uncensored)",
                inputSchema: {
                    type: "object",
                    properties: {
                        prompt: { type: "string", description: "Text description of the image to generate" },
                        negativePrompt: { type: "string", description: "Things to exclude from the image (SDXL only)" },
                        engine: { type: "string", enum: ["flux", "sdxl"], description: "Model engine: flux (Schnell, 4 steps) or sdxl (Standard)" },
                        width: { type: "number", description: "Width of the image in pixels (default 1024)" },
                        height: { type: "number", description: "Height of the image in pixels (default 1024)" },
                        steps: { type: "number", description: "Number of steps (Flux default: 4, SDXL default: 25)" },
                        guidanceScale: { type: "number", description: "Classifier-free guidance scale (Flux Schnell: 0.0, SDXL: 7.5)" },
                        seed: { type: "number", description: "Random seed for reproducibility" },
                        outputPath: { type: "string", description: "Optional custom file path to save the generated image" },
                        notifyPhoneNumber: { type: "string", description: "Optional phone number to send an SMS to when completed" }
                    },
                    required: ["prompt"]
                }
            },
            {
                name: "generate_video",
                description: "Generate a video from text prompt (CogVideo) or input image (Stable Video Diffusion) (Fully Uncensored)",
                inputSchema: {
                    type: "object",
                    properties: {
                        prompt: { type: "string", description: "Text prompt for CogVideo video generation" },
                        imagePath: { type: "string", description: "Local image file path for Stable Video Diffusion (SVD) generation" },
                        engine: { type: "string", enum: ["svd", "cogvideo"], description: "Engine type: SVD (image-to-video) or CogVideo (text-to-video)" },
                        steps: { type: "number", description: "Number of inference steps (default 25)" },
                        fps: { type: "number", description: "Frames per second (default 6)" },
                        motionBucketId: { type: "number", description: "Motion bucket ID for SVD (1-255, default 127)" },
                        noiseAugStrength: { type: "number", description: "Noise augmentation strength for SVD (default 0.02)" },
                        seed: { type: "number", description: "Random seed for reproducibility" },
                        outputPath: { type: "string", description: "Optional custom file path to save the generated video" },
                        notifyPhoneNumber: { type: "string", description: "Optional phone number to send an SMS to when completed" }
                    }
                }
            },
            {
                name: "upscale_image",
                description: "Upscale/enhance an existing image using local GPU Latent Upscaler or high-quality Lanczos fallback",
                inputSchema: {
                    type: "object",
                    properties: {
                        imagePath: { type: "string", description: "Local file path to the image that needs upscaling" },
                        prompt: { type: "string", description: "Optional text description to guide the details of the upscaler" },
                        scale: { type: "number", description: "Factor to scale the image by (default 2)" },
                        steps: { type: "number", description: "Number of inference steps for details (default 20)" },
                        outputPath: { type: "string", description: "Optional custom path to save the upscaled image" }
                    },
                    required: ["imagePath"]
                }
            },
            {
                name: "get_gpu_media_status",
                description: "Get status of the GPU media generation server and API keys",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            }
        ]
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "get_gpu_media_status": {
                const online = await checkGpuServerOnline();
                let detail = { status: "offline" };
                if (online) {
                    const res = await axios.get(`${GPU_MEDIA_SERVER_URL}/status`);
                    detail = res.data;
                }
                return {
                    content: [{
                            type: "text",
                            text: `GPU Media Server Status:\nOnline: ${online}\nURL: ${GPU_MEDIA_SERVER_URL}\nReplicate Fallback Available: ${!!replicate}\nDetails:\n${JSON.stringify(detail, null, 2)}`
                        }]
                };
            }
            case "generate_image": {
                const validated = GenerateImageSchema.parse(args);
                const online = await checkGpuServerOnline();
                const filename = `image_${uuidName()}.png`;
                const destPath = validated.outputPath || path.join(DEFAULT_MEDIA_DIR, filename);
                let method = "";
                if (online) {
                    method = "GPU Media Server";
                    const reqBody = {
                        prompt: validated.prompt,
                        negative_prompt: validated.negativePrompt || "",
                        engine: validated.engine,
                        width: validated.width,
                        height: validated.height,
                        steps: validated.steps || (validated.engine === "flux" ? 4 : 25),
                        guidance_scale: validated.guidanceScale || (validated.engine === "flux" ? 0.0 : 7.5),
                        seed: validated.seed
                    };
                    const response = await axios.post(`${GPU_MEDIA_SERVER_URL}/generate/image`, reqBody, { timeout: 300000 });
                    const fileUrl = `${GPU_MEDIA_SERVER_URL}${response.data.url}`;
                    await downloadFile(fileUrl, destPath);
                }
                else {
                    method = "Replicate Fallback";
                    if (!replicate) {
                        throw new Error("GPU Media Server is offline and REPLICATE_API_TOKEN is not configured for fallback.");
                    }
                    const modelId = validated.engine === "flux"
                        ? "black-forest-labs/flux-schnell"
                        : "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
                    const inputParams = {
                        prompt: validated.prompt,
                        width: validated.width,
                        height: validated.height,
                        num_inference_steps: validated.steps || (validated.engine === "flux" ? 4 : 25),
                    };
                    if (validated.engine === "sdxl") {
                        inputParams.negative_prompt = validated.negativePrompt || "";
                        inputParams.guidance_scale = validated.guidanceScale || 7.5;
                    }
                    if (validated.seed !== undefined) {
                        inputParams.seed = validated.seed;
                    }
                    const output = await replicate.run(modelId, { input: inputParams });
                    const url = Array.isArray(output) ? output[0] : output;
                    if (!url)
                        throw new Error("No output URL returned from Replicate");
                    await downloadFile(url, destPath);
                }
                const msg = `Successfully generated image via ${method}!\nSaved to: ${destPath}\nPrompt: ${validated.prompt}`;
                if (validated.notifyPhoneNumber) {
                    await sendSmsNotification(validated.notifyPhoneNumber, `Your image generation is complete!\nSaved to: ${destPath}`);
                }
                return {
                    content: [{ type: "text", text: msg }]
                };
            }
            case "generate_video": {
                const validated = GenerateVideoSchema.parse(args);
                const online = await checkGpuServerOnline();
                const filename = `video_${uuidName()}.mp4`;
                const destPath = validated.outputPath || path.join(DEFAULT_MEDIA_DIR, filename);
                let method = "";
                if (online) {
                    method = "GPU Media Server";
                    const reqBody = {
                        prompt: validated.prompt,
                        image_path: validated.imagePath,
                        engine: validated.engine,
                        steps: validated.steps || 25,
                        fps: validated.fps,
                        motion_bucket_id: validated.motionBucketId,
                        noise_aug_strength: validated.noiseAugStrength,
                        seed: validated.seed
                    };
                    const response = await axios.post(`${GPU_MEDIA_SERVER_URL}/generate/video`, reqBody, { timeout: 600000 });
                    const fileUrl = `${GPU_MEDIA_SERVER_URL}${response.data.url}`;
                    await downloadFile(fileUrl, destPath);
                }
                else {
                    method = "Replicate Fallback";
                    if (!replicate) {
                        throw new Error("GPU Media Server is offline and REPLICATE_API_TOKEN is not configured for fallback.");
                    }
                    let output;
                    if (validated.engine === "cogvideo") {
                        if (!validated.prompt)
                            throw new Error("A prompt is required for CogVideo generation");
                        output = await replicate.run("lucataco/cogvideox-2b:11f32a76fdf24cf5b2b2ff715a3177651a5413158b4566f125a072120aa7f394", {
                            input: {
                                prompt: validated.prompt,
                                fps: validated.fps,
                                num_inference_steps: validated.steps || 25
                            }
                        });
                    }
                    else {
                        // SVD image-to-video
                        if (!validated.imagePath || !fs.existsSync(validated.imagePath)) {
                            throw new Error("A valid local image file path (imagePath) is required for Stable Video Diffusion (SVD)");
                        }
                        const fileData = fs.readFileSync(validated.imagePath);
                        const base64Image = `data:image/png;base64,${fileData.toString("base64")}`;
                        output = await replicate.run("stability-ai/stable-video-diffusion:3f0fb1c4b83b3f114d61847c22f1805381140e0cfbe8a867018d4cf77ce0397c", {
                            input: {
                                input_image: base64Image,
                                video_length: "14_frames_with_svd_xt",
                                motion_bucket_id: validated.motionBucketId,
                                fps: validated.fps,
                                noise_aug_strength: validated.noiseAugStrength
                            }
                        });
                    }
                    const url = Array.isArray(output) ? output[0] : output;
                    if (!url)
                        throw new Error("No output URL returned from Replicate");
                    await downloadFile(url, destPath);
                }
                const msg = `Successfully generated video via ${method}!\nSaved to: ${destPath}`;
                if (validated.notifyPhoneNumber) {
                    await sendSmsNotification(validated.notifyPhoneNumber, `Your video generation is complete!\nSaved to: ${destPath}`);
                }
                return {
                    content: [{ type: "text", text: msg }]
                };
            }
            case "upscale_image": {
                const validated = UpscaleImageSchema.parse(args);
                if (!fs.existsSync(validated.imagePath)) {
                    throw new Error(`Input image file not found at path: ${validated.imagePath}`);
                }
                const online = await checkGpuServerOnline();
                const filename = `upscaled_${uuidName()}.png`;
                const destPath = validated.outputPath || path.join(DEFAULT_MEDIA_DIR, filename);
                if (online) {
                    const reqBody = {
                        image_path: validated.imagePath,
                        prompt: validated.prompt || "",
                        scale: validated.scale,
                        steps: validated.steps
                    };
                    const response = await axios.post(`${GPU_MEDIA_SERVER_URL}/upscale`, reqBody, { timeout: 300000 });
                    const fileUrl = `${GPU_MEDIA_SERVER_URL}${response.data.url}`;
                    await downloadFile(fileUrl, destPath);
                }
                else {
                    // If offline, we can fall back to using replicate for upscaling or perform local high quality upscaling via Python
                    // We will throw a helpful message or use Replicate upscaler if available.
                    // Since we want this to work, we'll fall back to replicate's standard upscaler if replicate is available
                    if (!replicate) {
                        throw new Error("GPU Media Server is offline and REPLICATE_API_TOKEN is not configured for fallback.");
                    }
                    const fileData = fs.readFileSync(validated.imagePath);
                    const base64Image = `data:image/png;base64,${fileData.toString("base64")}`;
                    // Using standard RealESRGAN on Replicate
                    const output = await replicate.run("nightmareai/real-esrgan:f1c50cdf0bdf349fe1e3e70d4990e78f943a1cf9a5840d58eed8e5e1b608dae0", {
                        input: {
                            image: base64Image,
                            scale: validated.scale,
                            face_enhance: true
                        }
                    });
                    const url = Array.isArray(output) ? output[0] : output;
                    if (!url)
                        throw new Error("No output URL returned from Replicate upscaler");
                    await downloadFile(url, destPath);
                }
                return {
                    content: [{
                            type: "text",
                            text: `Successfully upscaled image!\nSaved to: ${destPath}\nScale Factor: ${validated.scale}x`
                        }]
                };
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error executing GPU media tool: ${error.message}` }],
            isError: true
        };
    }
});
function uuidName() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GPU Media MCP Server running on stdio");
}
main().catch(console.error);
