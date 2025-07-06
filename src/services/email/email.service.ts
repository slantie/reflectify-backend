/**
 * @file src/services/email/email.service.ts
 * @description Service layer for sending feedback form access emails.
 * Handles email transporter setup, token generation, and database interaction for form access.
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import { getFeedbackFormTemplate } from '../../utils/emailTemplates/feedbackForm.template'; // Import the email template
import AppError from '../../utils/appError';

class EmailService {
  private transporter: nodemailer.Transporter;
  private API_URL: string;
  private SMTP_FROM: string;
  private TOKEN_SECRET: string;

  constructor() {
    // Initialize environment variables
    this.API_URL =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_PROD_URL || 'http://localhost:3000' // Provide a fallback
        : process.env.FRONTEND_DEV_URL || 'http://localhost:3000'; // Provide a fallback

    this.SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com'; // Provide a fallback
    this.TOKEN_SECRET =
      process.env.TOKEN_SECRET ||
      'super-secret-default-key-please-change-in-production'; // Provide a strong default/fallback

    // Configure email transporter
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.error(
        'SMTP environment variables are not fully configured. Email sending may fail.'
      );
      // You might want to throw an error or disable email functionality if critical
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // Use 'true' if port is 465 (SSL/TLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Optional: Add a timeout
      // timeout: 10000, // 10 seconds
    });

    // Verify transporter configuration
    this.transporter.verify((error, _success) => {
      if (error) {
        console.error('Nodemailer transporter verification failed:', error);
      }
    });
  }

  /**
   * Generates a unique, cryptographically secure token for form access.
   * @param formId - The ID of the feedback form.
   * @param studentId - The ID of the student.
   * @param enrollmentNumber - The enrollment number of the student.
   * @returns A base64url encoded unique token string.
   * @private
   */
  private generateUniqueToken(
    formId: string,
    studentId: string,
    enrollmentNumber: string
  ): string {
    const baseString = `${formId}-${studentId}-${enrollmentNumber}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    const hmac = crypto.createHmac('sha256', this.TOKEN_SECRET);
    hmac.update(baseString);
    return hmac.digest('base64url');
  }

  /**
   * Sends an email using the configured Nodemailer transporter.
   * @param to - Recipient's email address.
   * @param studentName - Name of the student.
   * @param formTitle - Title of the feedback form.
   * @param accessLink - The unique access token/link.
   * @param semesterNumber - The semester number for the template.
   * @param divisionName - The division name for the template.
   * @private
   */
  private async sendEmail(
    to: string,
    _studentName: string,
    formTitle: string,
    accessLink: string,
    semesterNumber: number,
    divisionName: string
  ) {
    const emailContent = getFeedbackFormTemplate(
      semesterNumber,
      divisionName,
      formTitle,
      accessLink,
      this.API_URL
    );

    try {
      await this.transporter.sendMail({
        from: this.SMTP_FROM,
        to,
        subject: `Feedback Form Invitation: ${formTitle}`,
        html: emailContent,
      });
      console.log(`Email sent successfully to ${to} for form ${formTitle}`);
    } catch (error: any) {
      console.error(
        `Failed to send email to ${to} for form ${formTitle}:`,
        error
      );
      // Depending on your error handling strategy, you might re-throw or log more specifically
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
  }

  /**
   * Sends feedback form access emails to all students in a given division.
   * Generates unique access tokens and stores them in the database.
   * @param formId - The ID of the feedback form.
   * @param divisionId - The ID of the division whose students will receive the email.
   * @throws AppError if the form or division is not found, or if email sending fails.
   */
  public async sendFormAccessEmail(formId: string, divisionId: string) {
    // 1. Fetch Form Details
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false }, // Ensure form is not soft-deleted
      select: {
        title: true,
        subjectAllocation: {
          select: {
            semester: { select: { semesterNumber: true, isDeleted: false } }, // Ensure semester is not soft-deleted
          },
        },
        division: { select: { divisionName: true, isDeleted: false } }, // Ensure division is not soft-deleted
      },
    });

    if (!form || !form.subjectAllocation?.semester || !form.division) {
      throw new AppError(
        'Feedback form, associated semester, or division not found or is deleted.',
        404
      );
    }

    const semesterNumber = form.subjectAllocation.semester.semesterNumber;
    const divisionName = form.division.divisionName;
    const formTitle = form.title;

    // 2. Fetch Students in the Division
    const students = await prisma.student.findMany({
      where: {
        divisionId: divisionId,
        isDeleted: false, // Ensure student is not soft-deleted
        division: { isDeleted: false }, // Ensure division is not soft-deleted
      },
      select: {
        id: true,
        email: true,
        name: true,
        enrollmentNumber: true,
      },
    });

    if (!students.length) {
      throw new AppError(
        'No active students found in the specified division to send emails to.',
        404
      );
    }

    // 3. Process and Send Emails for Each Student
    const emailPromises = students.map(async (student) => {
      const uniqueAccessToken = this.generateUniqueToken(
        formId,
        student.id,
        student.enrollmentNumber
      );

      // Upsert FormAccess record
      await prisma.formAccess.upsert({
        where: {
          formId_studentId: {
            formId,
            studentId: student.id,
          },
        },
        update: {
          accessToken: uniqueAccessToken,
          isSubmitted: false,
          isDeleted: false, // Ensure it's marked as not deleted on update
        },
        create: {
          formId,
          studentId: student.id,
          accessToken: uniqueAccessToken,
          isSubmitted: false,
          isDeleted: false, // Ensure it's marked as not deleted on create
        },
      });

      // Send the email
      await this.sendEmail(
        student.email,
        student.name,
        formTitle,
        uniqueAccessToken,
        semesterNumber,
        divisionName
      );
    });

    // Wait for all emails to be processed (sent or failed)
    await Promise.allSettled(emailPromises);
    console.log(
      `Attempted to send feedback form emails for form ${formId} to division ${divisionId}.`
    );
  }
}

export const emailService = new EmailService();
