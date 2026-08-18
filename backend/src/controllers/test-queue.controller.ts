import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import { emailQueue } from '../queues/email.queue.js';
import { createCampaignAndEmails } from '../services/email.repository.js';
import { getOrCreateDevelopmentUserId } from '../services/email.scheduler.service.js';
import type { EmailJobData } from '../types/queue.types.js';

// Temporary development-only integration test for BullMQ delayed processing.
export async function enqueueTestEmailJob(_request: Request, response: Response): Promise<void> {
  const delayMs = 10_000;
  const scheduledAt = new Date(Date.now() + delayMs).toISOString();
  const userId = await getOrCreateDevelopmentUserId();

  const { campaign, emails } = await createCampaignAndEmails({
    userId,
    senderEmail: 'sender@example.com',
    subject: 'BullMQ delayed test email',
    body: 'This is a temporary development-only BullMQ queue test.',
    startTime: scheduledAt,
    delayMs,
    hourlyLimit: env.MAX_EMAILS_PER_HOUR,
    scheduledAt,
    recipients: ['test-recipient@example.com'],
  });

  const createdEmail = emails[0];
  if (!createdEmail) {
    throw new Error('Could not create test email record.');
  }

  const jobName = `email-${createdEmail.id}`;

  const jobData: EmailJobData = {
    emailId: createdEmail.id,
    campaignId: campaign.id,
    recipientEmail: createdEmail.recipientEmail,
    subject: createdEmail.subject,
    body: createdEmail.body,
    senderId: null,
    scheduledAt: createdEmail.scheduledAt,
    idempotencyKey: createdEmail.idempotencyKey,
  };

  const job = await emailQueue.add(jobName, jobData, {
    delay: delayMs,
    jobId: jobName,
  });

  response.status(202).json({
    message: 'Test email job scheduled',
    jobId: job.id,
    emailId: createdEmail.id,
    campaignId: campaign.id,
    delayMs,
  });
}
