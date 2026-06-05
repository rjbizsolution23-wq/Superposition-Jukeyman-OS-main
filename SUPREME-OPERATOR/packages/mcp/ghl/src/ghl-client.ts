// packages/mcp/ghl/src/ghl-client.ts — Direct GHL API Client for Credit Forge Setup
import axios, { AxiosInstance } from "axios";

export class GHLClient {
  private client: AxiosInstance;
  private locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.locationId = locationId;
    this.client = axios.create({
      baseURL: "https://services.leadconnectorhq.com",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
    });
  }

  // ========== CONTACTS ==========
  async createContact(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    locationId?: string;
    customFields?: Array<{ id?: string; key?: string; field_value?: string; value?: string }>;
    tags?: string[];
    source?: string;
  }) {
    const response = await this.client.post("/contacts/", {
      ...data,
      locationId: data.locationId || this.locationId,
    });
    return response.data;
  }

  async getContact(contactId: string) {
    const response = await this.client.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: string, data: any) {
    const response = await this.client.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async searchContacts(query: string) {
    const response = await this.client.get("/contacts/", {
      params: { query, locationId: this.locationId },
    });
    return response.data;
  }

  // ========== OPPORTUNITIES ==========
  async createOpportunity(data: {
    contactId: string;
    name: string;
    pipelineId: string;
    pipelineStageId?: string;
    status?: string;
    monetaryValue?: number;
    locationId?: string;
  }) {
    const response = await this.client.post("/opportunities/", {
      ...data,
      locationId: data.locationId || this.locationId,
    });
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: any) {
    const response = await this.client.put(`/opportunities/${opportunityId}`, data);
    return response.data;
  }

  async getOpportunities(contactId?: string) {
    const response = await this.client.get("/opportunities/", {
      params: { contactId, locationId: this.locationId },
    });
    return response.data;
  }

  // ========== PIPELINES ==========
  async getPipelines() {
    const response = await this.client.get("/pipelines/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createPipeline(data: { name: string; stages: Array<{ name: string }> }) {
    const response = await this.client.post("/pipelines/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== TASKS ==========
  async createTask(data: {
    contactId: string;
    title: string;
    description?: string;
    dueDate?: string;
    assignedTo?: string;
    completed?: boolean;
  }) {
    const response = await this.client.post("/tasks/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== NOTES ==========
  async createNote(contactId: string, body: string) {
    const response = await this.client.post(`/contacts/${contactId}/notes`, {
      body,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== TAGS ==========
  async createTag(name: string) {
    try {
      const response = await this.client.post("/tags/", {
        name,
        locationId: this.locationId,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.msg?.includes("already exists")) {
        return { tag: { name }, message: "Tag already exists" };
      }
      throw error;
    }
  }

  async getTags() {
    const response = await this.client.get("/tags/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async addTagToContact(contactId: string, tags: string[]) {
    const response = await this.client.post(`/contacts/${contactId}/tags`, { tags });
    return response.data;
  }

  // ========== CUSTOM FIELDS ==========
  async getCustomFields() {
    const response = await this.client.get("/custom-fields/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createCustomField(data: {
    name: string;
    fieldType: string;
    dataType?: string;
    placeholder?: string;
    position?: number;
  }) {
    try {
      const response = await this.client.post("/custom-fields/", {
        ...data,
        locationId: this.locationId,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.msg?.includes("already exists")) {
        return { message: `Custom field "${data.name}" already exists` };
      }
      throw error;
    }
  }

  // ========== CAMPAIGNS ==========
  async getCampaigns() {
    const response = await this.client.get("/campaigns/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createCampaign(data: any) {
    const response = await this.client.post("/campaigns/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== WORKFLOWS ==========
  async getWorkflows() {
    const response = await this.client.get("/workflows/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createWorkflow(data: any) {
    const response = await this.client.post("/workflows/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== CALENDARS ==========
  async getCalendars() {
    const response = await this.client.get("/calendars/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createCalendar(data: {
    name: string;
    description?: string;
    timezone?: string;
    isActive?: boolean;
  }) {
    const response = await this.client.post("/calendars/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== APPOINTMENTS ==========
  async createAppointment(data: {
    contactId: string;
    calendarId: string;
    startTime: string;
    endTime: string;
    title?: string;
    notes?: string;
  }) {
    const response = await this.client.post("/appointments/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== SMS / EMAIL ==========
  async sendSMS(contactId: string, message: string) {
    const response = await this.client.post("/sms/send", {
      contactId,
      message,
      locationId: this.locationId,
    });
    return response.data;
  }

  async sendEmail(data: {
    contactId: string;
    subject: string;
    body: string;
    from?: string;
  }) {
    const response = await this.client.post("/emails/send", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== FORMS ==========
  async getForms() {
    const response = await this.client.get("/forms/", {
      params: { locationId: this.locationId },
    });
    return response.data;
  }

  async createForm(data: any) {
    const response = await this.client.post("/forms/", {
      ...data,
      locationId: this.locationId,
    });
    return response.data;
  }

  // ========== LOCATION INFO ==========
  async getLocation() {
    const response = await this.client.get(`/locations/${this.locationId}`);
    return response.data;
  }
}