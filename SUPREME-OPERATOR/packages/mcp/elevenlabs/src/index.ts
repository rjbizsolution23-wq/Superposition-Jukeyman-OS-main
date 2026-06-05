import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ElevenLabs } from "elevenlabs";
import { z } from "zod";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

if (!ELEVENLABS_API_KEY) {
  throw new Error("ElevenLabs API key not configured");
}

class ElevenLabsMCPServer {
  private server: Server;
  private elevenlabs: any;

  constructor() {
    this.elevenlabs = new (ElevenLabs as any)({
      apiKey: ELEVENLABS_API_KEY,
    });

    this.server = new Server({
      name: "elevenlabs-mcp-server",
      version: "1.0.0",
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "generate_speech",
            description: "Generate speech audio from text using ElevenLabs",
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string", description: "Text to convert to speech" },
                voice_id: { type: "string", description: "Voice ID to use", default: "21m00Tcm4TlvDq8ikWAM" },
                model_id: { type: "string", description: "Model ID", default: "eleven_monolingual_v1" },
                voice_settings: {
                  type: "object",
                  properties: {
                    stability: { type: "number", minimum: 0, maximum: 1, default: 0.5 },
                    similarity_boost: { type: "number", minimum: 0, maximum: 1, default: 0.5 },
                  },
                },
              },
              required: ["text"],
            },
          },
          {
            name: "list_voices",
            description: "List available voices in ElevenLabs",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_voice_details",
            description: "Get details for a specific voice",
            inputSchema: {
              type: "object",
              properties: {
                voice_id: { type: "string", description: "Voice ID" },
              },
              required: ["voice_id"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_speech":
            const speechArgs = z.object({
              text: z.string(),
              voice_id: z.string().optional().default("21m00Tcm4TlvDq8ikWAM"),
              model_id: z.string().optional().default("eleven_monolingual_v1"),
              voice_settings: z.object({
                stability: z.number().min(0).max(1).optional().default(0.5),
                similarity_boost: z.number().min(0).max(1).optional().default(0.5),
              }).optional(),
            }).parse(args);

            const audioStream = await this.elevenlabs.generate({
              voice: speechArgs.voice_id,
              text: speechArgs.text,
              model_id: speechArgs.model_id,
              voice_settings: speechArgs.voice_settings,
            });

            // Convert stream to base64 for MCP response
            const chunks: Uint8Array[] = [];
            for await (const chunk of audioStream) {
              chunks.push(chunk);
            }
            const audioBuffer = Buffer.concat(chunks);
            const audioBase64 = audioBuffer.toString('base64');

            return {
              content: [
                {
                  type: "text",
                  text: `Speech generated successfully. Audio data: ${audioBase64.substring(0, 100)}... (truncated)`,
                },
              ],
            };

          case "list_voices":
            const voices = await this.elevenlabs.getVoices();
            const voiceList = voices.map((voice: any) => ({
              voice_id: voice.voice_id,
              name: voice.name,
              category: voice.category,
              labels: voice.labels,
            }));

            return {
              content: [
                {
                  type: "text",
                  text: `Available voices:\n${JSON.stringify(voiceList, null, 2)}`,
                },
              ],
            };

          case "get_voice_details":
            const detailArgs = z.object({
              voice_id: z.string(),
            }).parse(args);

            const voiceDetails = await this.elevenlabs.getVoice(detailArgs.voice_id);

            return {
              content: [
                {
                  type: "text",
                  text: `Voice details:\n${JSON.stringify(voiceDetails, null, 2)}`,
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
    console.error("ElevenLabs MCP server running on stdio");
  }
}

const server = new ElevenLabsMCPServer();
server.run().catch(console.error);