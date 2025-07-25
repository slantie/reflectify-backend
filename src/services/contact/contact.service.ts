// src/services/contact/contact.service.ts

import nodemailer from 'nodemailer';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Missing SMTP_USER or SMTP_PASS environment variables.');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendContactEmail(data: ContactFormData): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      replyTo: data.email,
      subject: `Contact Form Submission: ${data.subject}`,
      html: `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message}</p>
        <br/>
        <p>This message was sent from your Reflectify contact page.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Contact email sent successfully!');
    } catch (error) {
      console.error('Error sending contact email:', error);
      throw new Error('Failed to send contact email.');
    }
  }
}
