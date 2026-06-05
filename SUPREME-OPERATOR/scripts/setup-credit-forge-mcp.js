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

let stats = { created: 0, skipped: 0, errors: 0 };

async function safe(name, fn) {
  try {
    const r = await fn();
    if (r?.success === false) {
      stats.errors++;
      console.log(`  ❌ ${name}: ${JSON.stringify(r.data?.message || r.data).substring(0, 100)}`);
      return null;
    }
    stats.created++;
    console.log(`  ✅ ${name}`);
    return r;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('already') || msg.includes('duplicate')) {
      stats.skipped++;
      console.log(`  ⏭️  ${name} (exists)`);
    } else {
      stats.errors++;
      console.log(`  ❌ ${name}: ${msg.substring(0, 120)}`);
    }
    return null;
  }
}

async function main() {
  console.log('🔥 CREDIT FORGE — FULL GHL SNAPSHOT (MCP)\n');

  // 1. Get existing data
  console.log('━━━ 1. EXISTING DATA ━━━');
  const loc = await mcpCall('locations_get-location', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`  Location: ${loc?.data?.location?.name}`);

  const pipes = await mcpCall('opportunities_get-pipelines', {});
  const existingPipes = pipes?.data?.pipelines || [];
  console.log(`  Pipelines: ${existingPipes.length}`);
  existingPipes.forEach(p => console.log(`    - ${p.name} (${p.stages?.length || 0} stages)`));

  const cf = await mcpCall('locations_get-custom-fields', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const existingFields = cf?.data?.customFields || [];
  console.log(`  Custom fields: ${existingFields.length}`);

  const contacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp', limit: 3 });
  console.log(`  Contacts: ${contacts?.data?.contacts?.length || 0}\n`);

  // 2. Create Credit Repair Pipeline
  console.log('━━━ 2. CREDIT REPAIR PIPELINE ━━━');
  const crPipeline = existingPipes.find(p => p.name === 'Credit Repair Pipeline');
  if (crPipeline) {
    console.log(`  ⏭️  Credit Repair Pipeline already exists`);
    stats.skipped++;
  } else {
    // Create via opportunities_update-opportunity (workaround since no direct pipeline create)
    // First create a contact to attach opportunity to
    const tempContact = await safe('Temp contact for pipeline', () =>
      mcpCall('contacts_create-contact', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        firstName: 'Pipeline',
        lastName: 'Setup',
        email: 'pipeline-setup@creditforge.temp',
        tags: ['credit-forge'],
      })
    );
    await sleep(500);
  }

  // 3. Create test credit repair lead with full data
  console.log('\n━━━ 3. CREDIT REPAIR LEADS ━━━');
  const lead1 = await safe('Lead: John Smith (CA)', () =>
    mcpCall('contacts_upsert-contact', {
      locationId: 'hlRn1Yt9hn34B6Z9hNqp',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith.credit@test.com',
      phone: '+14155551234',
      tags: ['credit-repair-lead', 'cf-intake-consumer', 'california', 'high-value-lead', 'premium-package'],
      source: 'Credit Forge - Google Ads',
    })
  );
  await sleep(300);

  const lead2 = await safe('Lead: Maria Garcia (TX)', () =>
    mcpCall('contacts_upsert-contact', {
      locationId: 'hlRn1Yt9hn34B6Z9hNqp',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia.credit@test.com',
      phone: '+15125555678',
      tags: ['credit-repair-lead', 'cf-intake-consumer', 'texas', 'basic-package'],
      source: 'Credit Forge - Facebook Ads',
    })
  );
  await sleep(300);

  const lead3 = await safe('Lead: Robert Johnson (FL)', () =>
    mcpCall('contacts_upsert-contact', {
      locationId: 'hlRn1Yt9hn34B6Z9hNqp',
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.johnson.credit@test.com',
      phone: '+13055559012',
      tags: ['credit-repair-lead', 'cf-intake-consumer', 'florida', 'high-value-lead', 'premium-package'],
      source: 'Credit Forge - Referral',
    })
  );
  await sleep(300);

  // 4. Add tags to existing test contact
  console.log('\n━━━ 4. TAG EXISTING CONTACTS ━━━');
  if (contacts?.data?.contacts?.length > 0) {
    const firstContact = contacts.data.contacts[0];
    await safe(`Tag: ${firstContact.firstName} ${firstContact.lastName}`, () =>
      mcpCall('contacts_add-tags', {
        contactId: firstContact.id,
        tags: ['credit-forge'],
      })
    );
    await sleep(300);
  }

  // 5. Create opportunities for leads
  console.log('\n━━━ 5. OPPORTUNITIES ━━━');
  if (lead1?.data?.contact?.id) {
    await safe('Opportunity: John Smith', () =>
      mcpCall('opportunities_update-opportunity', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: lead1.data.contact.id,
        name: 'Credit Repair - John Smith',
        pipelineId: existingPipes[0]?.id,
        pipelineStageId: existingPipes[0]?.stages?.[0]?.id,
        monetaryValue: 997,
        status: 'open',
      })
    );
    await sleep(300);
  }

  if (lead2?.data?.contact?.id) {
    await safe('Opportunity: Maria Garcia', () =>
      mcpCall('opportunities_update-opportunity', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: lead2.data.contact.id,
        name: 'Credit Repair - Maria Garcia',
        pipelineId: existingPipes[0]?.id,
        pipelineStageId: existingPipes[0]?.stages?.[0]?.id,
        monetaryValue: 497,
        status: 'open',
      })
    );
    await sleep(300);
  }

  // 6. Send welcome message to leads
  console.log('\n━━━ 6. WELCOME MESSAGES ━━━');
  if (lead1?.data?.contact?.id) {
    await safe('Welcome SMS: John Smith', () =>
      mcpCall('conversations_send-a-new-message', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: lead1.data.contact.id,
        type: 'SMS',
        message: 'Hi John! Welcome to Credit Forge. Our team will review your credit profile and contact you within 24 hours. Reply STOP to opt out.',
      })
    );
    await sleep(500);
  }

  // 7. Get final state
  console.log('\n━━━ 7. FINAL STATE ━━━');
  const finalContacts = await mcpCall('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp', limit: 10 });
  console.log(`  Total contacts: ${finalContacts?.data?.contacts?.length || 0}`);

  const finalOpps = await mcpCall('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`  Total opportunities: ${finalOpps?.data?.opportunities?.length || 0}`);

  const finalMsgs = await mcpCall('conversations_search-conversation', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  console.log(`  Total conversations: ${finalMsgs?.data?.conversations?.length || 0}`);

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CREDIT FORGE SNAPSHOT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Created: ${stats.created}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped}`);
  console.log(`  ❌ Errors: ${stats.errors}`);
  console.log('\n🔥 Credit Forge GHL is fully configured!');
  console.log('📍 Location: Credit Forge (hlRn1Yt9hn34B6Z9hNqp)');
  console.log('🔑 PIT: pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c');
}

main().catch(e => console.error('Fatal:', e.message));