ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS sender_email VARCHAR(320);

ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS emails
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE emails
SET sender_email = s.email
FROM senders s
WHERE emails.sender_email IS NULL
  AND emails.sender_id IS NOT NULL
  AND s.id = emails.sender_id;

UPDATE emails
SET error_message = last_error
WHERE error_message IS NULL
  AND last_error IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_idempotency_key_unique
  ON emails (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails (sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_failed_at ON emails (failed_at);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails (status);
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON emails (scheduled_at);
