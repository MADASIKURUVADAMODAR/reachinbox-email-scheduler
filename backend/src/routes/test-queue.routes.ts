import { Router } from 'express';

import { enqueueTestEmailJob } from '../controllers/test-queue.controller.js';

const testQueueRouter = Router();

// Temporary development-only BullMQ test route.
testQueueRouter.post('/', enqueueTestEmailJob);

export { testQueueRouter };
