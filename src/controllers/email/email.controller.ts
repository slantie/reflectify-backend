/**
 * @file src/controllers/email/email.controller.ts
 * @description Controller for triggering email sending operations.
 * Handles request validation and delegates to EmailService.
 */

import { Request, Response } from 'express';
import { emailService } from '../../services/email/email.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { z, ZodError } from 'zod';

const sendFormAccessEmailBodySchema = z.object({
  formId: z.string().uuid('Invalid form ID format. Must be a UUID.'),
  divisionId: z.string().uuid('Invalid division ID format. Must be a UUID.'),
});

export const sendFormAccessEmails = asyncHandler(
  // Triggers the sending of feedback form access emails to students in a specific division.
  async (req: Request, res: Response) => {
    try {
      const { formId, divisionId } = sendFormAccessEmailBodySchema.parse(
        req.body
      );

      await emailService.sendFormAccessEmail(formId, divisionId);

      res.status(200).json({
        status: 'success',
        message: 'Feedback form access emails are being sent.',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);
