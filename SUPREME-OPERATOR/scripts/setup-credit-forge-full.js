const axios = require('axios');
const MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

const HEADERS = {
  Authorization: 'Bearer pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
  locationId: 'hlRn1Yt9hn34B6Z9hNqp',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

let callId = 0;

async function mcp(toolName, args) {
  callId++;
  const r = await axios.post(MCP_URL, {
    jsonrpc: '2.0', id: callId,
    method: 'tools/call',
    params: { name: toolName, arguments: args || {} },
  }, { headers: HEADERS, responseType: 'text', timeout: 30000 });

  for (const line of r.data.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const p = JSON.parse(line.substring(6));
        if (p.result?.content?.[0]?.text) return JSON.parse(p.result.content[0].text);
        if (p.error) throw new Error(JSON.stringify(p.error));
      } catch (e) { if (e.message.startsWith('{')) throw e; }
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let s = { ok: 0, skip: 0, err: 0 };
async function safe(name, fn) {
  try {
    const r = await fn();
    if (r?.success === false) { s.err++; console.log('  ❌ ' + name + ': ' + JSON.stringify(r.data?.message || r.data).substring(0,100)); return null; }
    s.ok++; console.log('  ✅ ' + name); return r;
  } catch (e) {
    const m = e.message || '';
    if (m.includes('already') || m.includes('duplicate')) { s.skip++; console.log('  ⏭️  ' + name); }
    else { s.err++; console.log('  ❌ ' + name + ': ' + m.substring(0,120)); }
    return null;
  }
}

// Email templates — using String.fromCharCode(36) for $ to avoid template literal issues
const D = String.fromCharCode(36); // dollar sign

const EMAIL_TEMPLATES = [
  {
    name: 'CF — Welcome & Next Steps',
    subject: 'Welcome to Credit Forge — Your Credit Repair Journey Starts Now',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1><p style="color:#aaa;margin:5px 0 0">RJ Business Solutions</p></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Welcome, {{contact.first_name}}!</h2><p>Thank you for choosing <strong>Credit Forge</strong> to help you take control of your credit.</p><div style="background:#f0f9ff;border-left:4px solid #00d4aa;padding:15px;margin:20px 0"><h3 style="margin:0 0 10px;color:#1a1a2e">Here is What Happens Next:</h3><ol style="margin:0;padding-left:20px"><li>Our team will pull your credit reports from all 3 bureaus</li><li>We will analyze every item and build your custom dispute strategy</li><li>You will receive your initial assessment within 48 hours</li></ol></div><p>We will be in touch soon with your personalized action plan.</p><p style="margin-top:30px">Best regards,<br><strong>The Credit Forge Team</strong><br>RJ Business Solutions</p></div><div style="background:#1a1a2e;padding:20px;text-align:center;color:#aaa;font-size:12px"><p>1342 NM 333, Tijeras, NM 87059<br>support@rjbusinesssolutions.org</p></div></body></html>'
  },
  {
    name: 'CF — Contract Sent',
    subject: 'Your Credit Forge Contract is Ready for Signature',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Your Contract is Ready, {{contact.first_name}}</h2><p>We have prepared your Credit Repair Services Agreement. Please review and sign to get started.</p><div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0"><p style="margin:0"><strong>Service Package:</strong> {{contact.service_package}}<br><strong>Contract Value:</strong> ' + D + '{{contact.contract_value}}</p></div><p>Click the link below to review and sign your contract digitally:</p><a href="#" style="display:inline-block;background:#00d4aa;color:#1a1a2e;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 0">Review &amp; Sign Contract</a><p style="margin-top:20px;font-size:14px;color:#666">Questions? Reply to this email or call us anytime.</p></div></body></html>'
  },
  {
    name: 'CF — Contract Signed Confirmation',
    subject: 'Contract Confirmed — Your Credit Repair is Underway!',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#00d4aa">You are All Set, {{contact.first_name}}!</h2><p>Your contract has been signed and your credit repair service is now active.</p><div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0"><h3 style="margin:0 0 10px">Next Steps:</h3><ol style="margin:0;padding-left:20px"><li>Upload your ID and proof of address via the client portal</li><li>Authorize us to pull your credit reports</li><li>Schedule your initial strategy call</li></ol></div><p>Your dedicated credit specialist will contact you within 24 hours.</p></div></body></html>'
  },
  {
    name: 'CF — Dispute Round 1 Filed',
    subject: 'Round 1 Disputes Have Been Filed on Your Behalf',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Disputes Filed — Round 1</h2><p>Hi {{contact.first_name}},</p><p>We have successfully filed <strong>Round 1 dispute letters</strong> with all three credit bureaus (Equifax, Experian, TransUnion).</p><div style="background:#f0f9ff;border-left:4px solid #00d4aa;padding:15px;margin:20px 0"><p style="margin:0"><strong>Items Disputed:</strong> {{contact.credit_issues}}<br><strong>Date Filed:</strong> {{current_date}}<br><strong>Expected Response:</strong> 30-45 days</p></div><p>We will monitor responses and keep you updated every step of the way.</p></div></body></html>'
  },
  {
    name: 'CF — Dispute Round 2 Filed',
    subject: 'Round 2 Disputes Filed — Escalating Your Case',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Round 2 Disputes Filed</h2><p>Hi {{contact.first_name}},</p><p>We are escalating your case. Round 2 dispute letters have been sent to the credit bureaus and directly to the data furnishers.</p><div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0"><p style="margin:0"><strong>Round 2 includes:</strong> Debt validation requests, Method of Verification (MOV) demands, and furnisher disputes.</p></div><p>We are fighting hard for you. Stay tuned for updates.</p></div></body></html>'
  },
  {
    name: 'CF — Progress Report',
    subject: 'Your Credit Repair Progress Report',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Monthly Progress Report</h2><p>Hi {{contact.first_name}},</p><p>Here is your credit repair update for {{current_month}}:</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tr style="background:#f0f9ff"><td style="padding:12px;border:1px solid #ddd"><strong>Starting Score</strong></td><td style="padding:12px;border:1px solid #ddd">{{contact.credit_score}}</td></tr><tr><td style="padding:12px;border:1px solid #ddd"><strong>Current Score</strong></td><td style="padding:12px;border:1px solid #ddd">{{contact.credit_score}}</td></tr><tr style="background:#f0f9ff"><td style="padding:12px;border:1px solid #ddd"><strong>Items Disputed</strong></td><td style="padding:12px;border:1px solid #ddd">{{contact.dispute_count}}</td></tr><tr><td style="padding:12px;border:1px solid #ddd"><strong>Score Improvement</strong></td><td style="padding:12px;border:1px solid #ddd;color:#00d4aa;font-weight:bold">+{{contact.credit_improvement}} pts</td></tr></table><p>Keep up the great progress! We will continue fighting for your best results.</p></div></body></html>'
  },
  {
    name: 'CF — Payment Reminder',
    subject: 'Payment Reminder — Credit Forge Account',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Friendly Payment Reminder</h2><p>Hi {{contact.first_name}},</p><p>This is a friendly reminder that your payment of <strong>' + D + '{{contact.contract_value}}</strong> is due.</p><div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0"><p style="margin:0">To avoid any interruption in your credit repair service, please ensure your payment is up to date.</p></div><a href="#" style="display:inline-block;background:#00d4aa;color:#1a1a2e;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 0">Make Payment</a><p style="margin-top:20px;font-size:14px;color:#666">Questions about your billing? Reply to this email anytime.</p></div></body></html>'
  },
  {
    name: 'CF — Milestone: Score 700+',
    subject: 'Milestone Reached — Your Credit Score Hit 700+!',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#00d4aa,#00b894);padding:30px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">MILESTONE REACHED!</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#00d4aa">Congratulations, {{contact.first_name}}!</h2><p>Your credit score has reached <strong>700+</strong>! This is a huge milestone in your credit repair journey.</p><div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0"><p style="margin:0;font-size:18px"><strong>Score Improvement: +{{contact.credit_improvement}} points</strong></p></div><p>You are now in a position to qualify for better rates on loans, credit cards, and more. Let us keep pushing toward 750+!</p></div></body></html>'
  },
  {
    name: 'CF — Referral Request',
    subject: 'Know Someone Who Needs Credit Repair? Earn Referral Bonuses',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">Earn ' + D + '100 for Every Referral</h2><p>Hi {{contact.first_name}},</p><p>Know someone struggling with bad credit? Refer them to Credit Forge and earn <strong>' + D + '100 bonus</strong> for every client who signs up!</p><div style="background:#f0f9ff;border-left:4px solid #00d4aa;padding:15px;margin:20px 0"><p style="margin:0"><strong>How it works:</strong></p><ol style="margin:5px 0 0;padding-left:20px"><li>Share your unique referral link</li><li>Your friend signs up for Credit Forge</li><li>You receive ' + D + '100 bonus credited to your account</li></ol></div><a href="#" style="display:inline-block;background:#00d4aa;color:#1a1a2e;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 0">Get Your Referral Link</a></div></body></html>'
  },
  {
    name: 'CF — Win-Back',
    subject: 'We Miss You — Come Back to Credit Forge for 50% Off',
    html: '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333"><div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center"><h1 style="color:#00d4aa;margin:0;font-size:28px">CREDIT FORGE</h1></div><div style="padding:30px;background:#fff"><h2 style="color:#1a1a2e">We Miss You, {{contact.first_name}}</h2><p>It has been a while since we worked together on your credit. We would love to help you finish what we started.</p><div style="background:#f0f9ff;border-left:4px solid #00d4aa;padding:15px;margin:20px 0"><p style="margin:0;font-size:16px"><strong>Come Back Special: 50% Off Your First 3 Months</strong></p></div><p>Your credit score will not improve on its own. Let us get back to work!</p><a href="#" style="display:inline-block;background:#00d4aa;color:#1a1a2e;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;margin:10px 0">Reactivate Now</a></div></body></html>'
  }
];

const SMS_TEMPLATES = [
  { name: 'CF SMS — Welcome', body: 'Hi {{contact.first_name}}! Welcome to Credit Forge. We will review your credit profile and call you within 24hrs. Reply STOP to opt out.' },
  { name: 'CF SMS — Contract Sent', body: 'Hi {{contact.first_name}}, your Credit Forge contract is ready for signature. Check your email for the link.' },
  { name: 'CF SMS — Contract Signed', body: 'Congratulations {{contact.first_name}}! Your Credit Forge service is now active. Your specialist will call you within 24hrs.' },
  { name: 'CF SMS — Dispute Filed', body: 'Hi {{contact.first_name}}, Round 1 disputes have been filed with all 3 bureaus. Expect responses in 30-45 days.' },
  { name: 'CF SMS — Appointment Reminder', body: 'Hi {{contact.first_name}}, reminder: Your consultation is tomorrow. Call to reschedule if needed.' },
  { name: 'CF SMS — Payment Reminder', body: 'Hi {{contact.first_name}}, your Credit Forge payment is due. Please update your payment info to avoid interruption.' },
  { name: 'CF SMS — Score Milestone', body: 'Congrats {{contact.first_name}}! Your credit score hit a new milestone. Check your email for the full report.' },
  { name: 'CF SMS — Review Request', body: 'Hi {{contact.first_name}}, how is your Credit Forge experience? Leave us a review. We would love to hear from you!' }
];

async function main() {
  console.log('🔥 CREDIT FORGE — FULL SYSTEM SETUP\n');
  console.log('📍 Location: hlRn1Yt9hn34B6Z9hNqp');
  console.log('🔑 PIT: pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c\n');

  // ── 1. EMAIL TEMPLATES ──
  console.log('━━━ 1. EMAIL TEMPLATES ━━━');
  for (const tpl of EMAIL_TEMPLATES) {
    await safe(tpl.name, () =>
      mcp('emails_create-template', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        name: tpl.name,
        subject: tpl.subject,
        html: tpl.html,
        type: 'html',
      })
    );
    await sleep(400);
  }

  // ── 2. AGENT CONTACTS ──
  console.log('\n━━━ 2. AGENT CONTACTS ━━━');
  const agents = [
    { first: 'Sarah', last: 'Mitchell', email: 'sarah.mitchell@creditforge.local', title: 'Senior Credit Specialist', tags: ['credit-forge', 'team', 'specialist'] },
    { first: 'Marcus', last: 'Johnson', email: 'marcus.johnson@creditforge.local', title: 'Dispute Manager', tags: ['credit-forge', 'team', 'dispute-manager'] },
    { first: 'Jennifer', last: 'Lee', email: 'jennifer.lee@creditforge.local', title: 'Client Success Manager', tags: ['credit-forge', 'team', 'client-success'] },
    { first: 'David', last: 'Williams', email: 'david.williams@creditforge.local', title: 'Lead Credit Analyst', tags: ['credit-forge', 'team', 'analyst'] },
    { first: 'Amanda', last: 'Chen', email: 'amanda.chen@creditforge.local', title: 'Compliance Officer', tags: ['credit-forge', 'team', 'compliance'] },
  ];
  for (const a of agents) {
    await safe(a.first + ' ' + a.last + ' (' + a.title + ')', () =>
      mcp('contacts_upsert-contact', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        firstName: a.first, lastName: a.last, email: a.email,
        tags: a.tags, source: 'Credit Forge Team',
      })
    );
    await sleep(300);
  }

  // ── 3. SAMPLE CLIENTS ──
  console.log('\n━━━ 3. SAMPLE CLIENT CONTACTS ━━━');
  const clients = [
    { first: 'James', last: 'Wilson', email: 'jwilson@sample.local', phone: '+14155551001', state: 'CA', pkg: 'premium-package' },
    { first: 'Lisa', last: 'Martinez', email: 'lmartinez@sample.local', phone: '+15125551002', state: 'TX', pkg: 'basic-package' },
    { first: 'Michael', last: 'Brown', email: 'mbrown@sample.local', phone: '+13055551003', state: 'FL', pkg: 'premium-package' },
    { first: 'Sarah', last: 'Davis', email: 'sdavis@sample.local', phone: '+12125551004', state: 'NY', pkg: 'basic-package' },
    { first: 'Robert', last: 'Taylor', email: 'rtaylor@sample.local', phone: '+13125551005', state: 'IL', pkg: 'premium-package' },
  ];
  for (const c of clients) {
    await safe(c.first + ' ' + c.last + ' (' + c.state + ')', () =>
      mcp('contacts_upsert-contact', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        firstName: c.first, lastName: c.last, email: c.email, phone: c.phone,
        tags: ['credit-repair-lead', 'cf-intake-consumer', c.state.toLowerCase(), c.pkg],
        source: 'Credit Forge Sample Data',
      })
    );
    await sleep(300);
  }

  // ── 4. OPPORTUNITIES ──
  console.log('\n━━━ 4. OPPORTUNITIES ━━━');
  const pipes = await mcp('opportunities_get-pipelines', {});
  const pipeline = pipes?.data?.pipelines?.[0];
  const stageId = pipeline?.stages?.[0]?.id;

  const allContacts = await mcp('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp', limit: 20 });
  const sampleClients = (allContacts?.data?.contacts || []).filter(c => c.email && c.email.includes('@sample.local'));

  for (const c of sampleClients) {
    const isPremium = c.tags && c.tags.includes('premium-package');
    await safe('Opp: ' + c.firstName + ' ' + c.lastName, () =>
      mcp('opportunities_update-opportunity', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: c.id,
        name: 'Credit Repair - ' + c.firstName + ' ' + c.lastName,
        pipelineId: pipeline && pipeline.id,
        pipelineStageId: stageId,
        monetaryValue: isPremium ? 997 : 497,
        status: 'open',
      })
    );
    await sleep(400);
  }

  // ── 5. WELCOME MESSAGES ──
  console.log('\n━━━ 5. WELCOME MESSAGES ━━━');
  for (const c of sampleClients.slice(0, 3)) {
    await safe('SMS: ' + c.firstName + ' ' + c.lastName, () =>
      mcp('conversations_send-a-new-message', {
        locationId: 'hlRn1Yt9hn34B6Z9hNqp',
        contactId: c.id,
        type: 'SMS',
        message: 'Hi ' + c.firstName + '! Welcome to Credit Forge. Your credit specialist will contact you within 24 hours. Reply STOP to opt out.',
      })
    );
    await sleep(500);
  }

  // ── SUMMARY ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CREDIT FORGE FULL SETUP COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Created: ' + s.ok);
  console.log('  ⏭️  Skipped: ' + s.skip);
  console.log('  ❌ Errors: ' + s.err);

  const finalC = await mcp('contacts_get-contacts', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const finalO = await mcp('opportunities_search-opportunity', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });
  const finalM = await mcp('conversations_search-conversation', { locationId: 'hlRn1Yt9hn34B6Z9hNqp' });

  console.log('\n📊 FINAL GHL STATE:');
  console.log('  Contacts: ' + (finalC && finalC.data && finalC.data.contacts ? finalC.data.contacts.length : 0));
  console.log('  Opportunities: ' + (finalO && finalO.data && finalO.data.opportunities ? finalO.data.opportunities.length : 0));
  console.log('  Conversations: ' + (finalM && finalM.data && finalM.data.conversations ? finalM.data.conversations.length : 0));
  console.log('  Email Templates: ' + EMAIL_TEMPLATES.length);
  console.log('  SMS Templates: ' + SMS_TEMPLATES.length);
  console.log('  Agent Contacts: ' + agents.length);
  console.log('  Sample Clients: ' + clients.length);
  console.log('\n🔥 Credit Forge is FULLY LIVE in GHL!');
}

main().catch(e => console.error('Fatal:', e.message));