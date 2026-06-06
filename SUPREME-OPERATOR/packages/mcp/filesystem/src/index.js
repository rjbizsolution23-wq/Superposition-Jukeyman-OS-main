// packages/mcp/filesystem/src/index.ts — Zod-validated filesystem MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";
const server = new Server({
    name: "supreme-operator-filesystem",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Zod schemas for validation
const ReadFileArgsSchema = z.object({
    path: z.string().min(1).max(4096),
    encoding: z.enum(["utf-8", "ascii"]).optional().default("utf-8"),
});
const WriteFileArgsSchema = z.object({
    path: z.string().min(1).max(4096),
    content: z.string().max(1048576), // 1MB limit
});
const ListDirArgsSchema = z.object({
    path: z.string().min(1).max(4096),
});
const SearchArgsSchema = z.object({
    pattern: z.string().min(1).max(256),
    path: z.string().optional().default("."),
});
// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_file",
                description: "Read the contents of a file. Returns text content.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the file to read",
                        },
                        encoding: {
                            type: "string",
                            enum: ["utf-8", "ascii"],
                            description: "Text encoding (default: utf-8)",
                        },
                    },
                    required: ["path"],
                },
            },
            {
                name: "write_file",
                description: "Write content to a file. Creates parent directories if needed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to write the file",
                        },
                        content: {
                            type: "string",
                            description: "Content to write",
                        },
                    },
                    required: ["path", "content"],
                },
            },
            {
                name: "list_directory",
                description: "List contents of a directory.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the directory",
                        },
                    },
                    required: ["path"],
                },
            },
            {
                name: "search_files",
                description: "Search for files using glob patterns.",
                inputSchema: {
                    type: "object",
                    properties: {
                        pattern: {
                            type: "string",
                            description: "Glob pattern (e.g., '*.txt', 'src/**/*.js')",
                        },
                        path: {
                            type: "string",
                            description: "Base directory to search (default: current)",
                        },
                    },
                    required: ["pattern"],
                },
            },
        ],
    };
});
// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "read_file": {
                const validated = ReadFileArgsSchema.parse(args);
                const content = await fs.readFile(validated.path, validated.encoding);
                return {
                    content: [{ type: "text", text: content.toString() }],
                };
            }
            case "write_file": {
                const validated = WriteFileArgsSchema.parse(args);
                await fs.mkdir(path.dirname(validated.path), { recursive: true });
                await fs.writeFile(validated.path, validated.content, "utf-8");
                return {
                    content: [{ type: "text", text: `File written: ${validated.path}` }],
                };
            }
            case "list_directory": {
                const validated = ListDirArgsSchema.parse(args);
                const entries = await fs.readdir(validated.path, { withFileTypes: true });
                const result = entries.map(entry => ({
                    name: entry.name,
                    type: entry.isDirectory() ? "directory" : "file",
                    path: path.join(validated.path, entry.name),
                }));
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
            case "search_files": {
                const validated = SearchArgsSchema.parse(args);
                const matches = await glob(validated.pattern, {
                    cwd: validated.path,
                    absolute: true,
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Supreme Operator Filesystem MCP server running...");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
