import type { Request, Response } from 'express';

import { scheduleEmailSchema } from '../schemas/email.schedule.schema.js';
import { scheduleEmails } from '../services/email.scheduler.service.js';

export async function scheduleEmailController(request: Request, response: Response): Promise<void> {
  try {
    const parsed = scheduleEmailSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await scheduleEmails(parsed.data);
      response.status(201).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Duplicate scheduling request') {
        response.status(409).json({
          message: 'Duplicate scheduling request',
        });
        return;
      }

      console.error('[email-controller] Unexpected scheduling error:', error);
      response.status(500).json({
        message: 'Failed to schedule emails',
      });
    }
  } catch (error) {
    console.error('[email-controller] Unexpected error:', error);
    response.status(500).json({
      message: 'Failed to schedule emails',
    });
  }
}
