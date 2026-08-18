export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';
export type CampaignStatus = 'scheduled' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface CreateCampaignInput {
  userId: string;
  senderId?: string | null;
  subject: string;
  body: string;
  startTime: string | Date;
  delayMs: number;
  hourlyLimit: number;
  status?: CampaignStatus;
}

export interface CampaignRecord {
  id: string;
  userId: string;
  senderId: string | null;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRow {
  id: string;
  user_id: string;
  sender_id: string | null;
  subject: string;
  body: string;
  start_time: string;
  delay_ms: number;
  hourly_limit: number;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailInput {
  campaignId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  idempotencyKey?: string;
  senderId?: string | null;
}

export interface EmailRecord {
  id: string;
  campaignId: string;
  senderId: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  smtpMessageId: string | null;
  smtpPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  idempotencyKey: string;
}

export interface EmailRow {
  id: string;
  campaign_id: string;
  sender_id: string | null;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  scheduled_at: string;
  status: EmailStatus;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  smtp_message_id: string | null;
  smtp_preview_url: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key: string;
}

export interface SenderRecord {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  etherealUser: string | null;
  etherealPassword: string | null;
  hourlyLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SenderRow {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_password: string | null;
  ethereal_user: string | null;
  ethereal_password: string | null;
  hourly_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SenderSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}
