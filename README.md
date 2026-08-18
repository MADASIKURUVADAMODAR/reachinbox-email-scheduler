# ReachInbox Email Scheduler (Full-Stack)

A full-stack, production-quality email scheduling application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Express**, **PostgreSQL**, **Redis**, **BullMQ**, and **Ethereal SMTP**.

---

## Features & Highlights

### Frontend
- **Google OAuth Authentication**: Real Google Sign-In via `@react-oauth/google` with persistent user sessions and profile avatar display. Also includes a quick Evaluator Mode sign-in.
- **ReachInbox Dashboard**: Professional dark mode UI with live statistics cards for Scheduled Emails, Sent Emails, Delivery Success Rate, and System Status.
- **Compose Email Campaign**:
  - Drag-and-drop CSV / Text file upload with automatic recipient email extraction & regex validation.
  - Live detected email counter.
  - Future schedule time picker.
  - Configurable minimum delay between emails (in seconds) & hourly rate limit.
  - Real-time client-side validation and toast notification feedback.
- **Scheduled Emails Table**: Filterable view of queued emails with recipient, subject, scheduled time, and status badge (`scheduled`, `processing`).
- **Sent Emails Table**: Detailed log of completed and failed deliveries with sent timestamps, status tags (`sent`, `failed`), and direct Ethereal SMTP preview links.

### Backend
- **Asynchronous Queue Engine**: Driven by BullMQ and Redis with delayed jobs (no cron jobs used).
- **PostgreSQL Persistence**: Full transactional persistence for campaigns, senders, emails, and delivery logs.
- **Hourly Rate Limiting**: Atomic Redis Lua script rate limiter per sender window.
- **Idempotency & Send-Once Protection**: Sha256 idempotency key generation & atomic DB state transitions (`scheduled` -> `processing` -> `sent`).
- **Restart Recovery**: Automatic startup recovery scanner for queue resilience.

---

## Project Structure

```
reachinbox-email-scheduler/
├── backend/
│   ├── src/
│   │   ├── config/          # DB & Redis connection config
│   │   ├── controllers/     # Express HTTP route controllers
│   │   ├── db/              # PostgreSQL migrations & schema
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Email scheduler & repository logic
│   │   └── workers/         # BullMQ queue processor worker
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI Primitives, Dashboard, Tables, Compose Modal
│   │   ├── context/         # AuthContext & ToastContext
│   │   ├── services/        # Type-safe API client (api.ts)
│   │   └── types/           # Shared TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

---

## Quick Start Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Redis instance

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379
WORKER_CONCURRENCY=5
EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
```

Run database migrations & start backend server:

```bash
npm run db:migrate
npm run dev
```

The backend server runs at `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/` (optional for custom Google Client ID):

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Start the frontend dev server:

```bash
npm run dev
```

Access the application in your browser at `http://localhost:3000`.

---

## Verification & Build Commands

### Frontend Typecheck & Production Build
```bash
cd frontend
npm run typecheck
npm run build
```

### Backend Typecheck
```bash
cd backend
npm run typecheck
```

---

## 5-Minute Demo Flow

1. **Sign In**:
   - Open `http://localhost:3000`.
   - Sign in using Google OAuth or click **Continue as Evaluator** for quick access.
2. **Compose & Upload CSV**:
   - Click **Compose Email** in the top navigation.
   - Upload a CSV file containing emails or paste recipient email addresses. Notice the **Detected Email Addresses** counter automatically update.
   - Fill in Subject, Body, and set the scheduled time to 1 minute in the future.
   - Click **Schedule Campaign**.
3. **View Scheduled Emails**:
   - Navigate to the **Scheduled** tab to see your queued campaign items with status `Scheduled`.
4. **Monitor Delivery & Sent Logs**:
   - Once the scheduled time passes, BullMQ processes the queue jobs.
   - Navigate to the **Sent Logs** tab to view completed email records and click **Ethereal View** to view the rendered email in Ethereal SMTP.
