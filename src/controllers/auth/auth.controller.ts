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

export const registerAdmin = asyncHandler(
  // Registers a new regular admin/user.
  async (req: Request, res: Response) => {
    const validatedData = registerAdminSchema.parse(req.body);

    const { admin, token } = await authService.createAdmin(
      validatedData,
      false
    );

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

export const registerSuperAdmin = asyncHandler(
  // Registers a new super admin.
  async (req: Request, res: Response) => {
    const validatedData = registerAdminSchema.parse(req.body);

    const { admin, token } = await authService.createAdmin(validatedData, true);

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

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  // Authenticates an admin and provides a JWT token.
  const { email, password } = loginAdminSchema.parse(req.body);

  const { admin, token } = await authService.loginAdmin(email, password);

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully.',
    token,
    data: {
      admin,
    },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // Gets the currently authenticated admin's profile.
  if (!req.admin?.id) {
    throw new AppError(
      'Authentication required. Admin ID not found on request.',
      401
    );
  }

  const admin = await authService.getAdminProfile(req.admin.id);

  res.status(200).json({
    status: 'success',
    data: {
      admin,
    },
  });
});

export const updateAdminPassword = asyncHandler(
  // Updates the password for the currently authenticated admin.
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(
      req.body
    );

    if (!req.admin?.id) {
      throw new AppError(
        'Authentication required. Admin ID not found on request.',
        401
      );
    }

    const message = await authService.updateAdminPassword(
      req.admin.id,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      status: 'success',
      message,
    });
  }
);
