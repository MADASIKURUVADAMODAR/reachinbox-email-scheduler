# ReachInbox Email Scheduler (Full-Stack)

A full-stack email scheduling application built with React, TypeScript, Vite, Tailwind CSS, Express, PostgreSQL, Redis, BullMQ, and Ethereal SMTP. The application allows users to create email campaigns, upload and validate recipients, schedule emails for future delivery, process emails asynchronously, apply sending limits, persist email state, and monitor scheduled and sent emails through a dashboard.

## Features

### Frontend
- Google OAuth authentication using @react-oauth/google.
- Evaluator Mode for quick access.
- Professional dark-mode ReachInbox dashboard.
- Scheduled email statistics.
- Sent email statistics.
- Delivery rate monitoring.
- System status monitoring.
- Compose email campaign interface.
- CSV/Text recipient upload.
- Automatic email extraction and validation.
- Detected recipient count.
- Subject and email body input.
- Future email scheduling.
- Configurable minimum email delay.
- Configurable hourly sending limit.
- Scheduled email table.
- Sent email logs.
- Email delivery status.
- Ethereal SMTP preview links.

### Backend
- Express REST API built with TypeScript.
- BullMQ asynchronous email queue.
- Redis-backed delayed jobs.
- PostgreSQL persistent storage.
- Sender-level hourly rate limiting.
- Redis Lua based atomic send-slot reservation.
- Email idempotency and send-once protection.
- Atomic email state transitions.
- SMTP email delivery through Ethereal.
- Retry handling with BullMQ attempts and exponential backoff.
- Startup recovery for missing scheduled queue jobs.
- Configurable worker concurrency.

## Architecture

The application follows a frontend → REST API → backend services → database/queue architecture.

React Frontend
↓
Express REST API
↓
Backend Controllers
↓
Service Layer
↓
PostgreSQL + BullMQ
↓
Redis
↓
Email Worker
↓
SMTP Service
↓
Ethereal SMTP

PostgreSQL is responsible for persistent application and email delivery state. Redis is used by BullMQ for asynchronous queue processing, delayed jobs, rate limiting, and distributed send-slot coordination. The BullMQ worker processes scheduled jobs and sends emails through the SMTP service.

## Email Scheduling Flow

User creates campaign
↓
Frontend validates campaign
↓
REST API request
↓
Backend validates recipients
↓
Email records are stored in PostgreSQL
↓
Delayed BullMQ jobs are created
↓
Redis stores queue state
↓
Scheduled time is reached
↓
BullMQ worker processes the job
↓
Email is claimed for processing
↓
Sender rate limit is checked
↓
Sending slot is reserved
↓
Email is sent through SMTP
↓
PostgreSQL is updated
↓
Email is marked as sent
↓
Dashboard displays delivery result

## Email State Flow

scheduled → processing → sent

If delivery fails:

processing → failed

Retryable SMTP failures are retried using BullMQ retry attempts and exponential backoff.

## Project Structure

reachinbox-email-scheduler/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, environment and Redis configuration
│   │   ├── controllers/     # Express controllers
│   │   ├── db/              # PostgreSQL database logic
│   │   ├── middleware/      # Express middleware
│   │   ├── queues/          # BullMQ queue definitions
│   │   ├── routes/          # API routes
│   │   ├── schemas/         # Request/data schemas
│   │   ├── services/        # Business and email scheduling services
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── workers/         # BullMQ email worker
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components and dashboard
│   │   ├── context/         # Authentication and application context
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md

## Technology Stack

Frontend: React, TypeScript, Vite, Tailwind CSS

Backend: Node.js, Express, TypeScript

Database: PostgreSQL

Queue: BullMQ

Queue/Rate Limiting Store: Redis

Email: Ethereal SMTP

Authentication: Google OAuth

Frontend Deployment: Vercel

Backend Deployment: Render

Source Control: GitHub

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- npm

### Backend Setup

cd backend
npm install

Create a .env file inside the backend directory and configure the required environment variables:

PORT=5000
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string
WORKER_CONCURRENCY=5
EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

Run the database migration:

npm run db:migrate

Start the backend:

npm run dev

### Frontend Setup

cd frontend
npm install

Configure the required frontend environment variables if required:

VITE_GOOGLE_CLIENT_ID=your_google_client_id

Start the frontend:

npm run dev

## Verification

Backend typecheck:

cd backend
npx tsc --noEmit

Backend production build:

npm run build

Frontend typecheck:

cd frontend
npm run typecheck

Frontend production build:

npm run build

## Demo Flow

1. Open the hosted ReachInbox application.
2. Sign in using Google OAuth or the available evaluator access.
3. View the ReachInbox dashboard.
4. Click Compose New Campaign.
5. Upload a CSV/Text file containing recipient email addresses.
6. Verify the detected recipient count.
7. Enter the email subject and body.
8. Select a future schedule time.
9. Configure email delay and hourly sending limit.
10. Schedule the campaign.
11. Open the Scheduled section and verify the scheduled emails.
12. When the scheduled time is reached, BullMQ processes the delayed jobs through Redis.
13. The email worker claims the email, applies rate limiting, and sends the email through SMTP.
14. Open Sent Logs to view processed email records and delivery status.
15. Use the Ethereal preview link to inspect the delivered email when available.

## Rate Limiting

The system supports configurable hourly email limits using:

MAX_EMAILS_PER_HOUR

Redis is used to coordinate sending slots. A Redis Lua script performs atomic slot reservation so concurrent workers do not exceed the configured sending rate.

## Worker Processing

The email worker uses BullMQ and supports configurable concurrency using:

WORKER_CONCURRENCY=5

A minimum delay between sending operations can be configured using:

EMAIL_DELAY_MS=2000

BullMQ retry attempts and exponential backoff are used for retryable email delivery failures.

## Queue Recovery

When the backend starts, the scheduler checks for scheduled emails whose BullMQ jobs may be missing and attempts to recover those jobs. This helps maintain scheduled email processing after application restarts.

## Deployment

### Frontend

The frontend is deployed on Vercel.

Hosted Application:

https://reachinbox-email-scheduler-nu.vercel.app/

### Backend

The backend is deployed on Render and provides the REST API and background email processing services.

## GitHub Repository

https://github.com/MADASIKURUVADAMODAR/reachinbox-email-scheduler

The repository contains the frontend, backend, database logic, Redis integration, BullMQ queue implementation, email worker, configuration, and documentation.

## Assignment Demo

The demo video demonstrates the working prototype from authentication and dashboard navigation through campaign creation, recipient upload, email scheduling, queue processing, and sent email logs.

The video focuses on both the user-facing functionality and the backend architecture used to implement asynchronous email scheduling.

## Future Improvements

- Dedicated Redis/BullMQ worker deployment.
- Advanced campaign analytics.
- Multiple SMTP provider support.
- Dead-letter queue management.
- Campaign-level analytics.
- Email templates.
- Unsubscribe management.
- Advanced sender controls.
- Production monitoring and alerting.

## License

This project was created as part of the Outbox Labs SDE Intern assignment.
