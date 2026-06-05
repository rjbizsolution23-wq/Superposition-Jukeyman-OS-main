// packages/mcp/1panel/src/index.ts — 1Panel server automation
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";

const server = new Server(
  { name: "supreme-operator-1panel", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 1Panel API configuration
const PANEL_URL = process.env.ONEPANEL_URL || "http://localhost:9999";
const API_KEY = process.env.ONEPANEL_API_KEY;

const DeployAppArgsSchema = z.object({
  name: z.string(),
  image: z.string(),
  ports: z.array(z.number()).optional(),
});

const GetServerInfoArgsSchema = z.object({});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "deploy_app",
      description: "Deploy application to 1Panel server",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "App name" },
          image: { type: "string", description: "Docker image" },
          ports: { type: "array", items: { type: "number" } }
        },
        required: ["name", "image"]
      }
    },
    {
      name: "get_server_info",
      description: "Get 1Panel server information",
      inputSchema: { type: "object", properties: {} }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "deploy_app": {
        const validated = DeployAppArgsSchema.parse(args);
        const response = await axios.post(`${PANEL_URL}/api/apps`, {
          name: validated.name,
          image: validated.image,
          ports: validated.ports || [3000]
        }, {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        return { content: [{ type: "text", text: `App deployed: ${response.data.id}` }] };
      }

      case "get_server_info": {
        GetServerInfoArgsSchema.parse(args);
        const response = await axios.get(`${PANEL_URL}/api/system/info`, {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
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
  console.error("1Panel MCP server running...");
}

main().catch(console.error);