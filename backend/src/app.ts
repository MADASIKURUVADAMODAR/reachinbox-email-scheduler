import cors from 'cors';
import dotenv from 'dotenv';
import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express';

import { emailRouter } from './routes/email.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { testQueueRouter } from './routes/test-queue.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/emails', emailRouter);
app.use('/api/test/queue', testQueueRouter);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    message: 'Not Found',
  });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  response.status(500).json({
    message,
  });
};

app.use(errorHandler);

export { app };
export default app;