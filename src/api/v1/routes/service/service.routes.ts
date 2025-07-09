/**
 * @file src/api/v1/routes/service/service.routes.ts
 * @description Service-only routes for internal service-to-service communication
 * These routes use API key authentication instead of JWT tokens
 */

import { Router } from 'express';
import { serviceAuthMiddleware } from '../../../../middlewares/serviceAuth.middleware';

const router = Router();

// Apply service authentication to all routes
router.use(serviceAuthMiddleware);

// For future service expansion

export default router;
