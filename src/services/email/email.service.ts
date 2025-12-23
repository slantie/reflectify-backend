// src/services/email/email.service.ts

import nodemailer from 'nodemailer';
import { emailQueue } from './queue';

// This interface defines the data required for ANY email job.
export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        'SMTP_USER and SMTP_PASS environment variables are required'
      );
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        console.error('Email transporter failed to initialize:', error);
      } else {
        console.log('Email transporter is ready to send emails.');
      }
    });
  }

  /**
   * Sends an email directly using Nodemailer.
   * This function is called by our BullMQ worker.
   * @param payload - The email details (to, subject, html).
   */
  public async sendTransactionalEmail(payload: EmailJobPayload): Promise<void> {
    const mailOptions = {
      from: `<${process.env.SMTP_FROM_NAME}> <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${payload.to}. Message ID: ${info.messageId}`);
    } catch (error) {
      console.error(`Error sending email to ${payload.to}:`, error);
      throw error; // Re-throw to let BullMQ handle retries.
    }
  }

  /**
   * Adds a single email job to the BullMQ queue, with fallback to direct sending.
   * @param jobName - A descriptive name for the job type.
   * @param payload - The email details to be added to the queue.
   */
  public async addEmailJobToQueue(
    jobName: string,
    payload: EmailJobPayload
  ): Promise<void> {
    try {
      await emailQueue.add(jobName, payload);
      console.log(`Email job "${jobName}" added to queue for ${payload.to}`);
    } catch (error) {
      console.warn(
        `Failed to add email to queue, sending directly:`,
        error instanceof Error ? error.message : String(error)
      );
      // Fallback: send email directly if queue is unavailable
      await this.sendTransactionalEmail(payload);
    }
  }
}

export const emailService = new EmailService();
