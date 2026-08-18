import { getSenderById } from './email.repository.js';
import type { SenderSmtpConfig } from '../types/email.types.js';

interface ResolvedSmtpConfig {
  senderScope: string;
  smtpConfig: SenderSmtpConfig;
}

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getEnvSmtpConfig = (): SenderSmtpConfig => {
  const host = process.env.ETHEREAL_HOST;
  const user = process.env.ETHEREAL_USER;
  const password = process.env.ETHEREAL_PASSWORD;

  if (!host || !user || !password) {
    throw new Error('Missing required Ethereal SMTP environment variables.');
  }

  return {
    host,
    port: parsePort(process.env.ETHEREAL_PORT, 587),
    secure: false,
    user,
    password,
  };
};

export async function resolveSmtpConfigForSender(senderId: string | null): Promise<ResolvedSmtpConfig> {
  const fallback = getEnvSmtpConfig();

  if (!senderId) {
    return {
      senderScope: 'global',
      smtpConfig: fallback,
    };
  }

  const sender = await getSenderById(senderId);
  if (!sender) {
    return {
      senderScope: 'global',
      smtpConfig: fallback,
    };
  }

  const smtpUser = sender.smtpUser ?? sender.etherealUser;
  const smtpPassword = sender.smtpPassword ?? sender.etherealPassword;

  if (typeof smtpUser !== 'string' || smtpUser.length === 0 || typeof smtpPassword !== 'string' || smtpPassword.length === 0) {
    return {
      senderScope: sender.id,
      smtpConfig: fallback,
    };
  }

  return {
    senderScope: sender.id,
    smtpConfig: {
      host: sender.smtpHost ?? fallback.host,
      port: sender.smtpPort ?? fallback.port,
      secure: sender.smtpSecure,
      user: smtpUser,
      password: smtpPassword,
    },
  };
}
