import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is not configured');
}

const redis = new Redis({
  ...new URL(redisUrl),
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
} as any);

redis.on('connect', () => {
  console.info('[redis] Connected to Redis.');
});

redis.on('ready', () => {
  console.info('[redis] Redis is ready.');
});

redis.on('error', (error: Error) => {
  console.error('[redis] Redis connection error:', error.message);
});

export { redis };
export default redis;