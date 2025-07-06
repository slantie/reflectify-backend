/**
 * @file src/controllers/auth/auth.controller.ts
 * @description Controller for authentication and admin profile management.
 * Handles request parsing, delegates to AuthService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { authService } from '../../services/auth/auth.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  registerAdminSchema,
  loginAdminSchema,
  updatePasswordSchema,
} from '../../utils/validators/auth.validation';

/**
 * @description Registers a new regular admin/user.
 * @route POST /api/v1/auth/register
 * @param {Request} req - Express Request object (expects name, email, password, designation in body)
 * @param {Response} res - Express Response object
 * @access Public
 */
export const registerAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = registerAdminSchema.parse(req.body);

    // 2. Delegate to service layer to create regular admin
    const { admin, token } = await authService.createAdmin(
      validatedData,
      false
    );

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Admin registered successfully.',
      token,
      data: {
        admin,
      },
    });
  }
);

/**
 * @description Registers a new super admin. This route should be highly protected (e.g., via initial setup script).
 * @route POST /api/v1/auth/super-register
 * @param {Request} req - Express Request object (expects name, email, password, designation in body)
 * @param {Response} res - Express Response object
 * @access Public (but restricted by service logic to one super admin)
 */
export const registerSuperAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = registerAdminSchema.parse(req.body);

    // 2. Delegate to service layer to create super admin
    const { admin, token } = await authService.createAdmin(validatedData, true);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Super admin registered successfully.',
      token,
      data: {
        admin,
      },
    });
  }
);

/**
 * @description Authenticates an admin and provides a JWT token.
 * @route POST /api/v1/auth/login
 * @param {Request} req - Express Request object (expects email, password in body)
 * @param {Response} res - Express Response object
 * @access Public
 */
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  // 1. Validate request body using Zod
  const { email, password } = loginAdminSchema.parse(req.body);

  // 2. Delegate to service layer
  const { admin, token } = await authService.loginAdmin(email, password);

  // 3. Send success response
  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully.',
    token,
    data: {
      admin,
    },
  });
});

/**
 * @description Gets the currently authenticated admin's profile.
 * @route GET /api/v1/auth/me
 * @param {Request} req - Express Request object (req.admin populated by isAuthenticated middleware)
 * @param {Response} res - Express Response object
 * @access Private (requires authentication)
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // req.admin is guaranteed to be populated by the isAuthenticated middleware
  if (!req.admin?.id) {
    // This case should ideally not be reached if isAuthenticated runs first
    throw new AppError(
      'Authentication required. Admin ID not found on request.',
      401
    );
  }

  // Delegate to service layer
  const admin = await authService.getAdminProfile(req.admin.id);

  // Send success response
  res.status(200).json({
    status: 'success',
    data: {
      admin,
    },
  });
});

/**
 * @description Updates the password for the currently authenticated admin.
 * @route PATCH /api/v1/auth/update-password
 * @param {Request} req - Express Request object (expects currentPassword, newPassword in body)
 * @param {Response} res - Express Response object
 * @access Private (requires authentication)
 */
export const updateAdminPassword = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { currentPassword, newPassword } = updatePasswordSchema.parse(
      req.body
    );

    // req.admin is guaranteed to be populated by the isAuthenticated middleware
    if (!req.admin?.id) {
      throw new AppError(
        'Authentication required. Admin ID not found on request.',
        401
      );
    }

    // 2. Delegate to service layer
    const message = await authService.updateAdminPassword(
      req.admin.id,
      currentPassword,
      newPassword
    );

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message,
    });
  }
);
