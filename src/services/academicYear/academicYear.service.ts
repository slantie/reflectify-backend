/**
 * @file src/services/academic-year/academic-year.service.ts
 * @description Service layer for Academic Year operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { AcademicYear } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

class AcademicYearService {
  /**
   * Creates a new academic year.
   * @param data - The data for the new academic year (yearString, startDate, endDate).
   * @returns The created AcademicYear object.
   * @throws AppError if an academic year with the same yearString already exists.
   */
  public async createAcademicYear(data: {
    yearString: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AcademicYear> {
    const { yearString, startDate, endDate } = data;

    try {
      const academicYear = await prisma.academicYear.create({
        data: {
          yearString: yearString,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      });
      return academicYear;
    } catch (error: any) {
      // P2002 is Prisma's error code for unique constraint violation
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('year_string')
      ) {
        throw new AppError(
          'Academic year with this year string already exists.',
          409
        );
      }
      // Re-throw as a generic AppError for other database errors
      throw new AppError('Failed to create academic year.', 500);
    }
  }

  /**
   * Retrieves all academic years, excluding soft-deleted ones by default.
   * @returns An array of AcademicYear objects.
   */
  public async getAllAcademicYears(): Promise<AcademicYear[]> {
    try {
      const academicYears = await prisma.academicYear.findMany({
        where: { isDeleted: false }, // Filter out soft-deleted records
        orderBy: {
          yearString: 'desc', // Order by year string descending
        },
      });
      return academicYears;
    } catch (error: any) {
      throw new AppError('Failed to retrieve academic years.', 500);
    }
  }

  /**
   * Retrieves a single academic year by its ID, excluding soft-deleted ones.
   * @param id - The ID of the academic year to retrieve.
   * @returns The AcademicYear object, or null if not found.
   */
  public async getAcademicYearById(id: string): Promise<AcademicYear | null> {
    try {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: id, isDeleted: false }, // Ensure it's not soft-deleted
      });
      return academicYear;
    } catch (error: any) {
      throw new AppError('Failed to retrieve academic year.', 500);
    }
  }

  /**
   * Updates an existing academic year.
   * @param id - The ID of the academic year to update.
   * @param data - The data to update (yearString, startDate, endDate).
   * @returns The updated AcademicYear object.
   * @throws AppError if the academic year is not found or if the yearString already exists.
   */
  public async updateAcademicYear(
    id: string,
    data: { yearString?: string; startDate?: string; endDate?: string }
  ): Promise<AcademicYear> {
    const { yearString, startDate, endDate } = data;

    try {
      const academicYear = await prisma.academicYear.update({
        where: { id: id, isDeleted: false }, // Ensure it's not soft-deleted
        data: {
          yearString: yearString,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      });
      return academicYear;
    } catch (error: any) {
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('year_string')
      ) {
        throw new AppError(
          'Academic year with this year string already exists.',
          409
        );
      }
      if (error.code === 'P2025') {
        // Prisma error for record not found for update/delete
        throw new AppError('Academic year not found for update.', 404);
      }
      throw new AppError('Failed to update academic year.', 500);
    }
  }

  /**
   * Soft deletes an academic year by setting its isDeleted flag to true.
   * @param id - The ID of the academic year to soft delete.
   * @returns The soft-deleted AcademicYear object.
   * @throws AppError if the academic year is not found.
   *
   * IMPORTANT: This implementation assumes that the `onDelete: Restrict` in your Prisma schema
   * will prevent a *hard delete* if there are related records. For a *soft delete*, you typically
   * don't need to check for dependents manually, as you're just marking it as deleted, not removing it.
   * However, if your business logic requires preventing soft-deletion when dependents exist,
   * you would add those checks here. For now, we'll proceed with simple soft delete.
   */
  public async softDeleteAcademicYear(id: string): Promise<AcademicYear> {
    try {
      const academicYear = await prisma.academicYear.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return academicYear;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new AppError('Academic year not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete academic year.', 500);
    }
  }
}

// Export an instance of the service to be used across the application (singleton pattern)
export const academicYearService = new AcademicYearService();
