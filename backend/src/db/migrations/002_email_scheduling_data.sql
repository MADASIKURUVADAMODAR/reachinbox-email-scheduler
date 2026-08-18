CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS sender_email VARCHAR(320);

ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_sender_recipient_subject_scheduled_unique
  ON emails (sender_email, recipient_email, subject, scheduled_at)
  WHERE sender_email IS NOT NULL AND recipient_email IS NOT NULL AND subject IS NOT NULL AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails (status);
