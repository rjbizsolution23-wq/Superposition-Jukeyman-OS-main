import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Coinbase, Wallet } from "coinbase";
import { z } from "zod";

const COINBASE_PROJECT_ID = process.env.COINBASE_PROJECT_ID!;
const COINBASE_API_KEY_ID = process.env.COINBASE_API_KEY_ID!;
const COINBASE_API_KEY_SECRET = process.env.COINBASE_API_KEY_SECRET!;

if (!COINBASE_PROJECT_ID || !COINBASE_API_KEY_ID || !COINBASE_API_KEY_SECRET) {
  throw new Error("Coinbase credentials not configured");
}

class CoinbaseMCPServer {
  private server: Server;
  private coinbase: Coinbase;

  constructor() {
    this.coinbase = new Coinbase({
      apiKeyName: COINBASE_API_KEY_ID,
      privateKey: COINBASE_API_KEY_SECRET,
    });

    this.server = new Server({
      name: "coinbase-mcp-server",
      version: "1.0.0",
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_wallet",
            description: "Create a new Coinbase wallet for crypto management",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", description: "Wallet name" },
                network_id: { type: "string", description: "Network ID (e.g., base-mainnet)" },
              },
              required: ["name", "network_id"],
            },
          },
          {
            name: "list_wallets",
            description: "List all Coinbase wallets",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_wallet_balance",
            description: "Get balance for a specific wallet",
            inputSchema: {
              type: "object",
              properties: {
                wallet_id: { type: "string", description: "Wallet ID" },
              },
              required: ["wallet_id"],
            },
          },
          {
            name: "send_crypto",
            description: "Send cryptocurrency from a wallet",
            inputSchema: {
              type: "object",
              properties: {
                wallet_id: { type: "string", description: "Source wallet ID" },
                destination: { type: "string", description: "Destination address" },
                amount: { type: "string", description: "Amount to send" },
                asset_id: { type: "string", description: "Asset ID (e.g., eth)" },
              },
              required: ["wallet_id", "destination", "amount", "asset_id"],
            },
          },
          {
            name: "get_exchange_rates",
            description: "Get current exchange rates for cryptocurrencies",
            inputSchema: {
              type: "object",
              properties: {
                currency_pair: { type: "string", description: "Currency pair (e.g., ETH-USD)" },
              },
              required: ["currency_pair"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_wallet":
            const createArgs = z.object({
              name: z.string(),
              network_id: z.string(),
            }).parse(args);

            const wallet = await this.coinbase.createWallet({
              name: createArgs.name,
              networkId: createArgs.network_id,
            } as any); // API compatibility

            return {
              content: [
                {
                  type: "text",
                  text: `Wallet created successfully:\nID: ${wallet.getId()}\nAddress: ${wallet.getDefaultAddress()}\nNetwork: ${wallet.getNetworkId()}`,
                },
              ],
            };

          case "list_wallets":
            const wallets = await this.coinbase.listWallets();
            const walletList = wallets.data.map((w: Wallet) => ({
              id: w.getId(),
              name: w.getName(),
              network: w.getNetworkId(),
              address: w.getDefaultAddress(),
            }));

            return {
              content: [
                {
                  type: "text",
                  text: `Wallets:\n${JSON.stringify(walletList, null, 2)}`,
                },
              ],
            };

          case "get_wallet_balance":
            const balanceArgs = z.object({
              wallet_id: z.string(),
            }).parse(args);

            const balanceWallet = await this.coinbase.getWallet(balanceArgs.wallet_id);
            const balance = await balanceWallet.getBalance();

            return {
              content: [
                {
                  type: "text",
                  text: `Wallet Balance:\n${JSON.stringify(balance, null, 2)}`,
                },
              ],
            };

          case "send_crypto":
            const sendArgs = z.object({
              wallet_id: z.string(),
              destination: z.string(),
              amount: z.string(),
              asset_id: z.string(),
            }).parse(args);

            const transferWallet = await this.coinbase.getWallet(sendArgs.wallet_id);
            const transfer = await transferWallet.createTransfer({
              amount: sendArgs.amount,
              assetId: sendArgs.asset_id,
              destination: sendArgs.destination,
            });

            return {
              content: [
                {
                  type: "text",
                  text: `Transfer initiated:\nID: ${transfer.getId()}\nStatus: ${transfer.getStatus()}`,
                },
              ],
            };

          case "get_exchange_rates":
            const ratesArgs = z.object({
              currency_pair: z.string(),
            }).parse(args);

            // Coinbase SDK may have exchange rate methods - implement based on available API
            const [base, quote] = ratesArgs.currency_pair.split("-");
            // Placeholder for exchange rate logic
            return {
              content: [
                {
                  type: "text",
                  text: `Exchange rate for ${ratesArgs.currency_pair}: Implementation needed based on Coinbase SDK`,
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
    console.error("Coinbase MCP server running on stdio");
  }
}

const server = new CoinbaseMCPServer();
server.run().catch(console.error);