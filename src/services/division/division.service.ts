/**
 * @file src/services/division/division.service.ts
 * @description Service layer for Division operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Division, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Simple in-memory cache for division data
// Keyed by a composite string: `${departmentId}_${divisionName}_${semesterId}`
const divisionCache = new Map<string, Division>();

// Interface for division data input
interface DivisionDataInput {
  departmentId: string;
  semesterId: string;
  divisionName: string;
  studentCount?: number; // Optional, as it will be calculated or defaulted
}

class DivisionService {
  /**
   * Retrieves all active divisions, optionally filtered by departmentId and semesterId.
   * Includes related department and semester, and calculates studentCount.
   * Only returns divisions that are not soft-deleted and belong to non-soft-deleted parents.
   * @param departmentId - Optional ID of the department to filter by.
   * @param semesterId - Optional ID of the semester to filter by.
   * @returns An array of Division objects with calculated studentCount.
   */
  public async getAllDivisions(
    departmentId?: string,
    semesterId?: string
  ): Promise<Array<Omit<Division, 'students'> & { studentCount: number }>> {
    try {
      const whereClause: Prisma.DivisionWhereInput = {
        isDeleted: false,
        department: { isDeleted: false },
        semester: { isDeleted: false },
      };

      if (departmentId && semesterId) {
        whereClause.departmentId = departmentId;
        whereClause.semesterId = semesterId;
      } else if (departmentId || semesterId) {
        // This case should ideally be caught by Zod validation, but as a safeguard
        throw new AppError(
          'Both departmentId and semesterId must be provided if filtering.',
          400
        );
      }

      const divisions = await prisma.division.findMany({
        where: whereClause,
        include: {
          department: true,
          semester: true,
          students: {
            // Include students to calculate count
            where: { isDeleted: false },
          },
          mentors: { where: { isDeleted: false } },
          subjectAllocations: { where: { isDeleted: false } },
          feedbackForms: { where: { isDeleted: false } },
        },
      });

      // Map the divisions to include calculated studentCount and remove the raw students array
      const divisionsWithCount = divisions.map((division) => {
        const { students, ...rest } = division;
        return {
          ...rest,
          studentCount: students.length,
        };
      });

      return divisionsWithCount;
    } catch (error: any) {
      console.error('Error in DivisionService.getAllDivisions:', error);
      throw new AppError('Failed to retrieve divisions.', 500);
    }
  }

  /**
   * Creates a new division.
   * Validates existence and active status of parent department and semester.
   * @param data - The data for the new division.
   * @returns The created Division object.
   * @throws AppError if department/semester not found or if division name already exists.
   */
  public async createDivision(data: DivisionDataInput): Promise<Division> {
    const { departmentId, semesterId, divisionName } = data;

    // Clear cache on any write operation
    divisionCache.clear();

    // 1. Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    // 2. Validate Semester existence and active status
    const existingSemester = await prisma.semester.findUnique({
      where: { id: semesterId, isDeleted: false },
    });
    if (!existingSemester) {
      throw new AppError('Semester not found or is deleted.', 400);
    }

    try {
      const division = await prisma.division.upsert({
        where: {
          departmentId_divisionName_semesterId: {
            departmentId,
            divisionName,
            semesterId,
          },
        },
        create: {
          departmentId,
          semesterId,
          divisionName,
          studentCount: data.studentCount || 0, // Use provided count or default to 0
        },
        update: {
          // No specific update logic from original, so just an empty object or specific fields
          // For upsert, 'update' is required. If no specific updates are allowed on existing,
          // you might just update a timestamp or keep it empty.
        },
        include: {
          department: true,
          semester: true,
          mentors: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          subjectAllocations: { where: { isDeleted: false } },
          feedbackForms: { where: { isDeleted: false } },
        },
      });

      const divisionKey = `${departmentId}_${divisionName}_${semesterId}`;
      divisionCache.set(divisionKey, division);
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.createDivision:', error);
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('departmentId_divisionName_semesterId')
      ) {
        throw new AppError(
          'Division with this name already exists for the specified department and semester.',
          409
        );
      }
      throw new AppError('Failed to create division.', 500);
    }
  }

  /**
   * Retrieves a single active division by its ID.
   * Includes all related data as per the original controller.
   * @param id - The ID of the division to retrieve.
   * @returns The Division object, or null if not found.
   */
  public async getDivisionById(id: string): Promise<Division | null> {
    // Try to get from cache first (if cached by ID, otherwise it's a miss)
    let division: Division | null | undefined = divisionCache.get(id); // Assuming cache key is ID for this method
    if (division) {
      return division;
    }

    try {
      division = await prisma.division.findUnique({
        where: {
          id: id,
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
        },
        include: {
          department: true,
          semester: true,
          mentors: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          subjectAllocations: { where: { isDeleted: false } },
          feedbackForms: { where: { isDeleted: false } },
        },
      });

      if (division) {
        divisionCache.set(id, division); // Cache the result by ID
      }
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.getDivisionById:', error);
      throw new AppError('Failed to retrieve division.', 500);
    }
  }

  /**
   * Updates an existing division.
   * Validates existence and active status of parent department and semester if their IDs are provided.
   * @param id - The ID of the division to update.
   * @param data - The partial data to update the division with.
   * @returns The updated Division object.
   * @throws AppError if the division is not found or update fails.
   */
  public async updateDivision(
    id: string,
    data: Partial<DivisionDataInput>
  ): Promise<Division> {
    try {
      // Clear cache on any write operation
      divisionCache.clear();

      // Validate Department existence if departmentId is provided
      if (data.departmentId) {
        const existingDepartment = await prisma.department.findUnique({
          where: { id: data.departmentId, isDeleted: false },
        });
        if (!existingDepartment) {
          throw new AppError(
            'Provided department ID does not exist or is deleted.',
            400
          );
        }
      }

      // Validate Semester existence if semesterId is provided
      if (data.semesterId) {
        const existingSemester = await prisma.semester.findUnique({
          where: { id: data.semesterId, isDeleted: false },
        });
        if (!existingSemester) {
          throw new AppError(
            'Provided semester ID does not exist or is deleted.',
            400
          );
        }
      }

      const division = await prisma.division.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: data,
        include: {
          department: true,
          semester: true,
          mentors: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          subjectAllocations: { where: { isDeleted: false } },
          feedbackForms: { where: { isDeleted: false } },
        },
      });
      divisionCache.set(id, division); // Update cache by ID
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.updateDivision:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('Division not found for update.', 404);
      }
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('departmentId_divisionName_semesterId')
      ) {
        throw new AppError(
          'Division name already exists for the specified department and semester.',
          409
        );
      }
      throw new AppError('Failed to update division.', 500);
    }
  }

  /**
   * Soft deletes a division by setting its isDeleted flag to true.
   * @param id - The ID of the division to soft delete.
   * @returns The soft-deleted Division object.
   * @throws AppError if the division is not found.
   */
  public async softDeleteDivision(id: string): Promise<Division> {
    try {
      // Clear cache before deletion
      divisionCache.clear();

      const division = await prisma.division.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.softDeleteDivision:', error);
      if (error.code === 'P2025') {
        throw new AppError('Division not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete division.', 500);
    }
  }

  /**
   * Performs a batch creation of divisions.
   * Validates existence and active status of parent department and semester for each division.
   * @param divisionsData - An array of division data objects.
   * @returns An array of created or updated Division objects.
   * @throws AppError if any division creation/update fails due to invalid parent IDs or unique constraints.
   */
  public async batchCreateDivisions(
    divisionsData: DivisionDataInput[]
  ): Promise<Division[]> {
    // Clear cache before batch operation
    divisionCache.clear();

    const results: Division[] = [];

    for (const div of divisionsData) {
      // Validate Department existence and active status for each division
      const existingDepartment = await prisma.department.findUnique({
        where: { id: div.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${div.departmentId}' not found or is deleted for division '${div.divisionName}'.`,
          400
        );
      }

      // Validate Semester existence and active status for each division
      const existingSemester = await prisma.semester.findUnique({
        where: { id: div.semesterId, isDeleted: false },
      });
      if (!existingSemester) {
        throw new AppError(
          `Semester with ID '${div.semesterId}' not found or is deleted for division '${div.divisionName}'.`,
          400
        );
      }

      try {
        const division = await prisma.division.upsert({
          where: {
            departmentId_divisionName_semesterId: {
              departmentId: div.departmentId,
              divisionName: div.divisionName,
              semesterId: div.semesterId,
            },
          },
          create: {
            departmentId: div.departmentId,
            semesterId: div.semesterId,
            divisionName: div.divisionName,
            studentCount: div.studentCount || 0,
          },
          update: {}, // No specific update logic for existing divisions in batch create
          include: {
            department: true,
            semester: true,
            mentors: { where: { isDeleted: false } },
            students: { where: { isDeleted: false } },
            subjectAllocations: { where: { isDeleted: false } },
            feedbackForms: { where: { isDeleted: false } },
          },
        });
        results.push(division);
      } catch (error: any) {
        console.error(
          `Error in batch creating division '${div.divisionName}':`,
          error
        );
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('departmentId_divisionName_semesterId')
        ) {
          throw new AppError(
            `Division '${div.divisionName}' already exists for department '${div.departmentId}' and semester '${div.semesterId}'.`,
            409
          );
        }
        throw new AppError(
          `Failed to batch create division '${div.divisionName}'.`,
          500
        );
      }
    }
    return results;
  }
}

export const divisionService = new DivisionService();
