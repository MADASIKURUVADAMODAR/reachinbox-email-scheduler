import type { Request, Response } from 'express';

import { pool } from '../config/database.js';
import { redis } from '../config/redis.js';

const buildResponse = (status: 'ok' | 'error', dependencies: Record<string, 'healthy' | 'unhealthy'>) => ({
  status,
  service: 'reachinbox-backend',
  dependencies,
  timestamp: new Date().toISOString(),
});

export async function getHealth(_request: Request, response: Response): Promise<void> {
  const dependencies: Record<string, 'healthy' | 'unhealthy'> = {
    postgresql: 'unhealthy',
    redis: 'unhealthy',
  };

  try {
    const { rowCount } = await pool.query('SELECT 1 as ok');
    if (rowCount !== null && rowCount > 0) {
      dependencies.postgresql = 'healthy';
    }
  } catch (error) {
    console.error('[health] PostgreSQL health check failed:', error);
  }

  try {
    const result = await redis.ping();
    if (result === 'PONG') {
      dependencies.redis = 'healthy';
    }
  } catch (error) {
    console.error('[health] Redis health check failed:', error);
  }

  const isHealthy = dependencies.postgresql === 'healthy' && dependencies.redis === 'healthy';

  if (!isHealthy) {
    const failedDependency = dependencies.postgresql === 'unhealthy' ? 'postgresql' : 'redis';

    response.status(503).json({
      ...buildResponse('error', dependencies),
      error: `Dependency unhealthy: ${failedDependency}`,
    });
    return;
  }

  response.status(200).json(buildResponse('ok', dependencies));
}