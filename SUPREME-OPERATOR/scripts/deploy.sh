#!/usr/bin/env bash

# SUPREME-OPERATOR Production Deployment Script
# Deploys to Cloudflare Workers + Pages

set -e

echo "🚀 Starting SUPREME-OPERATOR production deployment..."

# Build all packages
echo "📦 Building packages..."
pnpm run build

# Set Cloudflare secrets
echo "🔐 Setting Cloudflare secrets..."
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put GHL_API_KEY
wrangler secret put COINBASE_API_KEY_ID
wrangler secret put COINBASE_API_KEY_SECRET
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put REPLICATE_API_TOKEN

# Deploy orchestrator to Cloudflare Workers
echo "⚡ Deploying orchestrator to Cloudflare Workers..."
wrangler deploy apps/orchestrator/dist/index.js

# Create KV namespaces
echo "🗄️ Creating KV namespaces..."
wrangler kv namespace create SUPREME_KV --preview false
wrangler kv namespace create MCP_SESSIONS --preview false

# Create D1 database
echo "🗃️ Creating D1 database..."
wrangler d1 create supreme-operator

# Deploy MCP servers
echo "🔧 Deploying MCP servers..."
for mcp in packages/mcp/*/; do
  if [ -d "$mcp" ]; then
    echo "Deploying $(basename $mcp)..."
    cd "$mcp"
    wrangler deploy
    cd ../../..
  fi
done

# Deploy credit repair agent
echo "💼 Deploying credit repair agent..."
wrangler pages project create supreme-credit-repair
wrangler pages deployment create packages/agents/credit-repair/dist --project-name supreme-credit-repair

echo "✅ SUPREME-OPERATOR deployment complete!"
echo "🌐 Orchestrator URL: https://supreme-operator-orchestrator.your-subdomain.workers.dev"
echo "📱 Credit Repair Agent: https://supreme-credit-repair.pages.dev"