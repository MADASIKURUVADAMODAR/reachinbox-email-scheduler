import { Router } from 'express';

import {
  getScheduledEmailsController,
  getSentEmailsController,
  scheduleEmailController,
} from '../controllers/email.controller.js';

const emailRouter = Router();

emailRouter.post('/schedule', scheduleEmailController);
emailRouter.get('/scheduled', getScheduledEmailsController);
emailRouter.get('/sent', getSentEmailsController);

export { emailRouter };

