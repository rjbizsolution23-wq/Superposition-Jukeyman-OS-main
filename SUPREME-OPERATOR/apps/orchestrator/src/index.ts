// apps/orchestrator/src/index.ts — SUPREME-OPERATOR Main Orchestrator
import express from "express";
import { z } from "zod";
import dotenv from "dotenv";
import { AutoresearchAgent } from "../../../packages/core/dist/autoresearch.js";

// Load environment variables
dotenv.config({ path: "../../.env.local" });
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Risk Gate Function
const riskGate = (action: string, params: any): { approved: boolean; reason?: string } => {
  const riskThresholds = {
    spendLimit: parseFloat(process.env.SPEND_DAILY_LIMIT || "10.00"),
    blastRadius: parseInt(process.env.ACTION_BLAST_RADIUS_MAX || "3"),
  };

  // Financial actions
  if (action.includes("stripe") || action.includes("coinbase") || action.includes("payment")) {
    const amount = params.amount || 0;
    if (amount > riskThresholds.spendLimit) {
      return { approved: false, reason: `Amount ${amount} exceeds daily limit ${riskThresholds.spendLimit}` };
    }
  }

  // Destructive actions
  if (action.includes("delete") || action.includes("destroy") || action.includes("drop")) {
    return { approved: false, reason: "Destructive actions require manual approval" };
  }

  // High blast radius
  if (params.blastRadius > riskThresholds.blastRadius) {
    return { approved: false, reason: `Blast radius ${params.blastRadius} exceeds max ${riskThresholds.blastRadius}` };
  }

  return { approved: true };
};

// MCP Server Registry
const mcpServers = {
  coinbase: path.join(__dirname, "../../packages/mcp/coinbase/dist/index.js"),
  elevenlabs: path.join(__dirname, "../../packages/mcp/elevenlabs/dist/index.js"),
  replicate: path.join(__dirname, "../../packages/mcp/replicate/dist/index.js"),
  twilio: path.join(__dirname, "../../packages/mcp/twilio/dist/index.js"),
  ghl: path.join(__dirname, "../../packages/mcp/ghl/dist/index.js"),
  "1panel": path.join(__dirname, "../../packages/mcp/1panel/dist/index.js"),
  filesystem: path.join(__dirname, "../../packages/mcp/filesystem/dist/index.js"),
  "google-cloud": path.join(__dirname, "../../packages/mcp/google-cloud/dist/index.js"),
  workspace: path.join(__dirname, "../../packages/mcp/workspace/dist/index.js"),
  ollama: path.join(__dirname, "../../packages/mcp/ollama/dist/index.js"),
  "vertex-ai": path.join(__dirname, "../../packages/mcp/vertex-ai/dist/index.js"),
  "gpu-media": path.join(__dirname, "../../packages/mcp/gpu-media/dist/index.js"),
  huggingface: path.join(__dirname, "../../packages/mcp/huggingface/dist/index.js"),
};

// Tool Router
const routeTool = (toolName: string): string | null => {
  const toolMappings = {
    // Coinbase tools
    create_wallet: "coinbase",
    list_wallets: "coinbase",
    get_wallet_balance: "coinbase",
    send_crypto: "coinbase",
    get_exchange_rates: "coinbase",

    // ElevenLabs tools
    generate_speech: "elevenlabs",
    list_voices: "elevenlabs",
    get_voice_details: "elevenlabs",

    // Replicate tools
    run_model: "replicate",
    get_model_details: "replicate",
    list_models: "replicate",
    get_prediction: "replicate",

    // Twilio tools
    send_sms: "twilio",
    make_call: "twilio",

    // GHL/Credit Forge tools
    create_contact: "ghl",
    get_contact: "ghl",
    update_contact: "ghl",
    create_opportunity: "ghl",
    update_opportunity: "ghl",
    create_task: "ghl",
    schedule_appointment: "ghl",
    upload_document: "ghl",
    send_contract: "ghl",
    trigger_workflow: "ghl",
    add_to_campaign: "ghl",
    send_email: "ghl",
    create_credit_repair_lead: "ghl",
    start_credit_repair_workflow: "ghl",
    update_dispute_status: "ghl",
    get_pipeline_metrics: "ghl",
    get_contact_analytics: "ghl",

    // 1Panel tools
    deploy_app: "1panel",
    get_server_info: "1panel",

    // Filesystem tools
    read_file: "filesystem",
    write_file: "filesystem",
    list_directory: "filesystem",
    search_files: "filesystem",

    // Google Cloud tools
    create_vm: "google-cloud",
    deploy_model: "google-cloud",
    query_bigquery: "google-cloud",
    start_instance: "google-cloud",
    stop_instance: "google-cloud",
    get_instance_status: "google-cloud",

    // Google Workspace tools
    gmail_search: "workspace",
    drive_list: "workspace",
    calendar_create: "workspace",

    // Ollama tools
    generate_text: "ollama",

    // Vertex AI / Gemini tools
    gemini_query: "vertex-ai",
    vertex_deploy: "vertex-ai",

    // GPU Media tools
    generate_image: "gpu-media",
    generate_video: "gpu-media",
    get_gpu_media_status: "gpu-media",

    // Hugging Face tools
    huggingface_search: "huggingface",
    huggingface_generate_image: "huggingface",
    huggingface_text_to_speech: "huggingface",
    huggingface_transcribe: "huggingface",
    huggingface_dataset_viewer: "huggingface",
  };

  return toolMappings[toolName as keyof typeof toolMappings] || null;
};

// Execute MCP Tool
const executeMCPTool = async (serverName: string, toolName: string, args: any): Promise<any> => {
  const serverPath = mcpServers[serverName as keyof typeof mcpServers];
  if (!serverPath) {
    throw new Error(`Unknown MCP server: ${serverName}`);
  }

  return new Promise((resolve, reject) => {
    const mcpProcess = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, MCP_TOOL: toolName, MCP_ARGS: JSON.stringify(args) }
    });

    let output = "";
    let errorOutput = "";

    mcpProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    mcpProcess.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          resolve({ result: output });
        }
      } else {
        reject(new Error(`MCP server error: ${errorOutput}`));
      }
    });

    // Send the tool call to stdin
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    };

    mcpProcess.stdin.write(JSON.stringify(request) + "\n");
    mcpProcess.stdin.end();
  });
};

// Express App
const app = express();
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Autoresearch Endpoint (for cron job)
app.post("/autoresearch", async (req, res) => {
  try {
    const agent = new AutoresearchAgent();
    await agent.runWeeklyUpdate();
    res.json({ status: "autoresearch_complete" });
  } catch (error) {
    console.error("Autoresearch error:", error);
    res.status(500).json({
      error: "Autoresearch failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Tool Execution Endpoint
app.post("/execute", async (req, res) => {
  try {
    const { tool, args = {}, context = {} } = req.body;

    // Risk assessment
    const riskCheck = riskGate(tool, args);
    if (!riskCheck.approved) {
      return res.status(403).json({
        error: "Risk gate denied",
        reason: riskCheck.reason
      });
    }

    // Route to MCP server
    const serverName = routeTool(tool);
    if (!serverName) {
      return res.status(404).json({
        error: "Unknown tool",
        tool
      });
    }

    // Execute tool
    const result = await executeMCPTool(serverName, tool, args);

    // Log execution
    console.log(`[${new Date().toISOString()}] Tool executed: ${tool}`, {
      server: serverName,
      args,
      result: typeof result === "object" ? JSON.stringify(result) : result
    });

    res.json({
      success: true,
      tool,
      server: serverName,
      result
    });

    } catch (error) {
      console.error("Tool execution error:", error);
      res.status(500).json({
        error: "Tool execution failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
});

// Workflow Orchestration Endpoint
app.post("/workflow", async (req, res) => {
  try {
    const { workflow, inputs = {} } = req.body;

    // Placeholder for workflow orchestration
    // This would integrate with CrewAI/LangGraph for complex multi-step workflows

    const result = {
      workflow,
      status: "executed",
      inputs,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error("Workflow execution error:", error);
    res.status(500).json({
      error: "Workflow execution failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
console.log(`SUPREME-OPERATOR Orchestrator running on port ${PORT}`);
console.log("Available MCP servers:", Object.keys(mcpServers));
console.log("Risk thresholds loaded:", {
  spendLimit: process.env.SPEND_DAILY_LIMIT,
  blastRadius: process.env.ACTION_BLAST_RADIUS_MAX
});
console.log("Credit Forge GHL integration: ACTIVE");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down orchestrator...");
  process.exit(0);
});