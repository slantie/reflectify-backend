/**
 * @file src/services/college/college.service.ts
 * @description Service layer for College operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { College, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Define the fixed COLLEGE_ID as per the original controller logic
const COLLEGE_ID = 'LDRP-ITR'; // Consider making this configurable if more colleges are added

// Simple in-memory cache for the primary college data
// NOTE: This cache is only effective for a single-instance Node.js application.
// For multi-instance deployments, consider a distributed cache like Redis.
const collegeCache = new Map<string, College>();

// Interface for college data, matching the Prisma schema structure for INPUT
interface CollegeDataInput {
  name: string;
  websiteUrl: string;
  address: string;
  contactNumber: string;
  logo: string;
  // Use Prisma.InputJsonValue for data going INTO Prisma operations
  images: Prisma.InputJsonValue;
}

// Default college data for initial upsert, ensuring 'images' is a valid InputJsonValue
const defaultCollegeData: CollegeDataInput = {
  name: 'LDRP Institute of Technology and Research',
  websiteUrl: 'https://www.ldrp.ac.in',
  address: 'Gujarat',
  contactNumber: '7923241492',
  logo: 'ldrp_logo.png',
  images: {}, // This is a valid Prisma.JsonObject, which is a Prisma.InputJsonValue
};

class CollegeService {
  /**
   * Retrieves all active colleges.
   * Includes related departments, semesters, divisions, subjects, faculties, and students.
   * @returns An array of College objects.
   */
  public async getAllColleges(): Promise<College[]> {
    try {
      const colleges = await prisma.college.findMany({
        where: { isDeleted: false }, // Filter out soft-deleted records
        include: {
          departments: {
            where: { isDeleted: false }, // Also filter deleted departments
            include: {
              semesters: { where: { isDeleted: false } },
              Division: { where: { isDeleted: false } }, // Ensure correct model name 'Division'
              subjects: { where: { isDeleted: false } },
              faculties: { where: { isDeleted: false } },
              students: { where: { isDeleted: false } },
            },
          },
        },
      });
      return colleges;
    } catch (error: any) {
      console.error('Error in CollegeService.getAllColleges:', error);
      throw new AppError('Failed to retrieve colleges.', 500);
    }
  }

  /**
   * Creates or updates the primary college based on COLLEGE_ID.
   * If the college with COLLEGE_ID does not exist, it creates it with default data.
   * Otherwise, it updates the existing college with provided data.
   * Manages the in-memory cache.
   * @param data - The data to update the college with.
   * @returns The created or updated College object.
   * @throws AppError if the operation fails due to database constraints or other errors.
   */
  public async upsertPrimaryCollege(
    data: Partial<CollegeDataInput>
  ): Promise<College> {
    try {
      // Clear cache before upsert to ensure fresh data is fetched
      collegeCache.clear();

      // Prepare data for Prisma, explicitly handling 'images' null value if present
      const imagesForPrisma =
        data.images === null ? Prisma.JsonNull : data.images;

      const college = await prisma.college.upsert({
        where: { id: COLLEGE_ID },
        create: {
          id: COLLEGE_ID, // Explicitly providing ID for upsert's create branch
          ...defaultCollegeData,
          ...data,
          images: imagesForPrisma, // Use the prepared images value
        } as Prisma.CollegeUncheckedCreateInput, // Cast to UncheckedCreateInput to allow 'id'
        update: {
          ...data,
          images: imagesForPrisma, // Use the prepared images value
        } as Prisma.CollegeUpdateInput, // Cast to UpdateInput
        include: {
          departments: true, // Include departments for the response
        },
      });

      // Update cache with the new/updated college data
      collegeCache.set(COLLEGE_ID, college);

      return college;
    } catch (error: any) {
      console.error('Error in CollegeService.upsertPrimaryCollege:', error);
      // P2002 for unique constraint violation (e.g., if name is unique and conflicts)
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new AppError('College with this name already exists.', 409);
      }
      throw new AppError('Failed to create/update college.', 500);
    }
  }

  /**
   * Retrieves the primary college by its fixed ID.
   * Includes related departments, semesters, divisions, subjects, faculties, and students.
   * Uses in-memory cache for faster retrieval.
   * @returns The College object, or null if not found.
   */
  public async getPrimaryCollege(): Promise<College | null> {
    // Try to get from cache first
    // Explicitly type 'college' to allow for null or undefined
    let college: College | null | undefined = collegeCache.get(COLLEGE_ID);
    if (college) {
      return college;
    }

    try {
      college = await prisma.college.findUnique({
        where: { id: COLLEGE_ID, isDeleted: false }, // Ensure it's not soft-deleted
        include: {
          departments: {
            where: { isDeleted: false },
            include: {
              semesters: { where: { isDeleted: false } },
              Division: { where: { isDeleted: false } },
              subjects: { where: { isDeleted: false } },
              faculties: { where: { isDeleted: false } },
              students: { where: { isDeleted: false } },
            },
          },
        },
      });

      if (college) {
        collegeCache.set(COLLEGE_ID, college); // Cache the result
      }
      return college;
    } catch (error: any) {
      console.error('Error in CollegeService.getPrimaryCollege:', error);
      throw new AppError('Failed to retrieve college details.', 500);
    }
  }

  /**
   * Updates the primary college with provided data.
   * @param data - The partial data to update the college with.
   * @returns The updated College object.
   * @throws AppError if the college is not found or update fails.
   */
  public async updatePrimaryCollege(
    data: Partial<CollegeDataInput>
  ): Promise<College> {
    try {
      // Clear cache before update to ensure fresh data is fetched
      collegeCache.clear();

      // Prepare data for Prisma, explicitly handling 'images' null value if present
      const imagesForPrisma =
        data.images === null ? Prisma.JsonNull : data.images;

      const college = await prisma.college.update({
        where: { id: COLLEGE_ID, isDeleted: false }, // Ensure it's active
        data: {
          ...data,
          images: imagesForPrisma, // Use the prepared images value
        },
        include: {
          departments: true, // Include departments for response
        },
      });
      // Update cache with the new/updated college data
      collegeCache.set(COLLEGE_ID, college);
      return college;
    } catch (error: any) {
      console.error('Error in CollegeService.updatePrimaryCollege:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('College not found for update.', 404);
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new AppError('College with this name already exists.', 409);
      }
      throw new AppError('Failed to update college details.', 500);
    }
  }

  /**
   * Soft deletes the primary college by setting its isDeleted flag to true.
   * @returns The soft-deleted College object.
   * @throws AppError if the college is not found.
   *
   * IMPORTANT: Due to `onDelete: Restrict` in your schema, attempting to soft-delete a college
   * that has active dependent records (e.g., departments) will still succeed in marking `isDeleted: true`.
   * However, if you were to attempt a hard delete, Prisma would prevent it.
   * If business logic requires preventing soft-delete when active dependents exist,
   * you would add manual count checks here similar to your original academic year delete.
   * For now, we proceed with simple soft delete.
   */
  public async softDeletePrimaryCollege(): Promise<College> {
    try {
      // Clear cache before deletion
      collegeCache.clear();

      const college = await prisma.college.update({
        where: { id: COLLEGE_ID, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return college;
    } catch (error: any) {
      console.error('Error in CollegeService.softDeletePrimaryCollege:', error);
      if (error.code === 'P2025') {
        throw new AppError('College not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete college.', 500);
    }
  }

  /**
   * Performs a batch update on the primary college.
   * This method assumes the `updates` object contains the fields to be updated.
   * @param updates - An object containing the fields to update.
   * @returns The updated College object.
   * @throws AppError if the college is not found or update fails.
   */
  public async batchUpdatePrimaryCollege(
    updates: Partial<CollegeDataInput>
  ): Promise<College> {
    try {
      // Clear cache before update
      collegeCache.clear();

      // Prepare data for Prisma, explicitly handling 'images' null value if present
      const imagesForPrisma =
        updates.images === null ? Prisma.JsonNull : updates.images;

      // Use a transaction for atomicity if multiple related updates were involved,
      // but for a single college update, a direct update is fine.
      // Keeping $transaction as in original for consistency.
      const college = await prisma.$transaction(async (tx) => {
        const result = await tx.college.update({
          where: { id: COLLEGE_ID, isDeleted: false }, // Ensure it's active
          data: {
            ...updates,
            images: imagesForPrisma, // Use the prepared images value
          },
          include: {
            departments: {
              where: { isDeleted: false },
              include: {
                semesters: { where: { isDeleted: false } },
                Division: { where: { isDeleted: false } },
                subjects: { where: { isDeleted: false } },
                faculties: { where: { isDeleted: false } },
                students: { where: { isDeleted: false } },
              },
            },
          },
        });
        return result;
      });

      // Update cache with the new/updated college data
      collegeCache.set(COLLEGE_ID, college);
      return college;
    } catch (error: any) {
      console.error(
        'Error in CollegeService.batchUpdatePrimaryCollege:',
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('College not found for batch update.', 404);
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new AppError('College with this name already exists.', 409);
      }
      throw new AppError('Error in batch updating college.', 500);
    }
  }
}

export const collegeService = new CollegeService();
