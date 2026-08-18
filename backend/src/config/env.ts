import dotenv from 'dotenv';

dotenv.config();

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export interface AppEnv {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  EMAIL_DELAY_MS: number;
  MAX_EMAILS_PER_HOUR: number;
}

const rawPort = process.env.PORT;
const parsedPort = rawPort ? Number(rawPort) : 5000;

export const env: AppEnv = {
  PORT: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5000,
  NODE_ENV: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
    ? process.env.NODE_ENV
    : 'development',
  EMAIL_DELAY_MS: parsePositiveInteger(process.env.EMAIL_DELAY_MS, 2000),
  MAX_EMAILS_PER_HOUR: parsePositiveInteger(process.env.MAX_EMAILS_PER_HOUR, 200),
};