/**
 * @file src/services/faculty/faculty.service.ts
 * @description Service layer for Faculty operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Faculty, Prisma, Designation } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Simple in-memory cache for faculty data
// Keyed by email or ID depending on the operation
const facultyCache = new Map<string, Faculty>();

// Interface for faculty data input
interface FacultyDataInput {
  name: string;
  abbreviation?: string;
  email: string;
  designation: Designation; // Use Prisma's Designation enum
  seatingLocation: string;
  image?: string | null; // Allow null for image
  joiningDate?: string; // Expect string for input, convert to Date internally
  departmentId: string;
}

class FacultyService {
  /**
   * Retrieves all active faculties.
   * Includes related department, mentored divisions, and allocations.
   * Only returns faculties that are not soft-deleted and belong to a non-soft-deleted department.
   * @returns An array of Faculty objects.
   */
  public async getAllFaculties(): Promise<Faculty[]> {
    try {
      const faculties = await prisma.faculty.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false }, // Filter by active department
        },
        include: {
          department: true,
          mentoredDivisions: { where: { isDeleted: false } }, // Filter active divisions
          allocations: { where: { isDeleted: false } }, // Filter active allocations
        },
      });
      return faculties;
    } catch (error: any) {
      console.error('Error in FacultyService.getAllFaculties:', error);
      throw new AppError('Failed to retrieve faculties.', 500);
    }
  }

  /**
   * Creates a new faculty or updates an existing one based on email.
   * Handles default values for abbreviation, designation, and joining date.
   * Validates existence and active status of the parent department.
   * @param data - The data for the new faculty.
   * @returns The created or updated Faculty object.
   * @throws AppError if department not found or if email already exists for an active faculty.
   */
  public async createFaculty(data: FacultyDataInput): Promise<Faculty> {
    const {
      name,
      abbreviation,
      email,
      designation,
      seatingLocation,
      image,
      joiningDate,
      departmentId,
    } = data;

    // Clear cache on any write operation
    facultyCache.clear();

    // 1. Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    // Generate default values if not provided
    const finalAbbreviation =
      abbreviation ||
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase(); // E.g., John Doe -> JD
    const finalJoiningDate = joiningDate ? new Date(joiningDate) : new Date();

    try {
      const faculty = await prisma.faculty.upsert({
        where: { email: email }, // Unique field for upsert
        create: {
          name,
          abbreviation: finalAbbreviation,
          email,
          designation,
          seatingLocation,
          image,
          joiningDate: finalJoiningDate,
          departmentId,
        },
        update: {
          // For upsert, update is required. We can leave it empty if no specific update logic for existing.
          // Or, update only if a field is explicitly provided in data.
          name: name, // Assuming name can be updated
          abbreviation:
            abbreviation !== undefined ? abbreviation : finalAbbreviation,
          designation: designation,
          seatingLocation: seatingLocation,
          image: image,
          joiningDate: joiningDate ? new Date(joiningDate) : undefined,
          departmentId: departmentId,
        },
        include: {
          department: true,
          mentoredDivisions: true,
          allocations: true,
        },
      });

      facultyCache.set(email, faculty); // Cache by email
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.createFaculty:', error);
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new AppError('Faculty with this email already exists.', 409);
      }
      throw new AppError('Failed to create faculty.', 500);
    }
  }

  /**
   * Retrieves a single active faculty by its ID.
   * Includes related department, mentored divisions, and allocations.
   * @param id - The ID of the faculty to retrieve.
   * @returns The Faculty object, or null if not found.
   */
  public async getFacultyById(id: string): Promise<Faculty | null> {
    // Try to get from cache first
    let faculty: Faculty | null | undefined = facultyCache.get(id); // Assuming cache key is ID for this method
    if (faculty) {
      return faculty;
    }

    try {
      faculty = await prisma.faculty.findUnique({
        where: {
          id: id,
          isDeleted: false,
          department: { isDeleted: false },
        },
        include: {
          department: true,
          mentoredDivisions: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
      });

      if (faculty) {
        facultyCache.set(id, faculty); // Cache the result by ID
      }
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.getFacultyById:', error);
      throw new AppError('Failed to retrieve faculty.', 500);
    }
  }

  /**
   * Updates an existing faculty.
   * Validates existence and active status of the parent department if departmentId is provided.
   * @param id - The ID of the faculty to update.
   * @param data - The partial data to update the faculty with.
   * @returns The updated Faculty object.
   * @throws AppError if the faculty is not found or update fails.
   */
  public async updateFaculty(
    id: string,
    data: Partial<FacultyDataInput>
  ): Promise<Faculty> {
    try {
      // Clear cache on any write operation
      facultyCache.clear();

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

      const faculty = await prisma.faculty.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: {
          ...data,
          joiningDate: data.joiningDate
            ? new Date(data.joiningDate)
            : undefined,
        },
        include: {
          department: true,
          mentoredDivisions: true,
          allocations: true,
        },
      });
      facultyCache.set(id, faculty); // Update cache by ID
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.updateFaculty:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('Faculty not found for update.', 404);
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new AppError('Faculty with this email already exists.', 409);
      }
      throw new AppError('Failed to update faculty.', 500);
    }
  }

  /**
   * Soft deletes a faculty by setting its isDeleted flag to true.
   * @param id - The ID of the faculty to soft delete.
   * @returns The soft-deleted Faculty object.
   * @throws AppError if the faculty is not found.
   */
  public async softDeleteFaculty(id: string): Promise<Faculty> {
    try {
      // Clear cache before deletion
      facultyCache.clear();

      const faculty = await prisma.faculty.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.softDeleteFaculty:', error);
      if (error.code === 'P2025') {
        throw new AppError('Faculty not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete faculty.', 500);
    }
  }

  /**
   * Performs a batch creation of faculties.
   * Validates existence and active status of parent department for each faculty.
   * @param facultiesData - An array of faculty data objects.
   * @returns An array of created or updated Faculty objects.
   * @throws AppError if any faculty creation/update fails due to invalid parent IDs or unique constraints.
   */
  public async batchCreateFaculties(
    facultiesData: FacultyDataInput[]
  ): Promise<Faculty[]> {
    // Clear cache before batch operation
    facultyCache.clear();

    const results: Faculty[] = [];

    for (const fac of facultiesData) {
      // Validate Department existence and active status for each faculty
      const existingDepartment = await prisma.department.findUnique({
        where: { id: fac.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${fac.departmentId}' not found or is deleted for faculty '${fac.name}'.`,
          400
        );
      }

      // Generate default values for each faculty if not provided
      const finalAbbreviation =
        fac.abbreviation ||
        fac.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase();
      const finalJoiningDate = fac.joiningDate
        ? new Date(fac.joiningDate)
        : new Date();

      try {
        const faculty = await prisma.faculty.upsert({
          where: { email: fac.email },
          create: {
            name: fac.name,
            abbreviation: finalAbbreviation,
            email: fac.email,
            designation: fac.designation,
            seatingLocation: fac.seatingLocation,
            image: fac.image,
            joiningDate: finalJoiningDate,
            departmentId: fac.departmentId,
          },
          update: {
            name: fac.name,
            abbreviation:
              fac.abbreviation !== undefined
                ? fac.abbreviation
                : finalAbbreviation,
            designation: fac.designation,
            seatingLocation: fac.seatingLocation,
            image: fac.image,
            joiningDate: fac.joiningDate
              ? new Date(fac.joiningDate)
              : undefined,
            departmentId: fac.departmentId,
          },
          include: {
            department: true,
            mentoredDivisions: true,
            allocations: true,
          },
        });
        results.push(faculty);
      } catch (error: any) {
        console.error(`Error in batch creating faculty '${fac.name}':`, error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          throw new AppError(
            `Faculty with email '${fac.email}' already exists.`,
            409
          );
        }
        throw new AppError(
          `Failed to batch create faculty '${fac.name}'.`,
          500
        );
      }
    }
    return results;
  }

  /**
   * Retrieves faculty abbreviations, optionally filtered by department abbreviation.
   * Only includes active faculties and departments/colleges.
   * @param deptAbbr - Optional department abbreviation to filter by.
   * @returns An array of faculty abbreviations.
   */
  public async getFacultyAbbreviations(deptAbbr?: string): Promise<string[]> {
    try {
      // Define the base department filter
      const departmentFilter: Prisma.DepartmentWhereInput = {
        isDeleted: false,
        college: { isDeleted: false, id: 'LDRP-ITR' },
      };

      // Add abbreviation filter if provided
      if (deptAbbr) {
        // Assign directly, as 'abbreviation' is a valid property on DepartmentWhereInput
        departmentFilter.abbreviation = deptAbbr.trim().toUpperCase();
      }

      const faculties = await prisma.faculty.findMany({
        where: {
          isDeleted: false,
          department: departmentFilter, // Use the constructed departmentFilter
        },
        select: { abbreviation: true },
      });

      if (!faculties.length && deptAbbr) {
        // If a department abbreviation was provided but no faculties found,
        // check if the department itself exists and is active.
        const departmentExists = await prisma.department.findFirst({
          where: {
            abbreviation: deptAbbr.trim().toUpperCase(),
            isDeleted: false,
            college: { isDeleted: false, id: 'LDRP-ITR' },
          },
        });
        if (!departmentExists) {
          throw new AppError(
            `Department "${deptAbbr}" not found or is deleted.`,
            404
          );
        }
        // If department exists but no faculties, return empty array (not a 404)
        return [];
      }

      // Filter out null abbreviations, though your schema marks it optional so it could be null
      const abbreviations = faculties
        .map((f) => f.abbreviation)
        .filter((abbr): abbr is string => abbr !== null && abbr !== undefined);
      return abbreviations;
    } catch (error: any) {
      console.error('Error in FacultyService.getFacultyAbbreviations:', error);
      // Re-throw AppError directly, otherwise wrap generic errors
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve faculty abbreviations.', 500);
    }
  }
}

export const facultyService = new FacultyService();
