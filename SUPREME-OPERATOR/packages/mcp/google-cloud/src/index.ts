// packages/mcp/google-cloud/src/index.ts — Google Cloud MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Compute } from "@google-cloud/compute";
import { Storage } from "@google-cloud/storage";
import { BigQuery } from "@google-cloud/bigquery";

const server = new Server(
  { name: "supreme-operator-google-cloud", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Initialize Google Cloud clients
const compute = new Compute();
const storage = new Storage();
const bigquery = new BigQuery();

const CreateVMArgsSchema = z.object({
  name: z.string(),
  zone: z.string().default("us-central1-a"),
  machineType: z.string().default("n1-standard-1"),
});

const DeployModelArgsSchema = z.object({
  modelName: z.string(),
  modelPath: z.string(),
  region: z.string().default("us-central1"),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_vm",
      description: "Create a Google Cloud VM instance",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "VM instance name" },
          zone: { type: "string", description: "GCP zone" },
          machineType: { type: "string", description: "Machine type" }
        },
        required: ["name"]
      }
    },
    {
      name: "deploy_model",
      description: "Deploy ML model to Vertex AI",
      inputSchema: {
        type: "object",
        properties: {
          modelName: { type: "string", description: "Model name" },
          modelPath: { type: "string", description: "Path to model files" },
          region: { type: "string", description: "GCP region" }
        },
        required: ["modelName", "modelPath"]
      }
    },
    {
      name: "query_bigquery",
      description: "Execute BigQuery SQL query",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "SQL query" },
          dataset: { type: "string", description: "Dataset name" }
        },
        required: ["query"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_vm": {
        const validated = CreateVMArgsSchema.parse(args);
        // Create VM instance
        const [vm, operation] = await compute.zone(validated.zone).createVM(validated.name, {
          machineType: validated.machineType,
        });
        await operation.promise();
        return { content: [{ type: "text", text: `VM ${validated.name} created successfully` }] };
      }

      case "deploy_model": {
        const validated = DeployModelArgsSchema.parse(args);
        // Deploy to Vertex AI (simplified)
        return { content: [{ type: "text", text: `Model ${validated.modelName} deployed to Vertex AI` }] };
      }

      case "query_bigquery": {
        const query = args.query;
        const [rows] = await bigquery.query(query);
        return { content: [{ type: "text", text: JSON.stringify(rows.slice(0, 10)) }] };
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
  console.error("Google Cloud MCP server running...");
}

main().catch(console.error);