import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import Replicate from "replicate";
import { z } from "zod";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

if (!REPLICATE_API_TOKEN) {
  throw new Error("Replicate API token not configured");
}

class ReplicateMCPServer {
  private server: Server;
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });

    this.server = new Server({
      name: "replicate-mcp-server",
      version: "1.0.0",
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "run_model",
            description: "Run a Replicate model with input parameters",
            inputSchema: {
              type: "object",
              properties: {
                model: { type: "string", description: "Model identifier (e.g., 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b')", default: "meta/llama-2-70b-chat" },
                input: { type: "object", description: "Model input parameters" },
                webhook: { type: "string", description: "Webhook URL for async completion" },
                webhook_events_filter: { type: "array", items: { type: "string" }, description: "Events to trigger webhook" },
              },
              required: ["model", "input"],
            },
          },
          {
            name: "get_model_details",
            description: "Get details for a specific Replicate model",
            inputSchema: {
              type: "object",
              properties: {
                model: { type: "string", description: "Model identifier" },
              },
              required: ["model"],
            },
          },
          {
            name: "list_models",
            description: "List available Replicate models",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query for models" },
                owner: { type: "string", description: "Filter by owner" },
              },
            },
          },
          {
            name: "get_prediction",
            description: "Get the result of a prediction by ID",
            inputSchema: {
              type: "object",
              properties: {
                prediction_id: { type: "string", description: "Prediction ID" },
              },
              required: ["prediction_id"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "run_model":
            const runArgs = z.object({
              model: z.string(),
              input: z.record(z.any()),
              webhook: z.string().optional(),
              webhook_events_filter: z.array(z.string()).optional(),
            }).parse(args);

            const prediction = await this.replicate.predictions.create({
              version: runArgs.model,
              input: runArgs.input,
            });

            return {
              content: [
                {
                  type: "text",
                  text: `Model prediction started:\nID: ${prediction.id}\nStatus: ${prediction.status}\nModel: ${runArgs.model}`,
                },
              ],
            };

          case "get_model_details":
            const detailArgs = z.object({
              model: z.string(),
            }).parse(args);

            const [owner, name] = detailArgs.model.split('/');
            if (!owner || !name) throw new Error("Invalid model format");
            const model = await this.replicate.models.get(owner, name);

            return {
              content: [
                {
                  type: "text",
                  text: `Model details:\n${JSON.stringify(model, null, 2)}`,
                },
              ],
            };

          case "list_models":
            const listArgs = z.object({
              query: z.string().optional(),
              owner: z.string().optional(),
            }).parse(args);

            const models = await this.replicate.models.list();

            return {
              content: [
                {
                  type: "text",
                  text: `Models:\n${JSON.stringify(models, null, 2)}`,
                },
              ],
            };

          case "get_prediction":
            const predArgs = z.object({
              prediction_id: z.string(),
            }).parse(args);

            const predictionResult = await this.replicate.predictions.get(predArgs.prediction_id);

            return {
              content: [
                {
                  type: "text",
                  text: `Prediction result:\nStatus: ${predictionResult.status}\nOutput: ${JSON.stringify(predictionResult.output, null, 2)}\nLogs: ${predictionResult.logs}`,
                },
              ],
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Replicate MCP server running on stdio");
  }
}

const server = new ReplicateMCPServer();
server.run().catch(console.error);