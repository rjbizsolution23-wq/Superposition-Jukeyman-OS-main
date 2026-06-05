#!/usr/bin/env node

/**
 * CREDIT FORGE — FORMS & FUNNELS API SETUP
 * Run this AFTER updating IAM permissions for your PIT token
 * Required scopes: forms.write, funnels.write, websites.write
 */

const axios = require('axios');

const GHL = {
  apiKey: 'pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
  locationId: 'hlRn1Yt9hn34B6Z9hNqp',
};

const rest = axios.create({
  baseURL: 'https://services.leadconnectorhq.com',
  headers: {
    Authorization: `Bearer ${GHL.apiKey}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
});

let s = { ok: 0, skip: 0, err: 0 };
async function safe(name, fn) {
  try {
    const r = await fn();
    s.ok++;
    console.log('  ✅ ' + name);
    return r;
  } catch (e) {
    const msg = e.response && e.response.data && (e.response.data.message || e.response.data.msg) || e.message;
    if (String(msg).includes('already')) { s.skip++; console.log('  ⏭️  ' + name + ' (exists)'); }
    else { s.err++; console.log('  ❌ ' + name + ': ' + String(msg).substring(0, 100)); }
    return null;
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      { type: 'select', name: 'servicePackage', label: 'Service Package', required: true, options: ['Premium Package — $997/mo (Full Service)', 'Basic Package — $497/mo (Essential Service)'] },
      { type: 'textarea', name: 'creditIssues', label: 'What credit issues are you facing?', required: false },
      { type: 'checkbox', name: 'consent', label: 'I agree to receive communications from Credit Forge. This is not a loan.', required: true },
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
      { type: 'file', name: 'proofOfAddress', label: 'Upload Proof of Address', required: true },
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
      { type: 'text', name: 'friendName', label: "Friend's Name", required: true },
      { type: 'email', name: 'friendEmail', label: "Friend's Email", required: true },
      { type: 'phone', name: 'friendPhone', label: "Friend's Phone", required: false },
      { type: 'textarea', name: 'message', label: 'Personal Message (optional)', required: false },
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
  console.log('🔥 CREDIT FORGE — FORMS API SETUP\n');
  console.log('⚠️  Make sure IAM permissions are updated for forms.write\n');

  for (const form of FORMS) {
    await safe(form.name, () =>
      rest.post('/forms/', {
        locationId: GHL.locationId,
        name: form.name,
        type: form.type,
        fields: form.fields,
      })
    );
    await sleep(500);
  }

  // List all forms
  console.log('\n━━━ ALL FORMS ━━━');
  try {
    const r = await rest.get('/forms/', { params: { locationId: GHL.locationId } });
    const forms = r.data.forms || [];
    console.log('Total forms: ' + forms.length);
    forms.forEach(f => console.log('  - ' + f.name + ' (' + f.id + ')'));
  } catch (e) {
    console.log('Could not list forms: ' + (e.response && e.response.data && e.response.data.message || e.message));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FORMS SETUP COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Created: ' + s.ok);
  console.log('  ⏭️  Skipped: ' + s.skip);
  console.log('  ❌ Errors: ' + s.err);

  if (s.err > 0) {
    console.log('\n⚠️  If you see IAM errors, update permissions at:');
    console.log('    GHL Dashboard → Settings → API → API Keys → Update Scopes');
    console.log('    Required: forms.write, funnels.write, websites.write');
  }
}

main().catch(e => console.error('Fatal:', e.message));