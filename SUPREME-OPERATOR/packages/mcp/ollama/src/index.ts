// packages/mcp/ollama/src/index.ts — Ollama MCP server for open-source models
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import ollama from "ollama";

const server = new Server(
  { name: "supreme-operator-ollama", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Connect to Ollama server (hosted on GCP)
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://ollama-server:11434";

const GenerateArgsSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  stream: z.boolean().default(false),
});

const ListModelsArgsSchema = z.object({});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_text",
      description: "Generate text using Ollama models",
      inputSchema: {
        type: "object",
        properties: {
          model: { type: "string", description: "Model name (e.g., llama3.1:70b)" },
          prompt: { type: "string", description: "Input prompt" },
          stream: { type: "boolean", description: "Stream response" }
        },
        required: ["model", "prompt"]
      }
    },
    {
      name: "list_models",
      description: "List available Ollama models",
      inputSchema: { type: "object", properties: {} }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_text": {
        const validated = GenerateArgsSchema.parse(args);
        const response = await ollama.generate({
          model: validated.model,
          prompt: validated.prompt,
          stream: validated.stream,
          host: OLLAMA_HOST
        });
        return { content: [{ type: "text", text: response.response || JSON.stringify(response) }] };
      }

      case "list_models": {
        ListModelsArgsSchema.parse(args);
        const response = await ollama.list({ host: OLLAMA_HOST });
        return { content: [{ type: "text", text: JSON.stringify(response.models) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ollama MCP server running...");
}

main().catch(console.error);