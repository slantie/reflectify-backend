// src/controllers/email/email.controller.ts

import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { feedbackFormService } from '../../services/feedbackForm/feedbackForm.service';

/**
 * Handles the API request to send form access emails for a specific form.
 * This is now a non-blocking operation that queues emails for background sending.
 */
export const sendFormAccessEmails = asyncHandler(
  async (req: Request, res: Response) => {
    // Assuming the form ID is passed in the request body.
    const { formId } = req.body;

    if (!formId) {
      return res.status(400).json({
        status: 'fail',
        message: 'A formId is required in the request body.',
      });
    }

    // Call the service to queue the emails.
    const emailCount =
      await feedbackFormService.queueEmailsForFeedbackForm(formId);

    res.status(202).json({
      status: 'success',
      message: `${emailCount} emails have been successfully queued for delivery.`,
    });
  }
);
