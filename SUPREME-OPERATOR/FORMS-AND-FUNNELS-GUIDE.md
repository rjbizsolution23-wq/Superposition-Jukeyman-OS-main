# 🔥 CREDIT FORGE — FORMS & FUNNEL SETUP GUIDE

## ⚠️ IMPORTANT: PIT Token Limitation

Your PIT token (`pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c`) does **not** have IAM permissions to create forms or funnels via the API. The GHL MCP endpoint also does not include form/funnel creation tools.

**To fix this, you need to:**

### Option 1: Update IAM Permissions (Recommended)
1. Log into GHL Dashboard
2. Go to **Settings** → **API** → **API Keys**
3. Find your PIT token
4. Update scopes to include:
   - `forms.write`
   - `funnels.write`
   - `websites.write`
   - `locations/custom-fields.write`

### Option 2: Create Forms/Funnels Manually in GHL
Use the HTML files in the `funnels/` folder as reference to manually create:

---

## 📋 FORMS TO CREATE IN GHL

### Form 1: Free Credit Score Assessment
- **Type:** Lead Capture
- **Fields:**
  - First Name (text, required)
  - Last Name (text, required)
  - Email (email, required)
  - Phone (phone, required)
  - State (dropdown, required)
  - Approximate Credit Score (number, optional)
  - Service Package (dropdown, required)
    - Premium Package — $997/mo
    - Basic Package — $497/mo
  - Credit Issues (textarea, optional)
  - Consent Checkbox (required)
- **Tags on submit:** `credit-repair-lead`, `cf-intake-consumer`
- **Workflow trigger:** Lead Nurture Sequence
- **Thank You Page:** Redirect to `/thank-you-assessment`

### Form 2: Free Consultation Booking
- **Type:** Appointment
- **Calendar:** Credit Forge — Free Consultation
- **Fields:**
  - First Name (text, required)
  - Last Name (text, required)
  - Email (email, required)
  - Phone (phone, required)
  - Preferred Call Time (dropdown, required)
  - Credit Concerns (textarea, optional)
- **Tags on submit:** `cf-consult-requested`, `lead::consultation-booked`
- **Workflow trigger:** Consultation Appointment Workflow

### Form 3: Client Document Upload
- **Type:** Lead Capture
- **Fields:**
  - First Name (text, required)
  - Last Name (text, required)
  - Email (email, required)
  - Government ID (file upload, required)
  - Proof of Address (file upload, required)
  - Credit Report (file upload, optional)
  - Authorization Checkbox (required)
- **Tags on submit:** `cf-docs-received`, `onboarding::id-received`
- **Workflow trigger:** Client Document Upload & Follow-Up

### Form 4: Referral Submission
- **Type:** Lead Capture
- **Fields:**
  - Your Name (text, required)
  - Your Email (email, required)
  - Friend's Name (text, required)
  - Friend's Email (email, required)
  - Friend's Phone (phone, optional)
  - Personal Message (textarea, optional)
- **Tags on submit:** `referral::referral-sent`
- **Workflow trigger:** Referral Milestone and Bonus Automation

### Form 5: Credit Dispute Details
- **Type:** Lead Capture
- **Fields:**
  - First Name (text, required)
  - Last Name (text, required)
  - Email (email, required)
  - Creditor Name (text, required)
  - Account Number (text, optional)
  - Dispute Reason (dropdown, required)
    - Not my account
    - Incorrect balance
    - Paid in full
    - Identity theft
    - Incorrect personal information
    - Account closed
    - Other
  - Dispute Details (textarea, required)
- **Tags on submit:** `cf-intake-consumer`, `dispute::round-1-prep`

---

## 🌐 FUNNEL / LANDING PAGE TO CREATE

### Funnel Name: Credit Forge — Main Funnel

#### Step 1: Landing Page
- **URL:** `creditforge.rjbusinesssolutions.org` or `rjbusinesssolutions.org/credit-forge`
- **Page Title:** Credit Repair | Credit Forge by RJ Business Solutions
- **Hero Section:**
  - Headline: "Take Control of Your Credit Score"
  - Subheadline: "Professional credit repair by RJ Business Solutions. We dispute inaccurate items, negotiate with creditors, and help you achieve the credit score you deserve."
  - CTA Button: "Get Free Assessment →"
  - Trust badges: "10K+ Clients | 2M+ Items Disputed | 85+ Avg Score Increase | 4.9★ Rating"
- **How It Works Section:** 3 steps (Assessment → Disputes → Improvement)
- **Pricing Section:** Premium ($997/mo) vs Basic ($497/mo)
- **FAQ Section:** 4 common questions
- **Lead Capture Form:** (same as Form 1 above)
- **Footer:** Company info, address, phone, email

#### Step 2: Thank You Page
- **URL:** `/thank-you`
- **Headline:** "You're All Set!"
- **Body:** "Our team will review your information and contact you within 24 hours. Check your email for next steps."
- **CTA:** "Book Your Free Consultation" (links to Form 2)

#### Step 3: Consultation Booking Page
- **URL:** `/book-consultation`
- **Embed:** Form 2 (Free Consultation Booking)
- **Calendar:** Credit Forge — Free Consultation

---

## 🔄 WORKFLOW AUTOMATION

### Workflow 1: Lead Nurture (Triggered by Form 1)
1. **Trigger:** Form submitted (Free Credit Score Assessment)
2. **Actions:**
   - Add tags: `credit-repair-lead`, `cf-intake-consumer`
   - Send email: "CF — Welcome & Next Steps" (immediate)
   - Send SMS: "Hi {{firstName}}! Welcome to Credit Forge..." (5 min delay)
   - Create task: "Follow up with lead" (1 hour delay, assign to sales rep)
   - Wait 24 hours
   - If no consultation booked → Send email: "CF — Contract Sent"
   - Wait 48 hours
   - If no response → Send SMS: "Hi {{firstName}}, ready to improve your credit?"

### Workflow 2: Contract Signed (Triggered by opportunity stage change)
1. **Trigger:** Opportunity moves to "Contract Signed" stage
2. **Actions:**
   - Add tags: `contract-signed`, `active-client`, `onboarding::contract-signed`
   - Send email: "CF — Contract Signed Confirmation" (immediate)
   - Send SMS: "Congratulations {{firstName}}! Your service is active." (immediate)
   - Create task: "Schedule initial consultation" (assign to specialist)
   - Trigger sub-workflow: Client Document Upload & Follow-Up

### Workflow 3: Dispute Filed (Triggered by tag)
1. **Trigger:** Tag `dispute::round-1-sent` added
2. **Actions:**
   - Send email: "CF — Dispute Round 1 Filed" (immediate)
   - Send SMS: "Hi {{firstName}}, Round 1 disputes filed..." (immediate)
   - Update custom field: `dispute_count`
   - Create task: "Monitor bureau responses" (30 day delay)

### Workflow 4: Payment Reminder (Triggered by billing tag)
1. **Trigger:** Tag `billing::payment-failed-1` added
2. **Actions:**
   - Send email: "CF — Payment Reminder" (immediate)
   - Send SMS: "Hi {{firstName}}, your payment is due..." (immediate)
   - Wait 3 days
   - If still failed → Tag `billing::payment-failed-2`
   - Send second reminder
   - Wait 3 days
   - If still failed → Tag `billing::payment-failed-3`
   - Send final notice + pause service

### Workflow 5: Score Milestone (Triggered by custom field)
1. **Trigger:** `credit_score` custom field updated
2. **Condition:** Score >= 700
3. **Actions:**
   - Add tag: `milestone::score-700-reached`
   - Send email: "CF — Milestone: Score 700+" (immediate)
   - Send SMS: "Congrats {{firstName}}! Your score hit 700+!" (immediate)

### Workflow 6: Win-Back (Triggered by tag)
1. **Trigger:** Tag `program::win-back-candidate` added
2. **Actions:**
   - Send email: "CF — Win-Back" (immediate)
   - Wait 7 days
   - If no response → Send SMS: "We miss you, {{firstName}}..."
   - Wait 14 days
   - If no response → Tag `lead::dead-lost`

---

## 📁 FILES CREATED

| File | Purpose |
|------|---------|
| `funnels/credit-forge-assessment-form.html` | Standalone assessment form HTML |
| `funnels/credit-forge-landing-page.html` | Full landing page with hero, pricing, FAQ, form |
| `funnels/credit-forge-consultation-form.html` | Consultation booking form |
| `funnels/credit-forge-document-upload.html` | Client document upload form |

---

## 🚀 QUICK START

1. **Update IAM permissions** for your PIT token (see Option 1 above)
2. **Run the API setup script** to create forms automatically:
   ```bash
   cd SUPREME-OPERATOR
   node scripts/setup-credit-forge-forms-api.js
   ```
3. **Or create manually** in GHL dashboard using the HTML files as reference
4. **Set up workflows** in GHL using the workflow definitions above
5. **Connect your domain** to the funnel landing page

---

**Once forms and funnels are created, Credit Forge will be a fully automated credit repair machine!** 🔥