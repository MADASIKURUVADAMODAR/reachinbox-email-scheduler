import { DelayedError, Job, Worker, type WorkerOptions } from 'bullmq';

import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import {
  claimEmailForProcessing,
  getEmailById,
  markEmailFailed,
  markEmailScheduledForRetry,
  markEmailSentWithMetadata,
} from '../services/email.repository.js';
import { reserveHourlySendSlot } from '../services/email.rate-limit.service.js';
import { recoverMissingScheduledEmailJobs } from '../services/email.scheduler.service.js';
import { sendEmail } from '../services/email.service.js';
import { resolveSmtpConfigForSender } from '../services/sender.smtp.service.js';
import type { EmailJobData, EmailJobResult } from '../types/queue.types.js';

const EMAIL_WORKER_QUEUE_NAME = 'email-scheduler';
const PROCESSING_RETRY_DELAY_MS = 15_000;

const getWorkerConcurrency = (): number => {
  const rawConcurrency = Number(process.env.WORKER_CONCURRENCY ?? '5');

  return Number.isFinite(rawConcurrency) && rawConcurrency > 0 ? Math.floor(rawConcurrency) : 5;
};

let emailWorker: Worker<EmailJobData, EmailJobResult> | null = null;

const createProcessedResult = (job: Job<EmailJobData, EmailJobResult>, data: EmailJobData): EmailJobResult => ({
  ok: true,
  emailId: data.emailId,
  recipientEmail: data.recipientEmail,
  scheduledAt: data.scheduledAt,
  jobId: job.id ?? 'unknown',
  status: 'processed',
});

const scheduleCurrentJobForLater = async (
  job: Job<EmailJobData, EmailJobResult>,
  token: string | undefined,
  nextScheduledAtIso: string
): Promise<void> => {
  const nextTimestamp = new Date(nextScheduledAtIso).getTime();

  await job.updateData({
    ...job.data,
    scheduledAt: nextScheduledAtIso,
  });

  if (!token) {
    throw new Error('Worker token is unavailable for delayed rescheduling.');
  }

  await job.moveToDelayed(nextTimestamp, token);
  throw new DelayedError(`Job ${job.id ?? 'unknown'} moved to delayed state`);
};

export const startEmailWorker = async (): Promise<Worker<EmailJobData, EmailJobResult>> => {
  if (emailWorker) {
    return emailWorker;
  }

  const workerOptions: WorkerOptions = {
    connection: redis,
    concurrency: getWorkerConcurrency(),
  };

  emailWorker = new Worker<EmailJobData, EmailJobResult>(
    EMAIL_WORKER_QUEUE_NAME,
    async (job: Job<EmailJobData, EmailJobResult>, token?: string) => {
      const { emailId, recipientEmail, scheduledAt, subject, body } = job.data;

      console.info(`[BullMQ] Processing job ${job.id ?? 'unknown'}`);
      console.info(`[BullMQ] Email ID: ${emailId}`);
      console.info(`[BullMQ] Recipient: ${recipientEmail}`);
      console.info(`[BullMQ] Scheduled at: ${scheduledAt}`);

      const claimedRecord = await claimEmailForProcessing(emailId);
      if (!claimedRecord) {
        const existingRecord = await getEmailById(emailId);
        if (!existingRecord) {
          throw new Error(`Email record not found for id ${emailId}`);
        }

        if (existingRecord.status === 'sent') {
          console.info(`[SMTP] Skipping already-sent email ${emailId}`);
          return createProcessedResult(job, job.data);
        }

        if (existingRecord.status === 'processing') {
          const nextRetryAt = new Date(Date.now() + PROCESSING_RETRY_DELAY_MS).toISOString();
          await markEmailScheduledForRetry(emailId, 'Another worker is processing this email', nextRetryAt);
          await scheduleCurrentJobForLater(job, token, nextRetryAt);
        }

        const currentStatus = existingRecord.status;
        throw new Error(`Email ${emailId} is not sendable in status ${currentStatus}`);
      }

      const { senderScope, smtpConfig } = await resolveSmtpConfigForSender(claimedRecord.senderId);
      const rateLimit = await reserveHourlySendSlot(senderScope, env.MAX_EMAILS_PER_HOUR);
      if (!rateLimit.allowed) {
        await markEmailScheduledForRetry(emailId, 'Hourly sender rate limit reached', rateLimit.nextAvailableAt);
        await scheduleCurrentJobForLater(job, token, rateLimit.nextAvailableAt);
      }

      console.info(`[SMTP] Sending email ${emailId}`);

      try {
        const { messageId, previewUrl } = await sendEmail({
          from: claimedRecord.senderEmail,
          to: recipientEmail,
          subject: subject || claimedRecord.subject,
          text: body || claimedRecord.body,
          smtpConfig,
        });

        const updatedEmail = await markEmailSentWithMetadata(emailId, messageId ?? null, previewUrl ?? null);
        if (!updatedEmail) {
          throw new Error(`Failed to mark email as sent: ${emailId}`);
        }

        console.info('[SMTP] Email sent successfully');
        console.info(`[SMTP] Message ID: ${messageId ?? 'unknown'}`);
        console.info(`[SMTP] Preview URL: ${previewUrl ?? 'not available'}`);

        return createProcessedResult(job, job.data);
      } catch (error) {
        const safeMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
        const attempts = Number(job.opts.attempts ?? 1);
        const currentAttempt = job.attemptsMade + 1;

        if (currentAttempt < attempts) {
          const retryAt = new Date(Date.now() + 2_000).toISOString();
          await markEmailScheduledForRetry(emailId, safeMessage, retryAt);
        } else {
          await markEmailFailed(emailId, safeMessage);
        }

        console.error('[SMTP] Email send failed:', safeMessage);
        throw error;
      }
    },
    workerOptions
  );

  emailWorker.on('completed', (job, result) => {
    console.info(`[BullMQ] Email job completed ${job.id ?? 'unknown'}`);
    console.info(`[BullMQ] Completion result: ${JSON.stringify(result)}`);
  });

  emailWorker.on('failed', (job, error) => {
    console.error(
      `[BullMQ] Failed job ${job?.id ?? 'unknown'} emailId=${job?.data.emailId ?? 'unknown'} error=${error.message}`
    );
  });

  emailWorker.on('error', (error) => {
    console.error('[BullMQ] Worker error:', error);
  });

  await recoverMissingScheduledEmailJobs();

  return emailWorker;
};

export const stopEmailWorker = async (): Promise<void> => {
  if (!emailWorker) {
    return;
  }

  await emailWorker.close();
  emailWorker = null;
};

export { emailWorker };
export default startEmailWorker;
