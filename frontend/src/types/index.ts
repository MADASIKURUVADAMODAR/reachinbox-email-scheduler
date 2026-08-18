export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailRecord {
  id: string;
  campaignId: string;
  senderId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  smtpMessageId?: string | null;
  smtpPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  idempotencyKey: string;
}

export interface ScheduleEmailPayload {
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO string
  recipients: string[];
}

export interface ScheduleEmailResponse {
  campaign: {
    id: string;
    userId: string;
    senderId?: string | null;
    subject: string;
    body: string;
    startTime: string;
    delayMs: number;
    hourlyLimit: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  emails: EmailRecord[];
}

export interface ListEmailsResponse {
  emails: EmailRecord[];
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  redisConnected?: boolean;
  postgresConnected?: boolean;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}
