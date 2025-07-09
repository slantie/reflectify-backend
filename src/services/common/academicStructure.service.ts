/**
 * @file src/services/academicStructure/academicStructure.service.ts
 * @description Service layer for retrieving the academic structure.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { Department } from '@prisma/client';

class AcademicStructureService {
  // Retrieves the complete academic structure, filtering out soft-deleted records.
  public async getAcademicStructure(): Promise<Department[]> {
    try {
      const academicStructure = await prisma.department.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted departments
        },
        include: {
          semesters: {
            where: {
              isDeleted: false, // Filter out soft-deleted semesters
            },
            include: {
              academicYear: {
                select: {
                  id: true,
                  yearString: true,
                  isActive: true,
                },
              },
              divisions: {
                where: {
                  isDeleted: false, // Filter out soft-deleted divisions
                },
              },
            },
            orderBy: [
              { academicYear: { yearString: 'desc' } }, // Order by academic year descending (most recent first)
              { semesterNumber: 'asc' }, // Then by semester number ascending
            ],
          },
        },
        orderBy: {
          name: 'asc', // Order departments by name
        },
      });
      return academicStructure;
    } catch (error: any) {
      console.error(
        'Error in AcademicStructureService.getAcademicStructure:',
        error
      );
      throw new AppError('Failed to retrieve academic structure.', 500);
    }
  }

  // Retrieves the academic structure for a specific academic year.
  public async getAcademicStructureByYear(
    academicYearId: string
  ): Promise<Department[]> {
    try {
      const academicStructure = await prisma.department.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted departments
        },
        include: {
          semesters: {
            where: {
              isDeleted: false, // Filter out soft-deleted semesters
              academicYearId: academicYearId, // Filter by academic year
            },
            include: {
              academicYear: {
                select: {
                  id: true,
                  yearString: true,
                  isActive: true,
                },
              },
              divisions: {
                where: {
                  isDeleted: false, // Filter out soft-deleted divisions
                },
              },
            },
            orderBy: {
              semesterNumber: 'asc', // Order by semester number ascending
            },
          },
        },
        orderBy: {
          name: 'asc', // Order departments by name
        },
      });
      return academicStructure;
    } catch (error: any) {
      console.error(
        'Error in AcademicStructureService.getAcademicStructureByYear:',
        error
      );
      throw new AppError(
        'Failed to retrieve academic structure for the specified year.',
        500
      );
    }
  }
}

export const academicStructureService = new AcademicStructureService();
