const axios = require('axios');
const MCP_URL = 'https://services.leadconnectorhq.com/mcp/';
const HEADERS = {
  Authorization: 'Bearer pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
  locationId: 'hlRn1Yt9hn34B6Z9hNqp',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};
let cid = 0;
async function mcp(tool, args) {
  cid++;
  const r = await axios.post(MCP_URL, { jsonrpc: '2.0', id: cid, method: 'tools/call', params: { name: tool, arguments: args || {} } }, { headers: HEADERS, responseType: 'text', timeout: 30000 });
  for (const line of r.data.split('\n')) {
    if (line.startsWith('data: ')) {
      try { const p = JSON.parse(line.substring(6)); if (p.result && p.result.content && p.result.content[0] && p.result.content[0].text) return JSON.parse(p.result.content[0].text); } catch(e) {}
    }
  }
  return null;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let s = { ok: 0, skip: 0, err: 0 };
async function safe(name, fn) {
  try {
    const r = await fn();
    if (r && r.success === false) { s.err++; console.log('  ❌ ' + name + ': ' + JSON.stringify(r.data && (r.data.message || r.data) || r).substring(0,120)); return null; }
    s.ok++; console.log('  ✅ ' + name); return r;
  } catch (e) {
    const m = e.message || '';
    if (m.includes('already') || m.includes('duplicate')) { s.skip++; console.log('  ⏭️  ' + name); }
    else { s.err++; console.log('  ❌ ' + name + ': ' + m.substring(0,120)); }
    return null;
  }
}

async function main() {
  console.log('🔥 CREDIT FORGE — WORKFLOW AUTOMATION SETUP\n');

  // ── 1. CALENDAR SLOTS ──
  console.log('━━━ 1. CALENDAR SLOTS ━━━');
  const calendars = await mcp('calendars_get-calendar-events', {
    locationId: 'hlRn1Yt9hn34B6Z9hNqp',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  console.log('  Calendars found:', calendars && calendars.data && calendars.data.calendars ? calendars.data.calendars.length : 0);
  if (calendars && calendars.data && calendars.data.calendars) {
    calendars.data.calendars.forEach(c => console.log('    - ' + c.name + ' (' + c.id + ')'));
  }

  // ── 2. VERIFY ALL CONTACTS ──
  console.log('\n━━━ 2. ALL CONTACTS ━━━');
  const allContacts = await mcp('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp', limit: 50 });
  const contacts = allContacts && allContacts.data && allContacts.data.contacts || [];
  console.log('  Total:', contacts.length);
  contacts.forEach(c => {
    const tags = (c.tags || []).slice(0, 3).join(',');
    console.log('    ' + c.firstName + ' ' + c.lastName + ' | ' + c.email + ' | ' + tags);
  });

  // ── 3. VERIFY ALL OPPORTUNITIES ──
  console.log('\n━━━ 3. ALL OPPORTUNITIES ───');
  const allOpps = await mcp('opportunities_search-opportunity', { location_id: 'hlRn1Yt9hn34B6Z9hNqp' });
  const opps = allOpps && allOpps.data && allOpps.data.opportunities || [];
  console.log('  Total:', opps.length);
  opps.forEach(o => console.log('    ' + o.name + ' | $' + o.monetaryValue + ' | ' + o.status));

  // ── 4. VERIFY ALL CONVERSATIONS ──
  console.log('\n━━━ 4. ALL CONVERSATIONS ━━━');
  const allMsgs = await mcp('conversations_search-conversation', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const convs = allMsgs && allMsgs.data && allMsgs.data.conversations || [];
  console.log('  Total:', convs.length);
  convs.forEach(c => console.log('    ' + c.id + ' | ' + c.lastMessageType + ' | unread:' + c.unreadCount));

  // ── 5. SEND SMS TO ALL LEADS WITHOUT CONVERSATIONS ──
  console.log('\n━━━ 5. FILLING GAPS ━━━');
  const leadContacts = contacts.filter(c => c.tags && c.tags.includes('credit-repair-lead'));
  for (const c of leadContacts) {
    const hasConv = convs.some(v => v.contactId === c.id);
    if (!hasConv) {
      await safe('SMS to ' + c.firstName + ' ' + c.lastName, () =>
        mcp('conversations_send-a-new-message', {
          locationId: 'hlRn1Yt9hn34B6Z9hNqp',
          contactId: c.id,
          type: 'SMS',
          message: 'Hi ' + c.firstName + '! Credit Forge here. We received your credit repair inquiry. Check your email for next steps. Reply STOP to opt out.',
        })
      );
      await sleep(400);
    }
  }

  // ── SUMMARY ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 WORKFLOW AUTOMATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Created: ' + s.ok);
  console.log('  ⏭️  Skipped: ' + s.skip);
  console.log('  ❌ Errors: ' + s.err);
  console.log('\\n📊 FINAL STATE:');
  console.log('  Contacts: ' + contacts.length);
  console.log('  Opportunities: ' + opps.length);
  console.log('  Conversations: ' + convs.length);
  console.log('\\n⚠️  FORMS & FUNNELS:');
  console.log('  The PIT token does not have IAM permissions for forms/funnels.');
  console.log('  You need to either:');
  console.log('  1. Update IAM permissions in GHL Settings > API > Scopes');
  console.log('  2. Create forms/funnels manually in GHL dashboard');
  console.log('  3. Use an OAuth token with full permissions');
}

main().catch(e => console.error('Fatal:', e.message));