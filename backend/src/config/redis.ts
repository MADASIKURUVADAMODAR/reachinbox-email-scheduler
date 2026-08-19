import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? '6379');
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redis = new Redis({
  host: redisHost,
  port: Number.isFinite(redisPort) && redisPort > 0 ? redisPort : 6379,
  password: redisPassword,
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
});

redis.on('connect', () => {
  console.info(`[redis] Connected to Redis at ${redisHost}:${redisPort}.`);
});

redis.on('ready', () => {
  console.info(`[redis] Redis is ready at ${redisHost}:${redisPort}.`);
});

redis.on('error', (error: Error) => {
  console.error('[redis] Redis connection error:', error.message);
});

export { redis };
export default redis;