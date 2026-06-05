const axios = require('axios');
const MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

const HEADERS = {
  Authorization: 'Bearer pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
  locationId: 'hlRn1Yt9hn34B6Z9hNqp',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

let callId = 0;

async function mcpCall(toolName, args) {
  callId++;
  const r = await axios.post(MCP_URL, {
    jsonrpc: '2.0',
    id: callId,
    method: 'tools/call',
    params: { name: toolName, arguments: args || {} },
  }, { headers: HEADERS, responseType: 'text', timeout: 30000 });

  const lines = r.data.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.substring(6));
        if (parsed.result) return parsed.result;
        if (parsed.error) throw new Error(JSON.stringify(parsed.error));
      } catch (e) {
        if (e.message.startsWith('{')) throw e;
      }
    }
  }
  return null;
}

(async () => {
  console.log('=== EXPLORING GHL MCP TOOLS ===\n');

  // 1. Get location details
  console.log('--- Location ---');
  const loc = await mcpCall('locations_get-location', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(loc, null, 2).substring(0, 500));

  // 2. Get pipelines with different params
  console.log('\n--- Pipelines (no params) ---');
  const pipes1 = await mcpCall('opportunities_get-pipelines', {});
  console.log(JSON.stringify(pipes1, null, 2).substring(0, 500));

  console.log('\n--- Pipelines (with locationId) ---');
  const pipes2 = await mcpCall('opportunities_get-pipelines', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(pipes2, null, 2).substring(0, 500));

  // 3. Get custom fields
  console.log('\n--- Custom Fields ---');
  const cf = await mcpCall('locations_get-custom-fields', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(cf, null, 2).substring(0, 500));

  // 4. Search opportunities
  console.log('\n--- Search Opportunities ---');
  const opp = await mcpCall('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(opp, null, 2).substring(0, 500));

  // 5. Get contacts
  console.log('\n--- Contacts ---');
  const contacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(contacts, null, 2).substring(0, 500));

  // 6. Get calendar events
  console.log('\n--- Calendar Events ---');
  const events = await mcpCall('calendars_get-calendar-events', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(events, null, 2).substring(0, 500));

  // 7. Get messages
  console.log('\n--- Messages ---');
  const msgs = await mcpCall('conversations_search-conversation', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(JSON.stringify(msgs, null, 2).substring(0, 500));
})();