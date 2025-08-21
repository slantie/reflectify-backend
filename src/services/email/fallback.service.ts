// src/services/email/fallback.service.ts

import { emailService, EmailJobPayload } from './email.service';

/**
 * Fallback email service that sends emails directly without queueing
 * Used when Redis is unavailable
 */
class FallbackEmailService {
  public async addEmailJobToQueue(
    jobName: string,
    payload: EmailJobPayload
  ): Promise<void> {
    console.log(`[FALLBACK] Processing email job: ${jobName}`);

    try {
      // Send email directly without queueing
      await emailService.sendTransactionalEmail(payload);
      console.log(`[FALLBACK] Email sent successfully to ${payload.to}`);
    } catch (error) {
      console.error(`[FALLBACK] Failed to send email to ${payload.to}:`, error);
      throw error;
    }
  }
}

export const fallbackEmailService = new FallbackEmailService();
