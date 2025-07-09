/**
 * @file src/services/email/email.service.ts
 * @description Service layer for sending feedback form access emails.
 * Handles email transporter setup, token generation, and database interaction for form access.
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '../common/prisma.service';
import { getFeedbackFormTemplate } from '../../utils/emailTemplates/feedbackForm.template';
import AppError from '../../utils/appError';

class EmailService {
  private transporter: nodemailer.Transporter;
  private API_URL: string;
  private SMTP_FROM: string;
  private TOKEN_SECRET: string;

  constructor() {
    this.API_URL =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_PROD_URL || 'http://localhost:3000'
        : process.env.FRONTEND_DEV_URL || 'http://localhost:3000';

    this.SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com';
    this.TOKEN_SECRET =
      process.env.TOKEN_SECRET ||
      'super-secret-default-key-please-change-in-production';

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.error(
        'SMTP environment variables are not fully configured. Email sending may fail.'
      );
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.transporter.verify((error, _success) => {
      if (error) {
        console.error('Nodemailer transporter verification failed:', error);
      }
    });
  }

  // Generates a unique, cryptographically secure token for form access.
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

  // Sends an email using the configured Nodemailer transporter.
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
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
  }

  // Sends feedback form access emails to all students in a given division.
  public async sendFormAccessEmail(formId: string, divisionId: string) {
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
      select: {
        title: true,
        subjectAllocation: {
          select: {
            semester: { select: { semesterNumber: true, isDeleted: false } },
          },
        },
        division: { select: { divisionName: true, isDeleted: false } },
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

    const students = await prisma.student.findMany({
      where: {
        divisionId: divisionId,
        isDeleted: false,
        division: { isDeleted: false },
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

    const emailPromises = students.map(async (student) => {
      const uniqueAccessToken = this.generateUniqueToken(
        formId,
        student.id,
        student.enrollmentNumber
      );

      await prisma.formAccess.upsert({
        where: {
          form_student_unique: {
            formId,
            studentId: student.id,
          },
        },
        update: {
          accessToken: uniqueAccessToken,
          isSubmitted: false,
          isDeleted: false,
        },
        create: {
          formId,
          studentId: student.id,
          accessToken: uniqueAccessToken,
          isSubmitted: false,
          isDeleted: false,
        },
      });

      await this.sendEmail(
        student.email,
        student.name,
        formTitle,
        uniqueAccessToken,
        semesterNumber,
        divisionName
      );
    });

    await Promise.allSettled(emailPromises);
    console.log(
      `Attempted to send feedback form emails for form ${formId} to division ${divisionId}.`
    );
  }

  // Sends feedback form access emails to override students for a specific form.
  public async sendFormAccessEmailToOverrideStudents(
    formId: string
  ): Promise<void> {
    console.log(
      `Starting to send feedback form emails to override students for form ${formId}.`
    );

    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
      include: {
        division: {
          include: {
            semester: true,
          },
        },
      },
    });

    if (!form) {
      throw new AppError('Feedback form not found or is deleted.', 404);
    }

    const overrideRecord = await prisma.feedbackFormOverride.findFirst({
      where: {
        feedbackFormId: formId,
        isDeleted: false,
      },
      include: {
        overrideStudents: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            email: true,
            name: true,
            enrollmentNumber: true,
          },
        },
      },
    });

    if (!overrideRecord || !overrideRecord.overrideStudents.length) {
      throw new AppError(
        'No active override students found for this feedback form.',
        404
      );
    }

    const overrideStudents = overrideRecord.overrideStudents;
    const formTitle = form.title;
    const semesterNumber = form.division.semester.semesterNumber;
    const divisionName = form.division.divisionName;

    const emailPromises = overrideStudents.map(async (student) => {
      const uniqueAccessToken = this.generateUniqueToken(
        formId,
        student.id,
        student.enrollmentNumber || 'N/A'
      );

      try {
        await prisma.formAccess.create({
          data: {
            formId,
            overrideStudentId: student.id,
            accessToken: uniqueAccessToken,
            isSubmitted: false,
            isDeleted: false,
          },
        });
      } catch (error: any) {
        console.error(
          `Failed to create FormAccess for override student ${student.id}:`,
          error.message
        );
        throw new AppError(
          `Failed to create form access for student ${student.name}`,
          500
        );
      }

      await this.sendEmail(
        student.email,
        student.name,
        formTitle,
        uniqueAccessToken,
        semesterNumber,
        divisionName
      );
    });

    await Promise.allSettled(emailPromises);
    console.log(
      `Attempted to send feedback form emails for form ${formId} to ${overrideStudents.length} override students.`
    );
  }
}

export const emailService = new EmailService();
