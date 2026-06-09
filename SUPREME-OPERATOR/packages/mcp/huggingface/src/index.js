// packages/mcp/huggingface/src/index.ts — Local Hugging Face MCP Server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { HfInference } from "@huggingface/inference";
import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
// Load environment from .env.local
const BASE_DIR = path.resolve("c:/Users/DELL/Downloads/Superposition-Jukeyman-OS-main/SUPREME-OPERATOR");
dotenv.config({ path: path.join(BASE_DIR, ".env.local") });
const token = process.env.HUGGINGFACE_TOKEN;
if (!token) {
    console.error("Warning: HUGGINGFACE_TOKEN not found in .env.local. Some APIs may fail or be rate limited.");
}
const hf = new HfInference(token);
const server = new Server({ name: "supreme-operator-huggingface", version: "1.0.0" }, { capabilities: { tools: {} } });
// Argument Schemas
const SearchSchema = z.object({
    query: z.string(),
    type: z.enum(["models", "datasets", "spaces"]).default("models"),
    limit: z.number().default(5)
});
const GenerateImageSchema = z.object({
    prompt: z.string(),
    model: z.string().default("black-forest-labs/FLUX.1-schnell"),
    outputPath: z.string().optional()
});
const TextToSpeechSchema = z.object({
    prompt: z.string(),
    model: z.string().default("facebook/mms-tts-eng"),
    outputPath: z.string().optional()
});
const TranscribeSchema = z.object({
    audioPath: z.string(),
    model: z.string().default("openai/whisper-large-v3")
});
const DatasetViewerSchema = z.object({
    dataset: z.string(),
    command: z.enum(["info", "rows", "splits"]).default("info"),
    config: z.string().optional(),
    split: z.string().optional(),
    offset: z.number().optional(),
    limit: z.number().optional()
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "huggingface_search",
            description: "Search the Hugging Face Hub for models, datasets, or spaces.",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query" },
                    type: { type: "string", enum: ["models", "datasets", "spaces"], description: "Resource type to search" },
                    limit: { type: "number", description: "Maximum number of results to return (default: 5)" }
                },
                required: ["query"]
            }
        },
        {
            name: "huggingface_generate_image",
            description: "Generate an image from a text prompt using Hugging Face Serverless Inference.",
            inputSchema: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Description of the image to generate" },
                    model: { type: "string", description: "Hugging Face model ID (default: black-forest-labs/FLUX.1-schnell)" },
                    outputPath: { type: "string", description: "Local path to save the generated image" }
                },
                required: ["prompt"]
            }
        },
        {
            name: "huggingface_text_to_speech",
            description: "Generate speech narration from a text prompt using Hugging Face Serverless Inference.",
            inputSchema: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Text script to generate voiceover for" },
                    model: { type: "string", description: "Hugging Face model ID (default: facebook/mms-tts-eng)" },
                    outputPath: { type: "string", description: "Local path to save the generated audio file" }
                },
                required: ["prompt"]
            }
        },
        {
            name: "huggingface_transcribe",
            description: "Transcribe an audio file using OpenAI Whisper on Hugging Face Serverless Inference.",
            inputSchema: {
                type: "object",
                properties: {
                    audioPath: { type: "string", description: "Local absolute path to the audio file" },
                    model: { type: "string", description: "Hugging Face model ID (default: openai/whisper-large-v3)" }
                },
                required: ["audioPath"]
            }
        },
        {
            name: "huggingface_dataset_viewer",
            description: "Access details, splits, and rows from public Hugging Face datasets.",
            inputSchema: {
                type: "object",
                properties: {
                    dataset: { type: "string", description: "Dataset name (e.g. 'fka/awesome-chatgpt-prompts')" },
                    command: { type: "string", enum: ["info", "rows", "splits"], description: "Command to execute: info, rows, or splits" },
                    config: { type: "string", description: "Dataset config (optional, default: first available)" },
                    split: { type: "string", description: "Dataset split (optional, default: train)" },
                    offset: { type: "number", description: "Row offset for data rows command" },
                    limit: { type: "number", description: "Limit number of rows returned (max: 100)" }
                },
                required: ["dataset"]
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "huggingface_search": {
                const validated = SearchSchema.parse(args);
                const url = `https://huggingface.co/api/${validated.type}`;
                const response = await axios.get(url, {
                    params: { q: validated.query, limit: validated.limit },
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const items = response.data.map((item) => ({
                    id: item.id || item.modelId,
                    author: item.author,
                    likes: item.likes,
                    downloads: item.downloads,
                    tags: item.tags,
                    lastModified: item.lastModified
                }));
                return {
                    content: [{
                            type: "text",
                            text: `Search results for "${validated.query}" under ${validated.type}:\n\n${JSON.stringify(items, null, 2)}`
                        }]
                };
            }
            case "huggingface_generate_image": {
                const validated = GenerateImageSchema.parse(args);
                console.error(`Generating image with model ${validated.model} for prompt: ${validated.prompt}`);
                const response = await axios.post(`https://router.huggingface.co/hf-inference/models/${validated.model}`, { inputs: validated.prompt }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    responseType: "arraybuffer"
                });
                const buffer = Buffer.from(response.data);
                const mediaDir = path.join(BASE_DIR, "media");
                if (!fs.existsSync(mediaDir)) {
                    fs.mkdirSync(mediaDir, { recursive: true });
                }
                const destPath = validated.outputPath || path.join(mediaDir, `hf_image_${Date.now()}.png`);
                fs.writeFileSync(destPath, buffer);
                return {
                    content: [{
                            type: "text",
                            text: `Successfully generated image and saved to: ${destPath}`
                        }]
                };
            }
            case "huggingface_text_to_speech": {
                const validated = TextToSpeechSchema.parse(args);
                console.error(`Generating TTS with model ${validated.model} for text: ${validated.prompt}`);
                const response = await axios.post(`https://router.huggingface.co/hf-inference/models/${validated.model}`, { inputs: validated.prompt }, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    responseType: "arraybuffer"
                });
                const buffer = Buffer.from(response.data);
                const mediaDir = path.join(BASE_DIR, "media");
                if (!fs.existsSync(mediaDir)) {
                    fs.mkdirSync(mediaDir, { recursive: true });
                }
                const destPath = validated.outputPath || path.join(mediaDir, `hf_speech_${Date.now()}.flac`);
                fs.writeFileSync(destPath, buffer);
                return {
                    content: [{
                            type: "text",
                            text: `Successfully generated speech narration and saved to: ${destPath}`
                        }]
                };
            }
            case "huggingface_transcribe": {
                const validated = TranscribeSchema.parse(args);
                if (!fs.existsSync(validated.audioPath)) {
                    throw new Error(`Audio file not found at: ${validated.audioPath}`);
                }
                const audioData = fs.readFileSync(validated.audioPath);
                console.error(`Transcribing audio file: ${validated.audioPath} with model: ${validated.model}`);
                const response = await axios.post(`https://router.huggingface.co/hf-inference/models/${validated.model}`, audioData, {
                    headers: token ? {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "audio/flac"
                    } : {
                        "Content-Type": "audio/flac"
                    }
                });
                return {
                    content: [{
                            type: "text",
                            text: `Transcription:\n${response.data.text}`
                        }]
                };
            }
            case "huggingface_dataset_viewer": {
                const validated = DatasetViewerSchema.parse(args);
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                if (validated.command === "info") {
                    const url = `https://datasets-server.huggingface.co/info`;
                    const response = await axios.get(url, {
                        params: { dataset: validated.dataset },
                        headers
                    });
                    return {
                        content: [{
                                type: "text",
                                text: `Dataset Info for ${validated.dataset}:\n\n${JSON.stringify(response.data, null, 2)}`
                            }]
                    };
                }
                else if (validated.command === "splits") {
                    const url = `https://datasets-server.huggingface.co/splits`;
                    const response = await axios.get(url, {
                        params: { dataset: validated.dataset },
                        headers
                    });
                    return {
                        content: [{
                                type: "text",
                                text: `Dataset Splits for ${validated.dataset}:\n\n${JSON.stringify(response.data, null, 2)}`
                            }]
                    };
                }
                else {
                    // rows
                    const url = `https://datasets-server.huggingface.co/first-rows`;
                    const response = await axios.get(url, {
                        params: {
                            dataset: validated.dataset,
                            config: validated.config || "default",
                            split: validated.split || "train",
                            offset: validated.offset || 0,
                            limit: validated.limit || 10
                        },
                        headers
                    });
                    return {
                        content: [{
                                type: "text",
                                text: `Dataset Rows for ${validated.dataset}:\n\n${JSON.stringify(response.data, null, 2)}`
                            }]
                    };
                }
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        console.error(`Error in Hugging Face tool execution:`, error);
        return {
            content: [{
                    type: "text",
                    text: `Error: ${error.response?.data?.error || error.message || String(error)}`
                }],
            isError: true
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Hugging Face MCP Server running on stdio");
}
main().catch((err) => {
    console.error("Failed to run Hugging Face MCP Server:", err);
    process.exit(1);
});
