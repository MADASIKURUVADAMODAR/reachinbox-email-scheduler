import type {
  HealthCheckResponse,
  ListEmailsResponse,
  ScheduleEmailPayload,
  ScheduleEmailResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.message || `HTTP error! status: ${response.status}`,
      response.status,
      data.errors
    );
  }
  return data as T;
}

export const api = {
  async scheduleEmail(payload: ScheduleEmailPayload): Promise<ScheduleEmailResponse> {
    const response = await fetch(`${API_BASE}/emails/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<ScheduleEmailResponse>(response);
  },

  async fetchScheduledEmails(limit = 100): Promise<ListEmailsResponse> {
    const response = await fetch(`${API_BASE}/emails/scheduled?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ListEmailsResponse>(response);
  },

  async fetchSentEmails(limit = 100): Promise<ListEmailsResponse> {
    const response = await fetch(`${API_BASE}/emails/sent?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ListEmailsResponse>(response);
  },

  async checkHealth(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<HealthCheckResponse>(response);
  },
};
