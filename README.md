# ReachInbox Email Scheduler Backend

## Overview

This backend implements delayed email scheduling with Express, PostgreSQL, Redis, BullMQ, and Ethereal SMTP.

No cron jobs are used.

## Architecture

- API layer: Express routes/controllers validate requests and call the scheduler service.
- Persistence: PostgreSQL stores users, senders, campaigns, emails, statuses, and delivery metadata.
- Queueing: BullMQ stores delayed jobs in Redis.
- Worker: BullMQ worker claims, rate-limits, sends, and updates statuses.
- SMTP: Ethereal-compatible transport via Nodemailer.

## Scheduling Flow

1. `POST /api/emails/schedule` validates input.
2. Service creates or reuses sender configuration for the requesting sender email.
3. Campaign and email rows are created in one PostgreSQL transaction.
4. Each recipient gets a deterministic BullMQ job ID based on email ID.
5. Worker atomically claims each email before sending.
6. Worker enforces Redis-backed hourly limits and can move jobs to a later window.
7. Worker sends with sender-specific SMTP settings (or default Ethereal env fallback).
8. Worker persists final status and SMTP metadata.

## Delayed Jobs and Persistence

- BullMQ delayed jobs are persisted in Redis.
- Jobs survive server restarts because queue state is externalized to Redis.
- Startup recovery scans PostgreSQL `scheduled` emails and recreates missing jobs idempotently.

## Worker Concurrency

- Controlled by `WORKER_CONCURRENCY`.
- Multiple worker instances are supported.
- Send-once protection uses an atomic DB transition from `scheduled` to `processing`.

## Email Delay

- `EMAIL_DELAY_MS` controls spacing between recipients in the same scheduling request.
- For recipient index `i`, scheduled time is:
  - `scheduled_at = base_start_time + i * EMAIL_DELAY_MS`
- Negative delays are rejected.

## Hourly Rate Limiting

- `MAX_EMAILS_PER_HOUR` is enforced with Redis atomic Lua logic.
- Counter key format:
  - `email-rate-limit:{senderScope}:{hourWindowStartMs}`
- If capacity is exhausted:
  - email is not dropped,
  - status is returned to `scheduled`,
  - job is moved to the next hour window.

## Idempotency Strategy

### Request idempotency

- Deterministic DB `idempotency_key` prevents duplicate records for the same sender/recipient/subject/scheduled_at tuple.

### Send-once guard

- Worker uses atomic SQL claim:
  - `scheduled -> processing` for one worker only.
- If claim fails:
  - `sent`: job is treated as completed and skipped,
  - `processing`: job is safely delayed, not resent.

## Restart Recovery

Startup runs one recovery pass:

1. Query all `emails.status = 'scheduled'`.
2. Build deterministic job ID (`email-{emailId}`).
3. Check whether job already exists.
4. Recreate only missing jobs with remaining delay.

This covers the case where DB commit succeeded but queue enqueue failed.

## Multiple Sender Architecture

- `senders` table stores sender identity and sender-specific SMTP fields.
- Each scheduled email stores `sender_id` and `sender_email`.
- Worker resolves SMTP config from `sender_id` first, then falls back to global Ethereal env configuration.
- Sender SMTP passwords are never returned by API responses and are not logged.

## Ethereal SMTP

- Default transport is driven by env variables:
  - `ETHEREAL_HOST`
  - `ETHEREAL_PORT`
  - `ETHEREAL_USER`
  - `ETHEREAL_PASSWORD`
- On success, worker stores:
  - `smtp_message_id`
  - `smtp_preview_url`

## Failure and Retry Behavior

- Queue defaults:
  - retries: 3
  - backoff: exponential (2s base)
- Transient send failures:
  - email is moved back to `scheduled` and retried.
- Final failure after attempts are exhausted:
  - email is marked `failed`.

## Trade-offs

- When a worker crashes after SMTP accept but before DB update, the record may remain `processing`. The worker avoids blind resends by not sending records already in `processing`.
- Startup recovery is an idempotent one-time pass on startup, not a background poller.
- Sender-specific host/port are supported in schema and resolver; assignment environments can still run with one global Ethereal account.

## Key Environment Variables

- `PORT`
- `WORKER_CONCURRENCY`
- `EMAIL_DELAY_MS`
- `MAX_EMAILS_PER_HOUR`
- `ETHEREAL_HOST`
- `ETHEREAL_PORT`
- `ETHEREAL_USER`
- `ETHEREAL_PASSWORD`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
