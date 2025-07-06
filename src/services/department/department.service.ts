/**
 * @file src/services/department/department.service.ts
 * @description Service layer for Department operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Department } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import { collegeService } from '../college/college.service'; // Import college service for dependency
import AppError from '../../utils/appError';

// Simple in-memory cache for department data
const departmentCache = new Map<string, Department>();

// Interface for department data input, matching the Zod schema and Prisma input
interface DepartmentDataInput {
  name: string;
  abbreviation?: string;
  hodName?: string;
  hodEmail?: string;
  collegeId?: string;
}

class DepartmentService {
  /**
   * Retrieves all active departments.
   * Includes related college, semesters, divisions, subjects, faculties, and students.
   * Only returns departments that are not soft-deleted and belong to a non-soft-deleted college.
   * @returns An array of Department objects.
   */
  public async getAllDepartments(): Promise<Department[]> {
    try {
      const departments = await prisma.department.findMany({
        where: {
          isDeleted: false,
          college: {
            // Filter departments whose associated college is also not deleted
            isDeleted: false,
          },
        },
        include: {
          college: true, // Just include the college, no nested where here
          semesters: { where: { isDeleted: false } },
          Division: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          faculties: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
        },
      });
      return departments;
    } catch (error: any) {
      console.error('Error in DepartmentService.getAllDepartments:', error);
      throw new AppError('Failed to retrieve departments.', 500);
    }
  }

  /**
   * Creates a new department or updates an existing one if it matches by name and collegeId.
   * Handles default values for abbreviation, HOD name, and HOD email.
   * Automatically upserts the primary college if no collegeId is provided.
   * @param data - The data for the new department.
   * @returns The created or updated Department object.
   * @throws AppError if email already exists or if super admin already exists.
   */
  public async createDepartment(
    data: DepartmentDataInput
  ): Promise<Department> {
    const { name, abbreviation, hodName, hodEmail } = data;
    let { collegeId } = data;

    // Clear cache on any write operation
    departmentCache.clear();

    // If no collegeId is provided, assume it's for the primary college
    if (!collegeId) {
      const primaryCollege = await collegeService.upsertPrimaryCollege({}); // Ensure primary college exists
      collegeId = primaryCollege.id;
    } else {
      // Validate if the provided collegeId exists and is not deleted
      const existingCollege = await prisma.college.findUnique({
        where: { id: collegeId, isDeleted: false },
      });
      if (!existingCollege) {
        throw new AppError(
          'Provided college ID does not exist or is deleted.',
          400
        );
      }
    }

    // Generate default values if not provided
    const finalAbbreviation = abbreviation || name;
    const finalHodName = hodName || `HOD of ${name}`;
    const finalHodEmail =
      hodEmail || `hod.${name.toLowerCase().replace(/\s/g, '')}@ldrp.ac.in`; // Remove spaces for email

    try {
      const department = await prisma.department.upsert({
        where: {
          name_collegeId: {
            name: name,
            collegeId: collegeId,
          },
        },
        create: {
          name: name,
          abbreviation: finalAbbreviation,
          hodName: finalHodName,
          hodEmail: finalHodEmail,
          collegeId: collegeId,
        },
        update: {
          // Only update if there's new data for these fields, or if they were explicitly provided
          abbreviation:
            abbreviation !== undefined ? abbreviation : finalAbbreviation,
          hodName: hodName !== undefined ? hodName : finalHodName,
          hodEmail: hodEmail !== undefined ? hodEmail : finalHodEmail,
        },
        include: {
          college: true,
          semesters: true,
          faculties: true,
          subjects: true,
          Division: true,
        },
      });

      departmentCache.set(name, department); // Cache by name (or a composite key)
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.createDepartment:', error);
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('name_collegeId')
      ) {
        throw new AppError(
          'Department with this name already exists in the specified college.',
          409
        );
      }
      throw new AppError('Failed to create department.', 500);
    }
  }

  /**
   * Retrieves a single department by its ID, excluding soft-deleted ones.
   * Includes related college, semesters, divisions, subjects, faculties, and students.
   * Uses in-memory cache.
   * @param id - The ID of the department to retrieve.
   * @returns The Department object, or null if not found.
   */
  public async getDepartmentById(id: string): Promise<Department | null> {
    // Try to get from cache first (if cached by ID, otherwise it's a miss)
    let department: Department | null | undefined = departmentCache.get(id); // Assuming cache key is ID for this method
    if (department) {
      return department;
    }

    try {
      department = await prisma.department.findUnique({
        where: {
          id: id,
          isDeleted: false,
          college: {
            // Filter departments whose associated college is also not deleted
            isDeleted: false,
          },
        },
        include: {
          college: true, // Just include the college, no nested where here
          semesters: { where: { isDeleted: false } },
          Division: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          faculties: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
        },
      });

      if (department) {
        departmentCache.set(id, department); // Cache the result by ID
      }
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.getDepartmentById:', error);
      throw new AppError('Failed to retrieve department.', 500);
    }
  }

  /**
   * Updates an existing department.
   * @param id - The ID of the department to update.
   * @param data - The partial data to update the department with.
   * @returns The updated Department object.
   * @throws AppError if the department is not found or update fails.
   */
  public async updateDepartment(
    id: string,
    data: Partial<DepartmentDataInput>
  ): Promise<Department> {
    try {
      // Clear cache on any write operation
      departmentCache.clear();

      // If collegeId is provided, validate its existence
      if (data.collegeId) {
        const existingCollege = await prisma.college.findUnique({
          where: { id: data.collegeId, isDeleted: false },
        });
        if (!existingCollege) {
          throw new AppError(
            'Provided college ID does not exist or is deleted.',
            400
          );
        }
      }

      const department = await prisma.department.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: data,
        include: {
          college: true,
          semesters: true,
          faculties: true,
          subjects: true,
          Division: true,
        },
      });
      departmentCache.set(id, department); // Update cache by ID
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.updateDepartment:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('Department not found for update.', 404);
      }
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('name_collegeId')
      ) {
        throw new AppError(
          'Department name already exists within this college.',
          409
        );
      }
      throw new AppError('Failed to update department.', 500);
    }
  }

  /**
   * Soft deletes a department by setting its isDeleted flag to true.
   * @param id - The ID of the department to soft delete.
   * @returns The soft-deleted Department object.
   * @throws AppError if the department is not found.
   */
  public async softDeleteDepartment(id: string): Promise<Department> {
    try {
      // Clear cache before deletion
      departmentCache.clear();

      const department = await prisma.department.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.softDeleteDepartment:', error);
      if (error.code === 'P2025') {
        throw new AppError('Department not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete department.', 500);
    }
  }

  /**
   * Performs a batch creation of departments.
   * Each department is created or updated based on its name and the primary college.
   * @param departmentsData - An array of department data objects.
   * @returns An array of created or updated Department objects.
   * @throws AppError if any department creation/update fails.
   */
  public async batchCreateDepartments(
    departmentsData: DepartmentDataInput[]
  ): Promise<Department[]> {
    // Clear cache before batch operation
    departmentCache.clear();

    const results: Department[] = [];
    const primaryCollege = await collegeService.upsertPrimaryCollege({}); // Ensure primary college exists

    for (const dept of departmentsData) {
      // Generate default values for each department if not provided
      const finalAbbreviation = dept.abbreviation || dept.name;
      const finalHodName = dept.hodName || `HOD of ${dept.name}`;
      const finalHodEmail =
        dept.hodEmail ||
        `hod.${dept.name.toLowerCase().replace(/\s/g, '')}@ldrp.ac.in`;

      try {
        const department = await prisma.department.upsert({
          where: {
            name_collegeId: {
              name: dept.name,
              collegeId: primaryCollege.id,
            },
          },
          create: {
            name: dept.name,
            abbreviation: finalAbbreviation,
            hodName: finalHodName,
            hodEmail: finalHodEmail,
            collegeId: primaryCollege.id,
          },
          update: {
            abbreviation:
              dept.abbreviation !== undefined
                ? dept.abbreviation
                : finalAbbreviation,
            hodName: dept.hodName !== undefined ? dept.hodName : finalHodName,
            hodEmail:
              dept.hodEmail !== undefined ? dept.hodEmail : finalHodEmail,
          },
          include: {
            college: true,
            semesters: true,
            faculties: true,
            subjects: true,
            Division: true,
          },
        });
        results.push(department);
      } catch (error: any) {
        console.error(
          `Error in batch creating department ${dept.name}:`,
          error
        );
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('name_collegeId')
        ) {
          throw new AppError(
            `Department '${dept.name}' already exists in the primary college.`,
            409
          );
        }
        throw new AppError(
          `Failed to batch create department '${dept.name}'.`,
          500
        );
      }
    }
    return results;
  }
}

export const departmentService = new DepartmentService();
