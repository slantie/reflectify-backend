/**
 * @file src/services/auth/auth.service.ts
 * @description Service layer for authentication and admin management operations.
 * Handles user registration, login, profile retrieval, and password updates.
 */

import { Admin, Designation } from '@prisma/client';
import AppError from '../../utils/appError';
import { prisma } from '../common/prisma.service';
import { generateAuthToken } from '../../utils/jwt';
import { hashPassword, comparePassword } from '../../utils/hash';

class AuthService {
  /**
   * Creates a new admin (regular or super).
   * @param data - Admin registration data (name, email, password, designation).
   * @param isSuper - Boolean indicating if the admin is a super admin.
   * @returns The created Admin object (excluding password) and a JWT token.
   * @throws AppError if email already exists or if super admin already exists.
   */
  public async createAdmin(
    data: {
      name: string;
      email: string;
      password: string;
      designation: string;
    },
    isSuper: boolean
  ): Promise<{ admin: Omit<Admin, 'password'>; token: string }> {
    const { name, email, password, designation } = data;

    // Check if email already exists for non-super admin registration
    // Or if a super admin already exists when trying to register another super admin
    if (!isSuper) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email, isDeleted: false }, // Check for active admins
      });
      if (existingAdmin) {
        throw new AppError('Email already registered.', 400);
      }
    } else {
      // Logic for super admin: only one super admin allowed
      const existingSuperAdmin = await prisma.admin.findFirst({
        where: { isSuper: true, isDeleted: false },
      });
      if (existingSuperAdmin) {
        throw new AppError(
          'Super admin already exists. Only one super admin is allowed.',
          400
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    let finalDesignation: Designation;
    if (isSuper) {
      finalDesignation = Designation.SUPER_ADMIN;
    } else {
      if (!Object.values(Designation).includes(designation as Designation)) {
        throw new AppError('Invalid designation provided.', 400);
      }
      finalDesignation = designation as Designation;
    }

    // Create admin in the database
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        designation: finalDesignation,
        isSuper,
      },
    });

    // Generate JWT token
    const token = generateAuthToken(admin.id, admin.email, admin.isSuper);

    // Return admin data without the password
    const { password: _, ...adminWithoutPassword } = admin;
    return { admin: adminWithoutPassword, token };
  }

  /**
   * Authenticates an admin and provides a JWT token.
   * @param email - The admin's email.
   * @param password - The admin's plain text password.
   * @returns The authenticated Admin object (excluding password) and a JWT token.
   * @throws AppError if credentials are invalid or admin is soft-deleted.
   */
  public async loginAdmin(
    email: string,
    password: string
  ): Promise<{ admin: Omit<Admin, 'password'>; token: string }> {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    // Check if admin exists and is not soft-deleted
    if (!admin || admin.isDeleted) {
      throw new AppError('Invalid credentials.', 401);
    }

    // Compare passwords
    const isMatch = await comparePassword(password, admin.password);

    if (!isMatch) {
      throw new AppError('Invalid credentials.', 401);
    }

    // Generate JWT token
    const token = generateAuthToken(admin.id, admin.email, admin.isSuper);

    // Return admin data without the password
    const { password: _, ...adminWithoutPassword } = admin;
    return { admin: adminWithoutPassword, token };
  }

  /**
   * Retrieves an admin's profile by ID.
   * @param adminId - The ID of the admin.
   * @returns The Admin object (excluding password).
   * @throws AppError if admin is not found or is soft-deleted.
   */
  public async getAdminProfile(
    adminId: string
  ): Promise<Omit<Admin, 'password'>> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId, isDeleted: false }, // Ensure it's not soft-deleted
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        isSuper: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!admin) {
      throw new AppError('Admin not found.', 404);
    }
    return admin;
  }

  /**
   * Updates an admin's password.
   * @param adminId - The ID of the admin whose password is to be updated.
   * @param currentPassword - The current plain text password.
   * @param newPassword - The new plain text password.
   * @returns A success message.
   * @throws AppError if admin not found, current password is incorrect, or admin is soft-deleted.
   */
  public async updateAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<string> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId, isDeleted: false }, // Ensure it's not soft-deleted
    });

    if (!admin) {
      throw new AppError('Admin not found.', 404);
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, admin.password);

    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 401);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return 'Password updated successfully.';
  }
}

export const authService = new AuthService();
