import http from 'node:http';

import { app } from './app.js';
import { env } from './config/env.js';
import { startEmailWorker } from './workers/email.worker.js';

const server = http.createServer(app);

let workerStarted = false;

server.listen(env.PORT, async () => {
  console.log(`Server running at http://localhost:${env.PORT}`);

  if (!workerStarted) {
    workerStarted = true;
    await startEmailWorker();
  }
});