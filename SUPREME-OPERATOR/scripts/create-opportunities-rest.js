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
    jsonrpc: '2.0', id: callId,
    method: 'tools/call',
    params: { name: toolName, arguments: args || {} },
  }, { headers: HEADERS, responseType: 'text', timeout: 30000 });

  const lines = r.data.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.substring(6));
        if (parsed.result?.content?.[0]?.text) {
          return JSON.parse(parsed.result.content[0].text);
        }
        if (parsed.error) throw new Error(JSON.stringify(parsed.error));
      } catch (e) {
        if (e.message.startsWith('{')) throw e;
      }
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('🔧 CREATING OPPORTUNITIES VIA REST API\n');

  // Get pipeline info
  const pipes = await mcpCall('opportunities_get-pipelines', {});
  const pipeline = pipes?.data?.pipelines?.[0];
  const stageId = pipeline?.stages?.[0]?.id;

  console.log(`Pipeline: ${pipeline?.name}`);
  console.log(`First stage: ${pipeline?.stages?.[0]?.name} (${stageId})`);

  // Get contacts
  const contacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const testLeads = (contacts?.data?.contacts || []).filter(c =>
    c.email?.includes('credit@test')
  );

  console.log(`\nLeads to create opportunities for: ${testLeads.length}`);

  // Create opportunities via REST API
  const restClient = axios.create({
    baseURL: 'https://services.leadconnectorhq.com',
    headers: {
      Authorization: `Bearer pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    },
  });

  for (const lead of testLeads) {
    try {
      const result = await restClient.post('/opportunities/', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: lead.id,
        name: `Credit Repair - ${lead.firstName} ${lead.lastName}`,
        pipelineId: pipeline.id,
        pipelineStageId: stageId,
        monetaryValue: lead.tags?.includes('premium-package') ? 997 : 497,
        status: 'open',
      });
      console.log(`  ✅ ${lead.firstName} ${lead.lastName}: ${result.data?.opportunity?.id || 'created'}`);
    } catch (e) {
      console.log(`  ❌ ${lead.firstName} ${lead.lastName}: ${e.response?.data?.message || e.message}`);
    }
    await sleep(500);
  }

  // Verify
  const finalOpps = await mcpCall('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`\nTotal opportunities: ${finalOpps?.data?.opportunities?.length || 0}`);
  finalOpps?.data?.opportunities?.forEach(o => {
    console.log(`  - ${o.name} | $${o.monetaryValue} | ${o.status}`);
  });

  console.log('\n✅ Opportunities created!');
})();