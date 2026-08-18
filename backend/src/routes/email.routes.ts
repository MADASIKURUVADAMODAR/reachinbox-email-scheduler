import { Router } from 'express';

import { scheduleEmailController } from '../controllers/email.controller.js';

const emailRouter = Router();

emailRouter.post('/schedule', scheduleEmailController);

export { emailRouter };
