// src/controllers/contact/contact.controller.ts

import { Request, Response } from 'express';
import { ContactService } from '../../services/contact/contact.service';

export class ContactController {
  private contactService: ContactService;

  constructor() {
    this.contactService = new ContactService();
  }

  /**
   * Handles the POST request for contact form submission.
   * @param req The Express Request object containing the form data in req.body.
   * @param res The Express Response object to send the response.
   */
  async handleContactSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, subject, message } = req.body;

      // Basic server-side validation
      if (!name || !email || !subject || !message) {
        res.status(400).json({ message: 'All fields are required.' });
        return;
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        res
          .status(400)
          .json({ message: 'Please enter a valid email address.' });
        return;
      }

      if (message.length < 10) {
        res
          .status(400)
          .json({ message: 'Message must be at least 10 characters long.' });
        return;
      }
      // You can add more robust validation here if needed

      await this.contactService.sendContactEmail({
        name,
        email,
        subject,
        message,
      });

      res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error: any) {
      console.error('Error in contact controller:', error.message);
      res
        .status(500)
        .json({ message: 'Failed to send message.', error: error.message });
    }
  }
}
