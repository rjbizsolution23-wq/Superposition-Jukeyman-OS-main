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

// ── FORMS ────────────────────────────────────────────────────────
const FORMS = [
  {
    name: 'CF — Free Credit Score Assessment',
    type: 'lead_capture',
    fields: [
      { type: 'text', name: 'firstName', label: 'First Name', required: true },
      { type: 'text', name: 'lastName', label: 'Last Name', required: true },
      { type: 'email', name: 'email', label: 'Email Address', required: true },
      { type: 'phone', name: 'phone', label: 'Phone Number', required: true },
      { type: 'select', name: 'state', label: 'State', required: true, options: ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'] },
      { type: 'number', name: 'creditScore', label: 'Approximate Credit Score (optional)', required: false },
      { type: 'textarea', name: 'creditIssues', label: 'What credit issues are you facing?', required: false },
      { type: 'select', name: 'servicePackage', label: 'Service Package', required: true, options: ['Premium Package — $997/mo (Full Service)', 'Basic Package — $497/mo (Essential Service)'] },
      { type: 'checkbox', name: 'consent', label: 'I agree to receive communications from Credit Forge. I understand this is not a loan.', required: true },
    ]
  },
  {
    name: 'CF — Free Consultation Booking',
    type: 'appointment',
    fields: [
      { type: 'text', name: 'firstName', label: 'First Name', required: true },
      { type: 'text', name: 'lastName', label: 'Last Name', required: true },
      { type: 'email', name: 'email', label: 'Email Address', required: true },
      { type: 'phone', name: 'phone', label: 'Phone Number', required: true },
      { type: 'select', name: 'preferredTime', label: 'Preferred Call Time', required: true, options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'] },
      { type: 'textarea', name: 'concerns', label: 'What are your biggest credit concerns?', required: false },
    ]
  },
  {
    name: 'CF — Client Document Upload',
    type: 'lead_capture',
    fields: [
      { type: 'text', name: 'firstName', label: 'First Name', required: true },
      { type: 'text', name: 'lastName', label: 'Last Name', required: true },
      { type: 'email', name: 'email', label: 'Email Address', required: true },
      { type: 'file', name: 'idDocument', label: 'Upload Government ID', required: true },
      { type: 'file', name: 'proofOfAddress', label: 'Upload Proof of Address (utility bill, bank statement)', required: true },
      { type: 'file', name: 'creditReport', label: 'Upload Credit Report (optional)', required: false },
      { type: 'checkbox', name: 'authorization', label: 'I authorize Credit Forge to pull my credit reports and dispute inaccurate items on my behalf.', required: true },
    ]
  },
  {
    name: 'CF — Referral Submission',
    type: 'lead_capture',
    fields: [
      { type: 'text', name: 'referrerName', label: 'Your Name', required: true },
      { type: 'email', name: 'referrerEmail', label: 'Your Email', required: true },
      { type: 'text', name: 'friendName', label: 'Friend\'s Name', required: true },
      { type: 'email', name: 'friendEmail', label: 'Friend\'s Email', required: true },
      { type: 'phone', name: 'friendPhone', label: 'Friend\'s Phone', required: false },
      { type: 'textarea', name: 'message', label: 'Personal Message to Your Friend (optional)', required: false },
    ]
  },
  {
    name: 'CF — Credit Dispute Details',
    type: 'lead_capture',
    fields: [
      { type: 'text', name: 'firstName', label: 'First Name', required: true },
      { type: 'text', name: 'lastName', label: 'Last Name', required: true },
      { type: 'email', name: 'email', label: 'Email Address', required: true },
      { type: 'text', name: 'creditorName', label: 'Creditor / Collection Agency Name', required: true },
      { type: 'text', name: 'accountNumber', label: 'Account Number (if known)', required: false },
      { type: 'select', name: 'disputeReason', label: 'Reason for Dispute', required: true, options: ['Not my account', 'Incorrect balance', 'Paid in full', 'Identity theft', 'Incorrect personal information', 'Account closed', 'Other'] },
      { type: 'textarea', name: 'disputeDetails', label: 'Describe the issue in detail', required: true },
    ]
  }
];

async function main() {
  console.log('🔥 CREDIT FORGE — FORMS & FUNNEL SETUP\n');

  // ── 1. CREATE FORMS ──
  console.log('━━━ 1. CREATING FORMS ━━━');
  for (const form of FORMS) {
    await safe(form.name, () =>
      mcp('forms_create-form', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        name: form.name,
        type: form.type,
        fields: form.fields,
      })
    );
    await sleep(500);
  }

  // ── 2. LIST ALL FORMS ──
  console.log('\n━━━ 2. VERIFYING FORMS ───');
  const formsList = await mcp('forms_get-forms', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  if (formsList && formsList.data) {
    const forms = formsList.data.forms || formsList.data || [];
    console.log('  Total forms: ' + forms.length);
    forms.forEach(f => console.log('    - ' + f.name + ' (' + f.id + ')'));
  }

  // ── SUMMARY ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FORMS SETUP COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Created: ' + s.ok);
  console.log('  ⏭️  Skipped: ' + s.skip);
  console.log('  ❌ Errors: ' + s.err);
  console.log('\n🔥 Credit Forge forms are LIVE!');
}

main().catch(e => console.error('Fatal:', e.message));