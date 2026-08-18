import { createHash } from 'node:crypto';

import { pool } from '../config/database.js';
import type { Pool, PoolClient } from 'pg';
import type {
  CampaignRecord,
  CampaignRow,
  CreateCampaignInput,
  CreateEmailInput,
  EmailRecord,
  EmailRow,
  EmailStatus,
  SenderRecord,
  SenderRow,
} from '../types/email.types.js';

type DatabaseClient = Pick<Pool | PoolClient, 'query'>;

const toCampaignRecord = (row: CampaignRow): CampaignRecord => ({
  id: row.id,
  userId: row.user_id,
  senderId: row.sender_id,
  subject: row.subject,
  body: row.body,
  startTime: row.start_time,
  delayMs: row.delay_ms,
  hourlyLimit: row.hourly_limit,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toEmailRecord = (row: EmailRow): EmailRecord => ({
  id: row.id,
  campaignId: row.campaign_id,
  senderId: row.sender_id,
  senderEmail: row.sender_email,
  recipientEmail: row.recipient_email,
  subject: row.subject,
  body: row.body,
  scheduledAt: row.scheduled_at,
  status: row.status,
  sentAt: row.sent_at,
  failedAt: row.failed_at,
  errorMessage: row.error_message,
  smtpMessageId: row.smtp_message_id,
  smtpPreviewUrl: row.smtp_preview_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  idempotencyKey: row.idempotency_key,
});

const toSenderRecord = (row: SenderRow): SenderRecord => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  email: row.email,
  smtpHost: row.smtp_host,
  smtpPort: row.smtp_port,
  smtpSecure: row.smtp_secure ?? false,
  smtpUser: row.smtp_user,
  smtpPassword: row.smtp_password,
  etherealUser: row.ethereal_user,
  etherealPassword: row.ethereal_password,
  hourlyLimit: row.hourly_limit,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const buildIdempotencyKey = (
  senderEmail: string,
  recipientEmail: string,
  subject: string,
  scheduledAt: string
): string => createHash('sha256')
  .update(`${senderEmail}:${recipientEmail}:${subject}:${scheduledAt}`)
  .digest('hex');

export async function createCampaign(input: CreateCampaignInput, client: DatabaseClient = pool): Promise<CampaignRecord> {
  const startTime = input.startTime instanceof Date ? input.startTime.toISOString() : input.startTime;
  const status = input.status ?? 'scheduled';

  const result = await client.query<CampaignRow>(`
    INSERT INTO campaigns (
      user_id,
      sender_id,
      subject,
      body,
      start_time,
      delay_ms,
      hourly_limit,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, [input.userId, input.senderId ?? null, input.subject, input.body, startTime, input.delayMs, input.hourlyLimit, status]);

  const row = result.rows[0];
  if (!row) {
    throw new Error('Could not create campaign record.');
  }

  return toCampaignRecord(row);
}

export async function createEmail(input: CreateEmailInput, client: DatabaseClient = pool): Promise<EmailRecord> {
  const scheduledAt = input.scheduledAt instanceof Date ? input.scheduledAt.toISOString() : input.scheduledAt;
  const idempotencyKey = input.idempotencyKey ?? buildIdempotencyKey(
    input.senderEmail,
    input.recipientEmail,
    input.subject,
    scheduledAt
  );

  const result = await client.query<EmailRow>(`
    INSERT INTO emails (
      campaign_id,
      sender_id,
      sender_email,
      recipient_email,
      subject,
      body,
      scheduled_at,
      status,
      idempotency_key,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, NOW(), NOW())
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING *
  `, [
    input.campaignId,
    input.senderId ?? null,
    input.senderEmail,
    input.recipientEmail,
    input.subject,
    input.body,
    scheduledAt,
    idempotencyKey,
  ]);

  const row = result.rows[0];
  if (!row) {
    const existing = await client.query<EmailRow>(`
      SELECT *
      FROM emails
      WHERE idempotency_key = $1
    `, [idempotencyKey]);

    if (existing.rows[0]) {
      return toEmailRecord(existing.rows[0]);
    }

    throw new Error('Could not create email record.');
  }

  return toEmailRecord(row);
}

export interface CreateCampaignAndEmailsInput {
  userId: string;
  senderId?: string | null;
  senderEmail: string;
  subject: string;
  body: string;
  startTime: string | Date;
  delayMs: number;
  hourlyLimit: number;
  scheduledAt: string | Date;
  recipients: string[];
}

export interface CreateCampaignAndEmailsResult {
  campaign: CampaignRecord;
  emails: EmailRecord[];
}

export async function createCampaignAndEmails(input: CreateCampaignAndEmailsInput): Promise<CreateCampaignAndEmailsResult> {
  const client = await pool.connect();

  try {
    if (input.delayMs < 0) {
      throw new Error('delayMs cannot be negative');
    }

    await client.query('BEGIN');

    const campaign = await createCampaign(
      {
        userId: input.userId,
        senderId: input.senderId ?? null,
        subject: input.subject,
        body: input.body,
        startTime: input.startTime,
        delayMs: input.delayMs,
        hourlyLimit: input.hourlyLimit,
        status: 'scheduled',
      },
      client
    );

    const createdEmails: EmailRecord[] = [];

    const baseScheduledAt = input.scheduledAt instanceof Date ? input.scheduledAt : new Date(input.scheduledAt);
    const baseScheduledAtMs = baseScheduledAt.getTime();

    for (const [index, recipientEmail] of input.recipients.entries()) {
      const scheduledAt = new Date(baseScheduledAtMs + index * input.delayMs).toISOString();
      const idempotencyKey = buildIdempotencyKey(input.senderEmail, recipientEmail, input.subject, scheduledAt);

      const createdEmail = await createEmail(
        {
          campaignId: campaign.id,
          senderId: input.senderId ?? null,
          senderEmail: input.senderEmail,
          recipientEmail,
          subject: input.subject,
          body: input.body,
          scheduledAt,
          idempotencyKey,
        },
        client
      );

      createdEmails.push(createdEmail);
    }

    await client.query('COMMIT');

    return {
      campaign,
      emails: createdEmails,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getEmailById(id: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    SELECT *
    FROM emails
    WHERE id = $1
  `, [id]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function getEmailByIdempotencyKey(idempotencyKey: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    SELECT *
    FROM emails
    WHERE idempotency_key = $1
  `, [idempotencyKey]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function listScheduledEmails(limit = 100): Promise<EmailRecord[]> {
  const result = await pool.query<EmailRow>(`
    SELECT *
    FROM emails
    WHERE status = 'scheduled'
      AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map(toEmailRecord);
}

export async function listSentEmails(limit = 100): Promise<EmailRecord[]> {
  const result = await pool.query<EmailRow>(`
    SELECT *
    FROM emails
    WHERE status = 'sent'
    ORDER BY sent_at DESC NULLS LAST
    LIMIT $1
  `, [limit]);

  return result.rows.map(toEmailRecord);
}

export async function markEmailProcessing(id: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function markEmailSent(id: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'sent',
        sent_at = NOW(),
        smtp_message_id = NULL,
        smtp_preview_url = NULL,
        updated_at = NOW(),
        failed_at = NULL,
        error_message = NULL
    WHERE id = $1
    RETURNING *
  `, [id]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function markEmailFailed(id: string, errorMessage: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'failed',
        failed_at = NOW(),
        error_message = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, errorMessage]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function markEmailSentWithMetadata(
  id: string,
  smtpMessageId: string | null,
  smtpPreviewUrl: string | null
): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'sent',
        sent_at = NOW(),
        smtp_message_id = $2,
        smtp_preview_url = $3,
        updated_at = NOW(),
        failed_at = NULL,
        error_message = NULL
    WHERE id = $1
    RETURNING *
  `, [id, smtpMessageId, smtpPreviewUrl]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function claimEmailForProcessing(id: string): Promise<EmailRecord | null> {
  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = $1
      AND status = 'scheduled'
    RETURNING *
  `, [id]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export async function markEmailScheduledForRetry(
  id: string,
  errorMessage: string,
  scheduledAt: string | Date
): Promise<EmailRecord | null> {
  const normalizedScheduledAt = scheduledAt instanceof Date ? scheduledAt.toISOString() : scheduledAt;

  const result = await pool.query<EmailRow>(`
    UPDATE emails
    SET status = 'scheduled',
        scheduled_at = $2,
        failed_at = NOW(),
        error_message = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, normalizedScheduledAt, errorMessage]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toEmailRecord(row);
}

export interface RecoverableScheduledEmail {
  id: string;
  campaignId: string;
  senderId: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  idempotencyKey: string;
}

export async function listScheduledEmailsForRecovery(limit = 5000): Promise<RecoverableScheduledEmail[]> {
  const result = await pool.query<EmailRow>(`
    SELECT *
    FROM emails
    WHERE status = 'scheduled'
    ORDER BY scheduled_at ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    senderId: row.sender_id,
    senderEmail: row.sender_email,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    scheduledAt: row.scheduled_at,
    idempotencyKey: row.idempotency_key,
  }));
}

export interface CreateSenderInput {
  userId: string;
  email: string;
  name?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  etherealUser?: string | null;
  etherealPassword?: string | null;
  hourlyLimit?: number;
}

export async function getSenderByUserAndEmail(userId: string, email: string): Promise<SenderRecord | null> {
  const result = await pool.query<SenderRow>(`
    SELECT *
    FROM senders
    WHERE user_id = $1
      AND email = $2
      AND is_active = TRUE
    LIMIT 1
  `, [userId, email]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toSenderRecord(row);
}

export async function getSenderById(id: string): Promise<SenderRecord | null> {
  const result = await pool.query<SenderRow>(`
    SELECT *
    FROM senders
    WHERE id = $1
      AND is_active = TRUE
    LIMIT 1
  `, [id]);

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return toSenderRecord(row);
}

export async function createSender(input: CreateSenderInput): Promise<SenderRecord> {
  const result = await pool.query<SenderRow>(`
    INSERT INTO senders (
      user_id,
      name,
      email,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      ethereal_user,
      ethereal_password,
      hourly_limit,
      is_active,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())
    ON CONFLICT (user_id, email)
    DO UPDATE SET
      name = EXCLUDED.name,
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_secure = EXCLUDED.smtp_secure,
      smtp_user = EXCLUDED.smtp_user,
      smtp_password = EXCLUDED.smtp_password,
      ethereal_user = EXCLUDED.ethereal_user,
      ethereal_password = EXCLUDED.ethereal_password,
      hourly_limit = EXCLUDED.hourly_limit,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING *
  `, [
    input.userId,
    input.name ?? null,
    input.email,
    input.smtpHost ?? null,
    input.smtpPort ?? null,
    input.smtpSecure ?? false,
    input.smtpUser ?? null,
    input.smtpPassword ?? null,
    input.etherealUser ?? null,
    input.etherealPassword ?? null,
    input.hourlyLimit ?? 200,
  ]);

  const row = result.rows[0];
  if (!row) {
    throw new Error('Could not create sender record.');
  }

  return toSenderRecord(row);
}

export type { EmailStatus };
