# 🚀 CREDIT FORGE GHL SETUP GUIDE

## Step 1: Get Your GHL API Key

1. **Log into GoHighLevel**: Go to your GHL account
2. **Navigate to Settings**: Click on Settings (gear icon)
3. **Find API Keys**: Look for "API Keys" or "Developer" section
4. **Generate API Key**: Create a new API key with full permissions
5. **Copy the Key**: It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 2: Update Environment Variables

Replace `YOUR_ACTUAL_GHL_API_KEY_HERE` in `.env.local` with your real API key:

```bash
# In SUPREME-OPERATOR/.env.local
GHL_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

## Step 3: Run Credit Forge Setup

Once you have the API key set:

```bash
cd SUPREME-OPERATOR
node scripts/setup-credit-forge-ghl.js
```

## What Gets Configured

### ✅ **Custom Fields Created**
- Credit Score (NUMBER)
- Credit Issues (TEXT)
- State (TEXT)
- Lead Source (TEXT)
- Service Package (TEXT)
- Contract Value (NUMBER)
- Contract Signed Date (DATE)
- Dispute Count (NUMBER)
- Last Dispute Date (DATE)
- Credit Improvement (NUMBER)

### ✅ **Tags System**
- credit-repair-lead, high-value-lead, contract-pending
- contract-signed, active-client, dispute-filed
- payment-overdue, referral-source, facebook-ad
- Geographic: california, texas, florida, new-york
- Packages: premium-package, basic-package

### ✅ **Pipelines**
- **Credit Repair Pipeline**: 10 stages (Lead → Completed)
- **Referral Pipeline**: 4 stages (Received → Converted)

### ✅ **Workflows**
- **Lead Nurture**: Auto email/SMS when lead created
- **Contract Signed**: Confirmation emails and tasks
- **Dispute Updates**: Progress notifications

### ✅ **Email Campaigns**
- **Lead Magnet**: Instant tips + nurture sequence
- **Renewal Campaign**: 11-month automated renewals

### ✅ **Forms**
- **Credit Assessment**: Lead capture with scoring
- **Consultation Booking**: Calendar integration

### ✅ **Templates**
- **Email**: Welcome, confirmation, dispute updates
- **SMS**: Reminders, confirmations, payment notices

### ✅ **Smart Lists**
- High-value leads (score < 600)
- Active clients, overdue payments
- Geographic segmentation

### ✅ **User Roles**
- Credit Specialists (contacts, opportunities, tasks)
- Sales Reps (leads, campaigns, forms)
- Admins (full access)

### ✅ **Calendar**
- Credit consultation bookings
- Business hours: Mon-Fri 9am-5pm

## 🎯 **Ready for Automation**

Once setup completes, your GHL account will have:

- **Automated lead processing** from forms/ads
- **Credit repair pipeline** with 10 stages
- **Contract workflows** with digital signatures
- **Dispute tracking** and progress updates
- **Client communication** via email/SMS
- **Renewal automation** for subscriptions
- **Compliance tracking** across states

## 🔑 **Your Three GHL Keys**

You mentioned three keys. Based on the template:

1. **GHL API Key** (from Settings → API Keys)
2. **Location ID** (hlRn1Yt9hn34B6Z9hNqp - already set)
3. **PIT ID** (pit-78985f78-b127-421b-9296-a64fb7b0035d - for relation tracking)

**Please provide your actual GHL API Key to complete the setup!**

---

*Once configured, Credit Forge will automate your entire credit repair business.*