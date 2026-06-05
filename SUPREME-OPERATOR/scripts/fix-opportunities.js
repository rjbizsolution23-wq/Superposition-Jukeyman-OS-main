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
  console.log('🔧 FIXING OPPORTUNITIES & COMPLETING SETUP\n');

  // Get pipelines to find stage IDs
  const pipes = await mcpCall('opportunities_get-pipelines', {});
  const pipeline = pipes?.data?.pipelines?.[0];
  if (!pipeline) { console.log('No pipeline found'); return; }

  console.log(`Pipeline: ${pipeline.name} (${pipeline.id})`);
  console.log('Stages:');
  pipeline.stages.forEach(s => console.log(`  - ${s.name} (${s.id})`));

  // Get contacts
  const contacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp', limit: 10 });
  const contactList = contacts?.data?.contacts || [];
  console.log(`\nContacts: ${contactList.length}`);

  // Find our test leads
  const testLeads = contactList.filter(c =>
    c.email?.includes('creditforge') || c.email?.includes('credit@test') || c.tags?.includes('credit-repair-lead')
  );
  console.log(`Test leads: ${testLeads.length}`);
  testLeads.forEach(c => console.log(`  - ${c.firstName} ${c.lastName} (${c.id})`));

  // Search existing opportunities
  const opps = await mcpCall('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const existingOpps = opps?.data?.opportunities || [];
  console.log(`\nExisting opportunities: ${existingOpps.length}`);
  existingOpps.forEach(o => console.log(`  - ${o.name} (${o.id}) stage: ${o.pipelineStageId}`));

  // Create opportunities for leads that don't have one
  for (const lead of testLeads) {
    const hasOpp = existingOpps.some(o => o.contactId === lead.id || o.name?.includes(lead.firstName));
    if (hasOpp) {
      console.log(`  ⏭️  ${lead.firstName} ${lead.lastName} already has opportunity`);
      continue;
    }

    console.log(`\nCreating opportunity for ${lead.firstName} ${lead.lastName}...`);

    // Try creating via update with minimal fields
    const result = await mcpCall('opportunities_update-opportunity', {
      locationId: 'hlRn1Yt9hn34B6Z9hNqp',
      contactId: lead.id,
      name: `Credit Repair - ${lead.firstName} ${lead.lastName}`,
      pipelineId: pipeline.id,
      pipelineStageId: pipeline.stages[0]?.id,
      monetaryValue: lead.tags?.includes('premium-package') ? 997 : 497,
      status: 'open',
    });

    if (result?.success) {
      console.log(`  ✅ Created: ${result.data?.opportunity?.name || result.data?.id}`);
    } else {
      console.log(`  ❌ Failed: ${JSON.stringify(result?.data?.message || result).substring(0, 150)}`);
    }

    await sleep(500);
  }

  // Final state
  console.log('\n━━━ FINAL STATE ━━━');
  const finalOpps = await mcpCall('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`Opportunities: ${finalOpps?.data?.opportunities?.length || 0}`);
  finalOpps?.data?.opportunities?.forEach(o => {
    console.log(`  - ${o.name} | $${o.monetaryValue} | ${o.status}`);
  });

  const finalContacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`Contacts: ${finalContacts?.data?.contacts?.length || 0}`);

  const finalMsgs = await mcpCall('conversations_search-conversation', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`Conversations: ${finalMsgs?.data?.conversations?.length || 0}`);

  console.log('\n✅ Credit Forge setup complete!');
})();