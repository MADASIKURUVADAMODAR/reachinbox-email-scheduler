import nodemailer from 'nodemailer';

import type { SenderSmtpConfig } from '../types/email.types.js';

interface SendEmailInput {
  from: string;
  to: string;
  subject: string;
  text: string;
  smtpConfig?: SenderSmtpConfig;
}

export interface SendEmailResult {
  messageId: string | undefined;
  previewUrl: string | null;
}

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getDefaultSmtpConfig = (): SenderSmtpConfig => ({
  host: getRequiredEnv('ETHEREAL_HOST'),
  port: Number(process.env.ETHEREAL_PORT ?? '587'),
  secure: false,
  user: getRequiredEnv('ETHEREAL_USER'),
  password: getRequiredEnv('ETHEREAL_PASSWORD'),
});

const transporterCache = new Map<string, nodemailer.Transporter>();

const getTransporter = (smtpConfig?: SenderSmtpConfig): nodemailer.Transporter => {
  const effectiveConfig = smtpConfig ?? getDefaultSmtpConfig();
  const cacheKey = [
    effectiveConfig.host,
    effectiveConfig.port,
    effectiveConfig.secure ? 'secure' : 'insecure',
    effectiveConfig.user,
  ].join('|');

  const cached = transporterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const transporter = nodemailer.createTransport({
    host: effectiveConfig.host,
    port: effectiveConfig.port,
    secure: effectiveConfig.secure,
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user: effectiveConfig.user,
      pass: effectiveConfig.password,
    },
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
};

export async function sendEmail({ from, to, subject, text, smtpConfig }: SendEmailInput): Promise<SendEmailResult> {
  const transporter = getTransporter(smtpConfig);
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  const previewUrlValue = nodemailer.getTestMessageUrl(info);
  const previewUrl = typeof previewUrlValue === 'string' ? previewUrlValue : null;

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
