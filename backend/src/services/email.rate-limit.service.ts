import { redis } from '../config/redis.js';

export interface RateLimitReservation {
  allowed: boolean;
  nextAvailableAt: string;
  hourWindowStart: string;
}

const HOUR_MS = 60 * 60 * 1000;

const reserveHourlySlotLua = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttlMs = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or '0')
if current < limit then
  current = redis.call('INCR', key)
  if current == 1 then
    redis.call('PEXPIRE', key, ttlMs)
  end
  return {1, current}
end

return {0, current}
`;

const getHourWindowStartMs = (timestampMs: number): number => {
  return Math.floor(timestampMs / HOUR_MS) * HOUR_MS;
};

const buildRateLimitKey = (senderScope: string, hourWindowStartMs: number): string => {
  return `email-rate-limit:${senderScope}:${hourWindowStartMs}`;
};

export async function reserveHourlySendSlot(senderScope: string, hourlyLimit: number): Promise<RateLimitReservation> {
  const nowMs = Date.now();
  const windowStartMs = getHourWindowStartMs(nowMs);
  const nextWindowStartMs = windowStartMs + HOUR_MS;
  const ttlMs = Math.max(1_000, nextWindowStartMs - nowMs + 1_000);

  const normalizedLimit = Number.isFinite(hourlyLimit) && hourlyLimit > 0 ? Math.floor(hourlyLimit) : 1;
  const key = buildRateLimitKey(senderScope, windowStartMs);

  const redisEval = redis as unknown as {
    eval: (...args: Array<string | number>) => Promise<unknown>;
  };

  const rawResult = await redisEval.eval(
    reserveHourlySlotLua,
    1,
    key,
    String(normalizedLimit),
    String(ttlMs)
  );
  const resultArray = Array.isArray(rawResult) ? rawResult : [0, 0];
  const allowedFlag = Number(resultArray[0] ?? 0) === 1;

  return {
    allowed: allowedFlag,
    nextAvailableAt: new Date(allowedFlag ? nowMs : nextWindowStartMs).toISOString(),
    hourWindowStart: new Date(windowStartMs).toISOString(),
  };
}
