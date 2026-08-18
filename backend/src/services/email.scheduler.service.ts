import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { emailQueue } from '../queues/email.queue.js';
import {
  buildIdempotencyKey,
  createCampaignAndEmails,
  createSender,
  getEmailByIdempotencyKey,
  getSenderByUserAndEmail,
  listScheduledEmailsForRecovery,
} from './email.repository.js';
import type { EmailJobData } from '../types/queue.types.js';
import type { ScheduleEmailInput } from '../schemas/email.schedule.schema.js';

export interface ScheduleEmailResultItem {
  id: string;
  recipientEmail: string;
  scheduledAt: string;
}

export interface ScheduleEmailResult {
  message: 'Emails scheduled successfully';
  emails: ScheduleEmailResultItem[];
}

const EMAIL_JOB_PREFIX = 'email';

const DEVELOPMENT_USER_EMAIL = 'dev@reachinbox.local';
const DEVELOPMENT_USER_GOOGLE_ID = 'local-dev-user';
const DEVELOPMENT_USER_NAME = 'Local Development User';

export async function getOrCreateDevelopmentUserId(): Promise<string> {
  const client = await pool.connect();

  try {
    const existing = await client.query<{ id: string }>(`
      SELECT id
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [DEVELOPMENT_USER_EMAIL]);

    if (existing.rows[0]) {
      return existing.rows[0].id;
    }

    const created = await client.query<{ id: string }>(`
      INSERT INTO users (google_id, name, email)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [DEVELOPMENT_USER_GOOGLE_ID, DEVELOPMENT_USER_NAME, DEVELOPMENT_USER_EMAIL]);

    const userId = created.rows[0]?.id;
    if (!userId) {
      throw new Error('Could not create temporary development user for campaign scheduling.');
    }

    return userId;
  } finally {
    client.release();
  }
}

const getDefaultSmtpHost = (): string => process.env.ETHEREAL_HOST ?? 'smtp.ethereal.email';

const getDefaultSmtpPort = (): number => {
  const parsed = Number(process.env.ETHEREAL_PORT ?? '587');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 587;
};

async function getOrCreateSenderForUser(userId: string, senderEmail: string): Promise<{ id: string; email: string; hourlyLimit: number }> {
  const existing = await getSenderByUserAndEmail(userId, senderEmail);
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      hourlyLimit: existing.hourlyLimit,
    };
  }

  const created = await createSender({
    userId,
    email: senderEmail,
    smtpHost: getDefaultSmtpHost(),
    smtpPort: getDefaultSmtpPort(),
    smtpSecure: false,
    smtpUser: process.env.ETHEREAL_USER ?? null,
    smtpPassword: process.env.ETHEREAL_PASSWORD ?? null,
    etherealUser: process.env.ETHEREAL_USER ?? null,
    etherealPassword: process.env.ETHEREAL_PASSWORD ?? null,
    hourlyLimit: env.MAX_EMAILS_PER_HOUR,
  });

  return {
    id: created.id,
    email: created.email,
    hourlyLimit: created.hourlyLimit,
  };
}

const buildJobId = (emailId: string): string => `${EMAIL_JOB_PREFIX}-${emailId}`;

const computeRecipientSchedule = (baseScheduledAt: string, recipients: string[], delayMs: number): Array<{ recipientEmail: string; scheduledAt: string }> => {
  if (delayMs < 0) {
    throw new Error('EMAIL_DELAY_MS cannot be negative');
  }

  const baseTime = new Date(baseScheduledAt).getTime();

  return recipients.map((recipientEmail, index) => ({
    recipientEmail,
    scheduledAt: new Date(baseTime + index * delayMs).toISOString(),
  }));
};

export async function recoverMissingScheduledEmailJobs(): Promise<void> {
  const scheduledEmails = await listScheduledEmailsForRecovery();

  for (const email of scheduledEmails) {
    const jobId = buildJobId(email.id);
    const existingJob = await emailQueue.getJob(jobId);
    if (existingJob) {
      continue;
    }

    const delayRemainingMs = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());
    const jobData: EmailJobData = {
      emailId: email.id,
      campaignId: email.campaignId,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      senderId: email.senderId,
      scheduledAt: email.scheduledAt,
      idempotencyKey: email.idempotencyKey,
    };

    await emailQueue.add(jobId, jobData, {
      delay: delayRemainingMs,
      jobId,
    });
  }
}

export async function scheduleEmails(input: ScheduleEmailInput): Promise<ScheduleEmailResult> {
  const scheduledAt = new Date(input.scheduledAt).toISOString();
  const scheduledItems: ScheduleEmailResultItem[] = [];
  const delayMs = env.EMAIL_DELAY_MS;
  const recipientSchedule = computeRecipientSchedule(scheduledAt, input.recipients, delayMs);

  for (const entry of recipientSchedule) {
    const idempotencyKey = buildIdempotencyKey(input.senderEmail, entry.recipientEmail, input.subject, entry.scheduledAt);
    const existing = await getEmailByIdempotencyKey(idempotencyKey);

    if (existing) {
      throw new Error('Duplicate scheduling request');
    }
  }

  const userId = await getOrCreateDevelopmentUserId();
  const sender = await getOrCreateSenderForUser(userId, input.senderEmail);

  const { campaign, emails } = await createCampaignAndEmails({
    userId,
    senderId: sender.id,
    senderEmail: sender.email,
    subject: input.subject,
    body: input.body,
    startTime: scheduledAt,
    delayMs,
    hourlyLimit: sender.hourlyLimit,
    scheduledAt,
    recipients: input.recipients,
  });

  for (const email of emails) {
    const jobData: EmailJobData = {
      emailId: email.id,
      campaignId: campaign.id,
      recipientEmail: email.recipientEmail,
      subject: input.subject,
      body: input.body,
      senderId: email.senderId,
      scheduledAt: email.scheduledAt,
      idempotencyKey: email.idempotencyKey,
    };

    const delayRemainingMs = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());
    const jobName = buildJobId(email.id);

    try {
      await emailQueue.add(jobName, jobData, {
        delay: delayRemainingMs,
        jobId: jobName,
      });
    } catch (error) {
      console.error('[email-scheduler] Failed to enqueue BullMQ jobs after DB commit.', {
        campaignId: campaign.id,
        emailId: email.id,
        recipientEmail: email.recipientEmail,
        scheduledAt: email.scheduledAt,
        error,
      });
      throw new Error('Failed to enqueue scheduled email jobs');
    }

    scheduledItems.push({
      id: email.id,
      recipientEmail: email.recipientEmail,
      scheduledAt: email.scheduledAt,
    });
  }

  return {
    message: 'Emails scheduled successfully',
    emails: scheduledItems,
  };
}
