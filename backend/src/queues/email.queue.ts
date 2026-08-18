import { Queue, type JobsOptions } from 'bullmq';

import { redis } from '../config/redis.js';
import type { EmailJobData } from '../types/queue.types.js';

const EMAIL_QUEUE_NAME = 'email-scheduler';

const queueOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    count: 100,
  },
  removeOnFail: {
    count: 50,
  },
};

const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: queueOptions,
});

export { EMAIL_QUEUE_NAME, emailQueue };
export default emailQueue;
