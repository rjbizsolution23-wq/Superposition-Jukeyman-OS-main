// packages/mcp/ghl/src/index.ts — GHL MCP Server for Credit Forge
// Uses GHL's remote MCP endpoint at services.leadconnectorhq.com/mcp/
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_MCP_URL = process.env.GHL_MCP_URL || "https://services.leadconnectorhq.com/mcp/";

if (!GHL_API_KEY || !GHL_LOCATION_ID) {
  throw new Error("GHL API key and location ID not configured");
}

class GHLMCPServer {
  private server: Server;
  private ghlClient: Client | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "ghl-credit-forge",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private async getGHLClient(): Promise<Client> {
    if (!this.ghlClient) {
      const transport = new StreamableHTTPClientTransport(new URL(GHL_MCP_URL), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            locationId: GHL_LOCATION_ID,
          },
        },
      });

      this.ghlClient = new Client({
        name: "supreme-operator-ghl",
        version: "1.0.0",
      }, {
        capabilities: {},
      });

      await this.ghlClient.connect(transport);
    }
    return this.ghlClient;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const client = await this.getGHLClient();
        const tools = await client.listTools();
        return { tools: tools.tools };
      } catch (error) {
        console.error("Error listing GHL tools:", error);
        return { tools: [] };
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const client = await this.getGHLClient();
        const result = await client.callTool({ name, arguments: args || {} });
        return result;
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `GHL tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("GHL Credit Forge MCP server running on stdio");
    console.error(`Connected to: ${GHL_MCP_URL}`);
    console.error(`Location: ${GHL_LOCATION_ID}`);
  }
}

const server = new GHLMCPServer();
server.run().catch(console.error);