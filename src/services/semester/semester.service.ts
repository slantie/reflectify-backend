/**
 * @file src/services/semester/semester.service.ts
 * @description Service layer for Semester operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Semester, Prisma, SemesterTypeEnum } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Simple in-memory cache for semester data
// Keyed by a composite string: `${departmentId}_${semesterNumber}_${academicYearId}_${semesterType}`
const semesterCache = new Map<string, Semester>();

// Interface for semester data input
interface SemesterDataInput {
  departmentId: string;
  semesterNumber: number;
  academicYearId: string;
  startDate?: string;
  endDate?: string;
  semesterType: SemesterTypeEnum;
}

class SemesterService {
  /**
   * Retrieves all active semesters, optionally filtered by departmentId, academicYearId, semesterNumber, and semesterType.
   * Includes related department and academic year.
   * Only returns semesters that are not soft-deleted and belong to non-soft-deleted parents.
   * @param filters - Optional filters (departmentId, academicYearId, semesterNumber, semesterType).
   * @returns An array of Semester objects.
   */
  public async getAllSemesters(filters: {
    departmentId?: string;
    academicYearId?: string;
    semesterNumber?: number;
    semesterType?: SemesterTypeEnum;
  }): Promise<Semester[]> {
    try {
      const whereClause: Prisma.SemesterWhereInput = {
        isDeleted: false,
        department: { isDeleted: false },
        academicYear: { isDeleted: false },
      };

      if (filters.departmentId) {
        whereClause.departmentId = filters.departmentId;
      }
      if (filters.academicYearId) {
        whereClause.academicYearId = filters.academicYearId;
      }
      if (filters.semesterNumber !== undefined) {
        whereClause.semesterNumber = filters.semesterNumber;
      }
      if (filters.semesterType) {
        whereClause.semesterType = filters.semesterType;
      }

      const semesters = await prisma.semester.findMany({
        where: whereClause,
        include: {
          department: true,
          academicYear: true,
          divisions: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
        orderBy: [
          // Changed to an array of order by objects
          { academicYear: { yearString: 'desc' } }, // Order by academic year string
          { semesterNumber: 'asc' }, // Then by semester number
        ],
      });
      return semesters;
    } catch (error: any) {
      console.error('Error in SemesterService.getAllSemesters:', error);
      throw new AppError('Failed to retrieve semesters.', 500);
    }
  }

  /**
   * Creates a new semester.
   * Validates existence and active status of parent department and academic year.
   * @param data - The data for the new semester.
   * @returns The created Semester object.
   * @throws AppError if department/academic year not found or if semester already exists.
   */
  public async createSemester(data: SemesterDataInput): Promise<Semester> {
    const {
      departmentId,
      semesterNumber,
      academicYearId,
      startDate,
      endDate,
      semesterType,
    } = data;

    // Clear cache on any write operation
    semesterCache.clear();

    // 1. Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    // 2. Validate Academic Year existence and active status
    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId, isDeleted: false },
    });
    if (!existingAcademicYear) {
      throw new AppError('Academic Year not found or is deleted.', 400);
    }

    try {
      const semester = await prisma.semester.upsert({
        where: {
          // Use the composite unique key defined in your Prisma schema
          departmentId_semesterNumber_academicYearId_semesterType: {
            departmentId,
            semesterNumber,
            academicYearId,
            semesterType,
          },
        },
        create: {
          departmentId,
          semesterNumber,
          academicYearId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          semesterType,
        },
        update: {
          // Update only if specific fields are provided, or keep empty object if no specific update logic
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          // Note: semesterType, departmentId, academicYearId, semesterNumber are part of unique key,
          // generally not updated in an upsert's update clause if they define uniqueness.
        },
        include: {
          department: true,
          academicYear: true,
          divisions: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
      });

      const semesterKey = `${departmentId}_${semesterNumber}_${academicYearId}_${semesterType}`;
      semesterCache.set(semesterKey, semester);
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.createSemester:', error);
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes(
          'departmentId_semesterNumber_academicYearId_semesterType'
        )
      ) {
        throw new AppError(
          'Semester with this number and type already exists for the specified department and academic year.',
          409
        );
      }
      throw new AppError('Failed to create semester.', 500);
    }
  }

  /**
   * Retrieves a single active semester by its ID.
   * Includes all related data as per the original controller.
   * @param id - The ID of the semester to retrieve.
   * @returns The Semester object, or null if not found.
   */
  public async getSemesterById(id: string): Promise<Semester | null> {
    // Try to get from cache first (if cached by ID, otherwise it's a miss)
    let semester: Semester | null | undefined = semesterCache.get(id); // Assuming cache key is ID for this method
    if (semester) {
      return semester;
    }

    try {
      semester = await prisma.semester.findUnique({
        where: {
          id: id,
          isDeleted: false,
          department: { isDeleted: false },
          academicYear: { isDeleted: false },
        },
        include: {
          department: true,
          academicYear: true,
          divisions: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
      });

      if (semester) {
        semesterCache.set(id, semester); // Cache the result by ID
      }
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.getSemesterById:', error);
      throw new AppError('Failed to retrieve semester.', 500);
    }
  }

  /**
   * Updates an existing semester.
   * Validates existence and active status of parent department and academic year if their IDs are provided.
   * @param id - The ID of the semester to update.
   * @param data - The partial data to update the semester with.
   * @returns The updated Semester object.
   * @throws AppError if the semester is not found or update fails.
   */
  public async updateSemester(
    id: string,
    data: Partial<SemesterDataInput>
  ): Promise<Semester> {
    try {
      // Clear cache on any write operation
      semesterCache.clear();

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

      // Validate Academic Year existence if academicYearId is provided
      if (data.academicYearId) {
        const existingAcademicYear = await prisma.academicYear.findUnique({
          where: { id: data.academicYearId, isDeleted: false },
        });
        if (!existingAcademicYear) {
          throw new AppError(
            'Provided academic year ID does not exist or is deleted.',
            400
          );
        }
      }

      const semester = await prisma.semester.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: {
          department: true,
          academicYear: true,
          divisions: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
      });
      semesterCache.set(id, semester); // Update cache by ID
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.updateSemester:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('Semester not found for update.', 404);
      }
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes(
          'departmentId_semesterNumber_academicYearId_semesterType'
        )
      ) {
        throw new AppError(
          'Semester with this combination already exists.',
          409
        );
      }
      throw new AppError('Failed to update semester.', 500);
    }
  }

  /**
   * Soft deletes a semester by setting its isDeleted flag to true.
   * @param id - The ID of the semester to soft delete.
   * @returns The soft-deleted Semester object.
   * @throws AppError if the semester is not found.
   */
  public async softDeleteSemester(id: string): Promise<Semester> {
    try {
      // Clear cache before deletion
      semesterCache.clear();

      const semester = await prisma.semester.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.softDeleteSemester:', error);
      if (error.code === 'P2025') {
        throw new AppError('Semester not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete semester.', 500);
    }
  }

  /**
   * Performs a batch creation of semesters.
   * Validates existence and active status of parent department and academic year for each semester.
   * @param semestersData - An array of semester data objects.
   * @returns An array of created or updated Semester objects.
   * @throws AppError if any semester creation/update fails due to invalid parent IDs or unique constraints.
   */
  public async batchCreateSemesters(
    semestersData: SemesterDataInput[]
  ): Promise<Semester[]> {
    // Clear cache before batch operation
    semesterCache.clear();

    const results: Semester[] = [];

    for (const sem of semestersData) {
      // Validate Department existence and active status for each semester
      const existingDepartment = await prisma.department.findUnique({
        where: { id: sem.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${sem.departmentId}' not found or is deleted for semester '${sem.semesterNumber}'.`,
          400
        );
      }

      // Validate Academic Year existence and active status for each semester
      const existingAcademicYear = await prisma.academicYear.findUnique({
        where: { id: sem.academicYearId, isDeleted: false },
      });
      if (!existingAcademicYear) {
        throw new AppError(
          `Academic Year with ID '${sem.academicYearId}' not found or is deleted for semester '${sem.semesterNumber}'.`,
          400
        );
      }

      try {
        const semester = await prisma.semester.upsert({
          where: {
            departmentId_semesterNumber_academicYearId_semesterType: {
              departmentId: sem.departmentId,
              semesterNumber: sem.semesterNumber,
              academicYearId: sem.academicYearId,
              semesterType: sem.semesterType,
            },
          },
          create: {
            departmentId: sem.departmentId,
            semesterNumber: sem.semesterNumber,
            academicYearId: sem.academicYearId,
            startDate: sem.startDate ? new Date(sem.startDate) : undefined,
            endDate: sem.endDate ? new Date(sem.endDate) : undefined,
            semesterType: sem.semesterType,
          },
          update: {
            startDate: sem.startDate ? new Date(sem.startDate) : undefined,
            endDate: sem.endDate ? new Date(sem.endDate) : undefined,
          },
          include: {
            department: true,
            academicYear: true,
            divisions: { where: { isDeleted: false } },
            subjects: { where: { isDeleted: false } },
            students: { where: { isDeleted: false } },
            allocations: { where: { isDeleted: false } },
          },
        });
        results.push(semester);
      } catch (error: any) {
        console.error(
          `Error in batch creating semester '${sem.semesterNumber}':`,
          error
        );
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes(
            'departmentId_semesterNumber_academicYearId_semesterType'
          )
        ) {
          throw new AppError(
            `Semester '${sem.semesterNumber}' already exists for department '${sem.departmentId}', academic year '${sem.academicYearId}', and type '${sem.semesterType}'.`,
            409
          );
        }
        throw new AppError(
          `Failed to batch create semester '${sem.semesterNumber}'.`,
          500
        );
      }
    }
    return results;
  }

  /**
   * Retrieves all active semesters for a specific department.
   * @param departmentId - The ID of the department.
   * @returns An array of Semester objects.
   * @throws AppError if the department is not found or retrieval fails.
   */
  public async getSemestersByDepartmentId(
    departmentId: string
  ): Promise<Semester[]> {
    try {
      // Validate Department existence and active status
      const existingDepartment = await prisma.department.findUnique({
        where: { id: departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError('Department not found or is deleted.', 404);
      }

      const semesters = await prisma.semester.findMany({
        where: {
          departmentId: departmentId,
          isDeleted: false,
          academicYear: { isDeleted: false }, // Ensure academic year is also active
        },
        include: {
          academicYear: true, // Include academic year details
          divisions: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
        orderBy: [
          { academicYear: { yearString: 'desc' } },
          { semesterNumber: 'asc' },
        ],
      });
      return semesters;
    } catch (error: any) {
      console.error(
        'Error in SemesterService.getSemestersByDepartmentId:',
        error
      );
      throw new AppError(
        'Failed to retrieve semesters for the specified department.',
        500
      );
    }
  }
}

export const semesterService = new SemesterService();
