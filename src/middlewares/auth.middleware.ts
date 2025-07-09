/**
 * @file src/middlewares/auth.middleware.ts
 * @description Middleware for authentication and authorization using JWT tokens.
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import asyncHandler from '../utils/asyncHandler';
import { verifyAuthToken } from '../utils/jwt';
import { prisma } from '../services/common/prisma.service';
import { JwtPayload } from 'jsonwebtoken';
import { Designation } from '@prisma/client';

// Middleware to protect routes, ensuring only authenticated admins can access.
export const isAuthenticated = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Extracts token from the Authorization header.
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Throws an error if no token is provided.
    if (!token) {
      throw new AppError(
        'You are not logged in! Please log in to get access.',
        401
      );
    }

    let decoded: JwtPayload;
    // Verifies the extracted token.
    try {
      decoded = verifyAuthToken(token);
    } catch (error: any) {
      // Handles specific JWT verification errors.
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token. Please log in again!', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Your token has expired! Please log in again.', 401);
      }
      throw new AppError('Authentication failed. Please log in again.', 401);
    }

    // Checks if the authenticated admin still exists and is not soft-deleted.
    const currentAdmin = await prisma.admin.findUnique({
      where: { id: decoded.id, isDeleted: false },
    });

    // Throws an error if the admin no longer exists.
    if (!currentAdmin) {
      throw new AppError(
        'The admin belonging to this token no longer exists.',
        401
      );
    }

    // Attaches the authenticated admin's data to the request object.
    req.admin = {
      id: currentAdmin.id,
      email: currentAdmin.email,
      name: currentAdmin.name,
      isSuper: currentAdmin.isSuper,
      designation: currentAdmin.designation,
    };

    next();
  }
);

// Middleware to restrict access based on user roles.
export const authorizeRoles = (...allowedRoles: Designation[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Ensures admin data is present on the request.
    if (!req.admin) {
      return next(new AppError('User not authenticated.', 401));
    }

    // Checks if the admin's designation is among the allowed roles.
    if (!allowedRoles.includes(req.admin.designation as Designation)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};
