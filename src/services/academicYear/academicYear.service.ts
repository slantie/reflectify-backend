/**
 * @file src/services/academic-year/academic-year.service.ts
 * @description Service layer for Academic Year operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { AcademicYear } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

// Custom type to include count information for academic year
type AcademicYearWithCounts = AcademicYear & {
  _count: {
    semesters: number;
    subjectAllocations: number;
  };
};

class AcademicYearService {
  // Creates a new academic year.
  public async createAcademicYear(data: {
    yearString: string;
    isActive?: boolean;
  }): Promise<AcademicYear> {
    const { yearString, isActive } = data;

    try {
      // If this year is to be active, set all other years to inactive first
      if (isActive) {
        await prisma.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      const academicYear = await prisma.academicYear.create({
        data: {
          yearString: yearString,
          isActive: isActive ?? false, // Default to false if not provided
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

  // Retrieves all academic years, excluding soft-deleted ones by default.
  public async getAllAcademicYears(): Promise<AcademicYearWithCounts[]> {
    try {
      const academicYears = await prisma.academicYear.findMany({
        where: { isDeleted: false }, // Filter out soft-deleted records
        include: {
          _count: {
            select: {
              semesters: {
                where: { isDeleted: false }, // Only count non-deleted semesters
              },
              subjectAllocations: {
                where: { isDeleted: false }, // Only count non-deleted subject allocations
              },
            },
          },
        },
        orderBy: {
          yearString: 'desc', // Order by year string descending
        },
      });
      return academicYears;
    } catch (error: any) {
      throw new AppError('Failed to retrieve academic years.', 500);
    }
  }

  // Retrieves a single academic year by its ID, excluding soft-deleted ones.
  public async getAcademicYearById(
    id: string
  ): Promise<AcademicYearWithCounts | null> {
    try {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: id, isDeleted: false }, // Ensure it's not soft-deleted
        include: {
          _count: {
            select: {
              semesters: {
                where: { isDeleted: false }, // Only count non-deleted semesters
              },
              subjectAllocations: {
                where: { isDeleted: false }, // Only count non-deleted subject allocations
              },
            },
          },
        },
      });
      return academicYear;
    } catch (error: any) {
      throw new AppError('Failed to retrieve academic year.', 500);
    }
  }

  // Updates an existing academic year.
  public async updateAcademicYear(
    id: string,
    data: {
      yearString?: string;
      isActive?: boolean;
    }
  ): Promise<AcademicYear> {
    const { yearString, isActive } = data;

    try {
      // If this year is being set to active, deactivate all other years first
      if (isActive) {
        await prisma.academicYear.updateMany({
          where: {
            id: { not: id },
            isActive: true,
          },
          data: { isActive: false },
        });
      }

      const academicYear = await prisma.academicYear.update({
        where: { id: id, isDeleted: false }, // Ensure it's not soft-deleted
        data: {
          yearString: yearString,
          isActive: isActive,
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

  // Soft deletes an academic year by setting its isDeleted flag to true.
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

  // Gets the currently active academic year.
  public async getActiveAcademicYear(): Promise<AcademicYearWithCounts | null> {
    try {
      const activeAcademicYear = await prisma.academicYear.findFirst({
        where: { isActive: true, isDeleted: false },
        include: {
          _count: {
            select: {
              semesters: {
                where: { isDeleted: false }, // Only count non-deleted semesters
              },
              subjectAllocations: {
                where: { isDeleted: false }, // Only count non-deleted subject allocations
              },
            },
          },
        },
      });
      return activeAcademicYear;
    } catch (error: any) {
      throw new AppError('Failed to retrieve active academic year.', 500);
    }
  }
}

// Export an instance of the service to be used across the application (singleton pattern)
export const academicYearService = new AcademicYearService();
