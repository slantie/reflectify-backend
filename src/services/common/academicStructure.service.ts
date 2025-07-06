/**
 * @file src/services/academicStructure/academicStructure.service.ts
 * @description Service layer for retrieving the academic structure.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';
import { Department } from '@prisma/client'; // Import Department type for return type clarity

class AcademicStructureService {
  /**
   * Retrieves the complete academic structure, including departments, semesters, and divisions.
   * Filters out all soft-deleted records at each level.
   * @returns {Promise<Department[]>} An array of Department objects with nested semesters and divisions.
   */
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
              divisions: {
                where: {
                  isDeleted: false, // Filter out soft-deleted divisions
                },
              },
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
        'Error in AcademicStructureService.getAcademicStructure:',
        error
      );
      throw new AppError('Failed to retrieve academic structure.', 500);
    }
  }
}

export const academicStructureService = new AcademicStructureService();
