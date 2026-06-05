// packages/agents/credit-repair/src/index.ts — Credit Repair Agent
import axios from "axios";
import { z } from "zod";

// Environment variables
const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

// GHL API client
const ghlClient = axios.create({
  baseURL: "https://api.gohighlevel.com/v1",
  headers: {
    Authorization: `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// Credit repair workflow states
enum WorkflowState {
  LEAD_INTAKE = "lead_intake",
  CONTRACT_SIGNING = "contract_signing",
  DISPUTE_FILING = "dispute_filing",
  MONITORING = "monitoring",
  FOLLOW_UP = "follow_up",
  COMPLETED = "completed",
}

// Lead schema
const LeadSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  creditIssues: z.array(z.string()),
  state: z.string(),
});

// Contract schema
const ContractSchema = z.object({
  leadId: z.string(),
  amount: z.number(),
  services: z.array(z.string()),
  signed: z.boolean(),
});

// Dispute schema
const DisputeSchema = z.object({
  contractId: z.string(),
  creditor: z.string(),
  issue: z.string(),
  status: z.enum(["pending", "filed", "responded", "resolved"]),
});

class CreditRepairAgent {
  private workflowState: Map<string, WorkflowState> = new Map();

  // Lead intake and qualification
  async intakeLead(leadData: z.infer<typeof LeadSchema>) {
    const lead = LeadSchema.parse(leadData);

    // Create contact in GHL
    const ghlContact = await ghlClient.post(`/contacts/`, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      customFields: [
        { key: "credit_issues", value: lead.creditIssues.join(", ") },
        { key: "state", value: lead.state },
      ],
      tags: ["credit-repair-lead"],
    });

    const leadId = ghlContact.data.contact.id;
    this.workflowState.set(leadId, WorkflowState.LEAD_INTAKE);

    // Send welcome SMS via Twilio
    await this.sendSMS(
      lead.phone,
      `Hi ${lead.firstName}! Thanks for your interest in credit repair. We'll review your case and get back to you within 24 hours.`
    );

    // Generate personalized voice message
    await this.generateVoiceIntro(lead);

    return { leadId, status: "intake_complete" };
  }

  // Contract signing workflow
  async processContract(contractData: z.infer<typeof ContractSchema>) {
    const contract = ContractSchema.parse(contractData);

    if (!contract.signed) {
      // Send contract via GHL
      await ghlClient.post(`/contacts/${contract.leadId}/documents`, {
        name: "Credit Repair Contract",
        type: "contract",
        content: this.generateContractPDF(contract),
      });

      // Send contract link SMS
      const contact = await ghlClient.get(`/contacts/${contract.leadId}`);
      await this.sendSMS(
        contact.data.contact.phone,
        `Your credit repair contract is ready! Please review and sign: [Contract Link]`
      );
    } else {
      this.workflowState.set(contract.leadId, WorkflowState.CONTRACT_SIGNING);
      // Move to dispute filing
      await this.initiateDisputeFiling(contract.leadId);
    }

    return { status: "contract_processed" };
  }

  // Dispute filing automation
  async initiateDisputeFiling(leadId: string) {
    this.workflowState.set(leadId, WorkflowState.DISPUTE_FILING);

    // Get lead credit issues
    const contact = await ghlClient.get(`/contacts/${leadId}`);
    const creditIssues = contact.data.contact.customFields
      .find((f: any) => f.key === "credit_issues")
      ?.value.split(", ") || [];

    // Generate disputes for each issue
    for (const issue of creditIssues) {
      const dispute = {
        contractId: leadId,
        creditor: this.extractCreditor(issue),
        issue,
        status: "pending" as const,
      };

      await this.fileDispute(dispute);
    }

    this.workflowState.set(leadId, WorkflowState.MONITORING);
  }

  // File dispute with creditor
  async fileDispute(dispute: z.infer<typeof DisputeSchema>) {
    // Generate dispute letter
    const letter = this.generateDisputeLetter(dispute);

    // Send via physical mail (Click2Mail integration)
    await this.sendPhysicalMail(dispute.creditor, letter);

    // Update dispute status
    dispute.status = "filed";

    // Log in GHL
    await ghlClient.post(`/contacts/${dispute.contractId}/notes`, {
      body: `Dispute filed with ${dispute.creditor} for: ${dispute.issue}`,
    });
  }

  // Monitoring and follow-up
  async monitorProgress(leadId: string) {
    const state = this.workflowState.get(leadId);
    if (state === WorkflowState.MONITORING) {
      // Check for creditor responses
      const responses = await this.checkCreditorResponses(leadId);

      if (responses.length > 0) {
        // Send update SMS
        const contact = await ghlClient.get(`/contacts/${leadId}`);
        await this.sendSMS(
          contact.data.contact.phone,
          `Update: ${responses.length} creditor(s) have responded to your disputes. We're reviewing them now.`
        );
      }

      // Schedule follow-up
      setTimeout(() => this.followUp(leadId), 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  // Follow-up communication
  async followUp(leadId: string) {
    this.workflowState.set(leadId, WorkflowState.FOLLOW_UP);

    const contact = await ghlClient.get(`/contacts/${leadId}`);

    // Generate voice follow-up
    await this.generateVoiceFollowUp(contact.data.contact);

    // Send SMS
    await this.sendSMS(
      contact.data.contact.phone,
      `Hi ${contact.data.contact.firstName}! How are your credit repair results looking? Let's schedule a check-in call.`
    );
  }

  // Helper methods
  private async sendSMS(to: string, message: string) {
    // Call Twilio MCP tool via orchestrator
    const response = await axios.post("http://localhost:3001/execute", {
      tool: "send_sms",
      args: { to, message },
    });
    return response.data;
  }

  private async generateVoiceIntro(lead: z.infer<typeof LeadSchema>) {
    const text = `Hello ${lead.firstName}, thank you for contacting RJ Business Solutions about credit repair. We're experts in helping people like you improve their credit scores and remove negative items from their reports. We'll be in touch soon with next steps.`;

    await axios.post("http://localhost:3001/execute", {
      tool: "generate_speech",
      args: { text, voice_id: "21m00Tcm4TlvDq8ikWAM" },
    });
  }

  private async generateVoiceFollowUp(contact: any) {
    const text = `Hi ${contact.firstName}, this is RJ Business Solutions following up on your credit repair case. We'd love to discuss your progress and see how we can continue helping you achieve your credit goals.`;

    await axios.post("http://localhost:3001/execute", {
      tool: "generate_speech",
      args: { text, voice_id: "21m00Tcm4TlvDq8ikWAM" },
    });
  }

  private generateContractPDF(contract: z.infer<typeof ContractSchema>): string {
    // Placeholder for PDF generation
    return `Credit Repair Contract - Amount: $${contract.amount}, Services: ${contract.services.join(", ")}`;
  }

  private extractCreditor(issue: string): string {
    // Extract creditor name from issue description
    const creditorPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, // Capitalized words
    ];

    for (const pattern of creditorPatterns) {
      const match = issue.match(pattern);
      if (match && match[0].length > 3) {
        return match[0];
      }
    }

    return "Unknown Creditor";
  }

  private generateDisputeLetter(dispute: z.infer<typeof DisputeSchema>): string {
    return `
      DISPUTE LETTER

      To: ${dispute.creditor}
      Re: Account Dispute

      I am writing to dispute the following inaccurate information on my credit report:
      ${dispute.issue}

      Please investigate this matter and update my credit report accordingly.

      Sincerely,
      [Client Name]
      RJ Business Solutions Client
    `;
  }

  private async sendPhysicalMail(recipient: string, content: string) {
    // Click2Mail integration would go here
    console.log(`Sending physical mail to ${recipient}`);
  }

  private async checkCreditorResponses(leadId: string): Promise<any[]> {
    // Check for creditor responses (placeholder)
    return [];
  }
}

// Export for use
export { CreditRepairAgent, WorkflowState };