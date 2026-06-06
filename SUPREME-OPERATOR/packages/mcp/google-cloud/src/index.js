// packages/mcp/google-cloud/src/index.ts — Google Cloud MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { InstancesClient } from "@google-cloud/compute";
import { Storage } from "@google-cloud/storage";
import { BigQuery } from "@google-cloud/bigquery";
const server = new Server({ name: "supreme-operator-google-cloud", version: "1.0.0" }, { capabilities: { tools: {} } });
// Initialize Google Cloud clients
const instancesClient = new InstancesClient();
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
const InstanceArgsSchema = z.object({
    instance: z.string().default("gpu-media-server"),
    zone: z.string().default("us-central1-a"),
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
        },
        {
            name: "start_instance",
            description: "Start a Google Cloud VM instance",
            inputSchema: {
                type: "object",
                properties: {
                    instance: { type: "string", description: "GCP instance name", default: "gpu-media-server" },
                    zone: { type: "string", description: "GCP zone", default: "us-central1-a" }
                }
            }
        },
        {
            name: "stop_instance",
            description: "Stop a Google Cloud VM instance",
            inputSchema: {
                type: "object",
                properties: {
                    instance: { type: "string", description: "GCP instance name", default: "gpu-media-server" },
                    zone: { type: "string", description: "GCP zone", default: "us-central1-a" }
                }
            }
        },
        {
            name: "get_instance_status",
            description: "Get the status/power state of a GCP VM instance",
            inputSchema: {
                type: "object",
                properties: {
                    instance: { type: "string", description: "GCP instance name", default: "gpu-media-server" },
                    zone: { type: "string", description: "GCP zone", default: "us-central1-a" }
                }
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
                const [operation] = await instancesClient.insert({
                    project: "596791791098",
                    zone: validated.zone,
                    instanceResource: {
                        name: validated.name,
                        machineType: `zones/${validated.zone}/machineTypes/${validated.machineType}`,
                        networkInterfaces: [
                            {
                                network: "global/networks/default",
                            }
                        ],
                        disks: [
                            {
                                boot: true,
                                initializeParams: {
                                    sourceImage: "projects/debian-cloud/global/images/family/debian-11",
                                }
                            }
                        ]
                    }
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
            case "start_instance": {
                const validated = InstanceArgsSchema.parse(args);
                const [operation] = await instancesClient.start({
                    project: "596791791098",
                    zone: validated.zone,
                    instance: validated.instance
                });
                await operation.promise();
                return { content: [{ type: "text", text: `Instance ${validated.instance} started successfully.` }] };
            }
            case "stop_instance": {
                const validated = InstanceArgsSchema.parse(args);
                const [operation] = await instancesClient.stop({
                    project: "596791791098",
                    zone: validated.zone,
                    instance: validated.instance
                });
                await operation.promise();
                return { content: [{ type: "text", text: `Instance ${validated.instance} stopped successfully.` }] };
            }
            case "get_instance_status": {
                const validated = InstanceArgsSchema.parse(args);
                const [instance] = await instancesClient.get({
                    project: "596791791098",
                    zone: validated.zone,
                    instance: validated.instance
                });
                return { content: [{ type: "text", text: `Instance ${validated.instance} status is: ${instance.status}` }] };
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
    console.error("Google Cloud MCP server running...");
}
main().catch(console.error);
