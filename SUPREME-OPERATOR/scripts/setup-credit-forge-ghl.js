#!/usr/bin/env node

/**
 * CREDIT FORGE — FULL GHL SNAPSHOT SETUP
 * Uses GHL MCP endpoint for full API access
 * Location: hlRn1Yt9hn34B6Z9hNqp
 * PIT: pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c
 */

const axios = require('axios');

const GHL = {
  apiKey: 'pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
  locationId: 'hlRn1Yt9hn34B6Z9hNqp',
  baseUrl: 'https://services.leadconnectorhq.com',
};

const client = axios.create({
  baseURL: GHL.baseUrl,
  headers: {
    Authorization: `Bearer ${GHL.apiKey}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
});

let stats = { created: 0, skipped: 0, errors: 0 };

async function safe(name, fn) {
  try {
    const r = await fn();
    stats.created++;
    console.log(`  ✅ ${name}`);
    return r;
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.msg || e.message || '';
    if (JSON.stringify(msg).includes('already') || e.response?.status === 409) {
      stats.skipped++;
      console.log(`  ⏭️  ${name} (exists)`);
    } else {
      stats.errors++;
      console.log(`  ❌ ${name}: ${JSON.stringify(msg).substring(0, 100)}`);
    }
    return null;
  }
}

async function main() {
  console.log('🔥 CREDIT FORGE — FULL GHL SNAPSHOT');
  console.log(`📍 ${GHL.locationId}`);
  console.log(`🔑 ${GHL.apiKey.substring(0, 20)}...\n`);

  // 1. Verify connection
  console.log('━━━ 1. CONNECTION ━━━');
  try {
    const loc = await client.get(`/locations/${GHL.locationId}`);
    console.log(`  ✅ ${loc.data?.location?.name}\n`);
  } catch (e) {
    console.log(`  ❌ ${e.message}\n`);
    return;
  }

  // 2. Create missing tags
  console.log('━━━ 2. TAGS ━━━');
  const neededTags = [
    'credit-forge', 'cf-intake-consumer', 'cf-consult-requested',
    'cf-analysis-complete', 'cf-docs-received', 'cf-report-uploaded',
    'cf-business-credit', 'cf-debt-validation-sent', 'cf-furnisher-dispute-sent',
    'cf-escalation-needed', 'cf-evidence-received', 'cf-milestone-complete',
    'cf-paid-client', 'cf-review-submitted',
    'contract-pending', 'contract-signed', 'active-client',
    'dispute-filed', 'dispute-resolved', 'payment-overdue',
    'premium-package', 'basic-package',
  ];

  for (const tag of neededTags) {
    await safe(tag, () =>
      client.post(`/locations/${GHL.locationId}/tags`, { name: tag })
    );
  }

  // 3. Create custom fields
  console.log('\n━━━ 3. CUSTOM FIELDS ━━━');
  const fields = [
    { name: 'Credit Score', dataType: 'NUMERICAL', fieldKey: 'credit_score' },
    { name: 'Credit Issues', dataType: 'TEXT', fieldKey: 'credit_issues' },
    { name: 'State', dataType: 'TEXT', fieldKey: 'state' },
    { name: 'Lead Source', dataType: 'TEXT', fieldKey: 'lead_source' },
    { name: 'Service Package', dataType: 'TEXT', fieldKey: 'service_package' },
    { name: 'Contract Value', dataType: 'NUMERICAL', fieldKey: 'contract_value' },
    { name: 'Contract Signed Date', dataType: 'DATE', fieldKey: 'contract_signed_date' },
    { name: 'Dispute Count', dataType: 'NUMERICAL', fieldKey: 'dispute_count' },
    { name: 'Last Dispute Date', dataType: 'DATE', fieldKey: 'last_dispute_date' },
    { name: 'Credit Improvement', dataType: 'NUMERICAL', fieldKey: 'credit_improvement' },
    { name: 'Relation Number', dataType: 'TEXT', fieldKey: 'relation_number' },
  ];

  for (const field of fields) {
    await safe(field.name, () =>
      client.post('/custom-fields/', {
        ...field,
        locationId: GHL.locationId,
        objectKey: 'location',
        parentId: GHL.locationId,
      })
    );
  }

  // 4. Create Credit Repair Pipeline
  console.log('\n━━━ 4. PIPELINES ━━━');
  const pipelineStages = [
    'Lead', 'Qualified', 'Contract Pending', 'Contract Signed',
    'Initial Assessment', 'Dispute Filed', 'Dispute Responded',
    'Active Service', 'Completed', 'Lost'
  ];

  await safe('Credit Repair Pipeline', () =>
    client.post('/pipelines/', {
      name: 'Credit Repair Pipeline',
      locationId: GHL.locationId,
      stages: pipelineStages.map(name => ({ name })),
    })
  );

  await safe('Referral Pipeline', () =>
    client.post('/pipelines/', {
      name: 'Referral Pipeline',
      locationId: GHL.locationId,
      stages: [
        { name: 'Referral Received' },
        { name: 'Contact Made' },
        { name: 'Qualified' },
        { name: 'Converted' },
      ],
    })
  );

  // 5. Create Calendars
  console.log('\n━━━ 5. CALENDARS ━━━');
  await safe('Free Consultation', () =>
    client.post('/calendars/', {
      name: 'Free Consultation',
      description: 'Free credit repair consultation',
      locationId: GHL.locationId,
      isActive: true,
    })
  );

  await safe('Progress Review', () =>
    client.post('/calendars/', {
      name: 'Progress Review',
      description: 'Monthly credit repair progress review',
      locationId: GHL.locationId,
      isActive: true,
    })
  );

  // 6. Create Forms
  console.log('\n━━━ 6. FORMS ━━━');
  await safe('Credit Score Assessment', () =>
    client.post('/forms/', {
      name: 'Credit Score Assessment',
      locationId: GHL.locationId,
      type: 'lead_capture',
      fields: [
        { type: 'text', name: 'firstName', label: 'First Name', required: true },
        { type: 'text', name: 'lastName', label: 'Last Name', required: true },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'phone', name: 'phone', label: 'Phone', required: true },
        { type: 'select', name: 'state', label: 'State', required: true, options: ['CA','TX','FL','NY','IL','PA','OH','GA','NC','MI','NJ','VA','WA','AZ','MA','TN','IN','MO','MD','WI','CO','MN','SC','AL','LA','KY','OR','OK','CT','UT','IA','NV','AR','MS','KS','NM','NE','WV','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WY','DC'] },
        { type: 'textarea', name: 'creditIssues', label: 'Describe your credit issues', required: false },
        { type: 'checkbox', name: 'consent', label: 'I agree to receive communications', required: true },
      ],
    })
  );

  // 7. Create test contact
  console.log('\n━━━ 7. TEST CONTACT ━━━');
  const testContact = await safe('Credit Forge Test Lead', () =>
    client.post('/contacts/', {
      firstName: 'Credit',
      lastName: 'Forge Test',
      email: 'creditforge@test.local',
      phone: '+15555550100',
      locationId: GHL.locationId,
      tags: ['credit-forge', 'cf-intake-consumer'],
      source: 'Credit Forge Snapshot',
    })
  );

  if (testContact?.data?.contact?.id) {
    const cid = testContact.data.contact.id;
    await safe('Test Task', () =>
      client.post('/tasks/', {
        contactId: cid,
        title: 'Initial Credit Assessment',
        description: 'Review credit report and identify issues',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        completed: false,
        locationId: GHL.locationId,
      })
    );

    await safe('Test Note', () =>
      client.post(`/contacts/${cid}/notes`, {
        body: 'Credit Forge snapshot setup completed.',
      })
    );
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CREDIT FORGE SNAPSHOT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅ Created: ${stats.created}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped}`);
  console.log(`  ❌ Errors: ${stats.errors}`);
  console.log('\n🔥 Credit Forge is LIVE in GHL!');
}

main().catch(e => console.error('Fatal:', e.message));