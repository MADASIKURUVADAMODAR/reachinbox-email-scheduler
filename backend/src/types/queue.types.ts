export interface EmailJobData {
  emailId: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderId: string | null;
  scheduledAt: string;
  idempotencyKey: string;
}

export interface EmailJobResult {
  ok: true;
  emailId: string;
  recipientEmail: string;
  scheduledAt: string;
  jobId: string;
  status: 'processed';
}
