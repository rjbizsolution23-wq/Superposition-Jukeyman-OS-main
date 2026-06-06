// packages/mcp/workspace/src/index.ts — Google Workspace MCP server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { google } from "googleapis";
const server = new Server({ name: "supreme-operator-workspace", version: "1.0.0" }, { capabilities: { tools: {} } });
// Initialize Google Workspace APIs
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: "alien-container-495103-k5@appspot.gserviceaccount.com",
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/calendar'
    ],
});
const gmail = google.gmail({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });
const calendar = google.calendar({ version: 'v3', auth });
const GmailSearchArgsSchema = z.object({
    query: z.string(),
    maxResults: z.number().default(10),
});
const DriveListArgsSchema = z.object({
    folderId: z.string().optional(),
    maxResults: z.number().default(20),
});
const CalendarCreateArgsSchema = z.object({
    summary: z.string(),
    startTime: z.string(),
    endTime: z.string(),
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "gmail_search",
            description: "Search Gmail messages",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Gmail search query" },
                    maxResults: { type: "number", description: "Max results" }
                },
                required: ["query"]
            }
        },
        {
            name: "drive_list",
            description: "List Google Drive files",
            inputSchema: {
                type: "object",
                properties: {
                    folderId: { type: "string", description: "Folder ID" },
                    maxResults: { type: "number", description: "Max results" }
                }
            }
        },
        {
            name: "calendar_create",
            description: "Create Google Calendar event",
            inputSchema: {
                type: "object",
                properties: {
                    summary: { type: "string", description: "Event title" },
                    startTime: { type: "string", description: "Start time (ISO 8601)" },
                    endTime: { type: "string", description: "End time (ISO 8601)" }
                },
                required: ["summary", "startTime", "endTime"]
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "gmail_search": {
                const validated = GmailSearchArgsSchema.parse(args);
                const response = await gmail.users.messages.list({
                    userId: 'me',
                    q: validated.query,
                    maxResults: validated.maxResults,
                });
                return { content: [{ type: "text", text: JSON.stringify(response.data.messages || []) }] };
            }
            case "drive_list": {
                const validated = DriveListArgsSchema.parse(args);
                const query = validated.folderId ? `'${validated.folderId}' in parents` : "'root' in parents";
                const response = await drive.files.list({
                    q: query,
                    pageSize: validated.maxResults,
                    fields: 'files(id, name, mimeType)',
                });
                return { content: [{ type: "text", text: JSON.stringify(response.data.files || []) }] };
            }
            case "calendar_create": {
                const validated = CalendarCreateArgsSchema.parse(args);
                const event = {
                    summary: validated.summary,
                    start: { dateTime: validated.startTime },
                    end: { dateTime: validated.endTime },
                };
                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: event,
                });
                return { content: [{ type: "text", text: `Event created: ${response.data.id}` }] };
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
    console.error("Google Workspace MCP server running...");
}
main().catch(console.error);
