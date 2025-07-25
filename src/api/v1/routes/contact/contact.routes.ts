// src/api/v1/routes/contact/contact.routes.ts

import { Router } from 'express';
import { ContactController } from '../../../../controllers/contact/contact.controller';

const router = Router();
const contactController = new ContactController();

router.post('/', (req, res) =>
  contactController.handleContactSubmission(req, res)
);

export default router;
