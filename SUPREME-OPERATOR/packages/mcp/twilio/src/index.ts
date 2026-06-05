// packages/mcp/twilio/src/index.ts — Twilio MCP server for messaging automation
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import twilio from "twilio";

const server = new Server(
  { name: "supreme-operator-twilio", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const SendSMSArgsSchema = z.object({
  to: z.string(),
  message: z.string(),
  from: z.string().optional(),
});

const MakeCallArgsSchema = z.object({
  to: z.string(),
  url: z.string(),
  from: z.string().optional(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "send_sms",
      description: "Send SMS message via Twilio",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number" },
          message: { type: "string", description: "Message content" },
          from: { type: "string", description: "Sender phone number" }
        },
        required: ["to", "message"]
      }
    },
    {
      name: "make_call",
      description: "Make phone call via Twilio",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number" },
          url: { type: "string", description: "TwiML URL for call" },
          from: { type: "string", description: "Caller phone number" }
        },
        required: ["to", "url"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send_sms": {
        const validated = SendSMSArgsSchema.parse(args);
        const message = await client.messages.create({
          body: validated.message,
          from: validated.from || process.env.TWILIO_PHONE_NUMBER,
          to: validated.to
        });
        return { content: [{ type: "text", text: `SMS sent: ${message.sid}` }] };
      }

      case "make_call": {
        const validated = MakeCallArgsSchema.parse(args);
        const call = await client.calls.create({
          url: validated.url,
          from: validated.from || process.env.TWILIO_PHONE_NUMBER,
          to: validated.to
        });
        return { content: [{ type: "text", text: `Call initiated: ${call.sid}` }] };
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
  console.error("Twilio MCP server running...");
}

main().catch(console.error);