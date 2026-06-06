// packages/mcp/vertex-ai/src/index.ts — Vertex AI + Gemini MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModelServiceClient } from "@google-cloud/aiplatform";
const server = new Server({ name: "supreme-operator-vertex-ai", version: "1.0.0" }, { capabilities: { tools: {} } });
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyCTXGSxVwmRjvuJ0Xno57WpFKNRmrlq-EE");
const modelServiceClient = new ModelServiceClient({ apiEndpoint: "us-central1-aiplatform.googleapis.com" });
const GeminiQueryArgsSchema = z.object({
    prompt: z.string(),
    model: z.enum(["gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro"]).default("gemini-3.1-pro-preview"),
});
const VertexDeployArgsSchema = z.object({
    modelName: z.string(),
    modelPath: z.string(),
    region: z.string().default("us-central1"),
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "gemini_query",
            description: "Query Gemini AI models for reasoning and generation",
            inputSchema: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Query or prompt" },
                    model: { type: "string", enum: ["gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro"], description: "Model to use" }
                },
                required: ["prompt"]
            }
        },
        {
            name: "vertex_deploy",
            description: "Deploy model to Vertex AI for inference",
            inputSchema: {
                type: "object",
                properties: {
                    modelName: { type: "string", description: "Model name" },
                    modelPath: { type: "string", description: "Path to model artifacts" },
                    region: { type: "string", description: "GCP region" }
                },
                required: ["modelName", "modelPath"]
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "gemini_query": {
                const validated = GeminiQueryArgsSchema.parse(args);
                const model = genAI.getGenerativeModel({ model: validated.model });
                const result = await model.generateContent(validated.prompt);
                const response = await result.response;
                return { content: [{ type: "text", text: response.text() }] };
            }
            case "vertex_deploy": {
                const validated = VertexDeployArgsSchema.parse(args);
                const parent = `projects/596791791098/locations/${validated.region}`;
                const [operation] = await modelServiceClient.uploadModel({
                    parent,
                    model: {
                        displayName: validated.modelName,
                        artifactUri: validated.modelPath,
                        containerSpec: {
                            imageUri: "gcr.io/cloud-aiplatform/prediction/tf2-cpu.2-12:latest",
                        },
                    },
                });
                const [response] = await operation.promise();
                return { content: [{ type: "text", text: `Model deployed: ${response.model}` }] };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Vertex AI + Gemini MCP server running...");
}
main().catch(console.error);
