// src/controllers/email/test.controller.ts

import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { emailService } from '../../services/email/email.service';

/**
 * Test endpoint to send a sample email
 */
export const sendTestEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an email address in the request body.',
      });
    }

    // Create a test email payload
    const testEmailPayload = {
      to: email,
      subject: 'Test Email from Reflectify - Email Queue Working!',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">🎉 Email Queue Test Successful!</h2>
          <p>Hello there!</p>
          <p>This is a test email from your Reflectify backend to verify that the email queue system is working correctly.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #28a745;">✅ What's Working:</h3>
            <ul>
              <li>Redis connection established</li>
              <li>BullMQ email queue initialized</li>
              <li>Background worker processing jobs</li>
              <li>Gmail SMTP transporter ready</li>
              <li>Rate limiting (1 email per 2 seconds)</li>
              <li>Retry logic (5 attempts with exponential backoff)</li>
            </ul>
          </div>
          <p>If you received this email, your email system is ready for production! 🚀</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6c757d; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br>
            From: Reflectify Backend Email Queue System
          </p>
        </div>
      `,
    };

    // Add the test email to the queue
    await emailService.addEmailJobToQueue('test-email', testEmailPayload);

    res.status(202).json({
      status: 'success',
      message: `Test email has been queued for delivery to ${email}. Check your inbox in a few moments!`,
      data: {
        queuedAt: new Date().toISOString(),
        recipientEmail: email,
      },
    });
  }
);
