/**
 * @file src/middlewares/auth.middleware.ts
 * @description Middleware for authentication and authorization.
 * Verifies JWT tokens and attaches authenticated user data to the request.
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import asyncHandler from '../utils/asyncHandler';
import { verifyAuthToken } from '../utils/jwt';
import { prisma } from '../services/common/prisma.service'; // Corrected import to prisma
import { JwtPayload } from 'jsonwebtoken';
import { Designation } from '@prisma/client'; // Import Designation enum for authorizeRoles

/**
 * Middleware to protect routes, ensuring only authenticated admins can access.
 * Verifies the JWT token from the Authorization header.
 */
export const isAuthenticated = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1. Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError(
        'You are not logged in! Please log in to get access.',
        401
      );
    }

    // 2. Verify token
    let decoded: JwtPayload;
    try {
      decoded = verifyAuthToken(token);
    } catch (error: any) {
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token. Please log in again!', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Your token has expired! Please log in again.', 401);
      }
      throw new AppError('Authentication failed. Please log in again.', 401);
    }

    // 3. Check if admin still exists and is not soft-deleted
    const currentAdmin = await prisma.admin.findUnique({
      // Use prisma
      where: { id: decoded.id, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(
        'The admin belonging to this token no longer exists.',
        401
      );
    }

    // 4. Attach admin to request object for subsequent middleware/controllers
    // Using Pick to ensure only necessary properties are attached
    req.admin = {
      id: currentAdmin.id,
      email: currentAdmin.email,
      name: currentAdmin.name, // Now correctly included in Express.Request type
      isSuper: currentAdmin.isSuper,
      designation: currentAdmin.designation, // Now correctly included in Express.Request type
    };

    next(); // Proceed to the next middleware/route handler
  }
);

/**
 * Middleware to restrict access to specific roles.
 * @param allowedRoles - An array of roles (strings corresponding to Designation enum values) that are allowed to access the route.
 */
export const authorizeRoles = (...allowedRoles: Designation[]) => {
  // Use Designation enum for allowedRoles
  return (req: Request, _res: Response, next: NextFunction) => {
    // req.admin is guaranteed to exist here because isAuthenticated runs before this middleware
    if (!req.admin) {
      // This case should ideally not be reached if isAuthenticated is used correctly
      return next(new AppError('User not authenticated.', 401));
    }

    // Check if the authenticated admin's designation is among the allowed roles
    if (!allowedRoles.includes(req.admin.designation as Designation)) {
      // Cast to Designation for type safety
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};
