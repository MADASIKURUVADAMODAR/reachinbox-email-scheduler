import { z } from 'zod';

const isoDateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'scheduledAt must be a valid ISO datetime',
  });

export const scheduleEmailSchema = z.object({
  senderEmail: z.string().trim().email('senderEmail must be a valid email'),
  subject: z.string().trim().min(1, 'subject must be non-empty'),
  body: z.string().trim().min(1, 'body must be non-empty'),
  scheduledAt: isoDateString.refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'scheduledAt must be in the future',
  }),
  recipients: z
    .array(z.string().trim().email('Each recipient must be a valid email'))
    .min(1, 'recipients must contain at least one valid email'),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
