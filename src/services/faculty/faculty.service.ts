/**
 * @file src/services/faculty/faculty.service.ts
 * @description Service layer for Faculty operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Faculty, Prisma, Designation } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

const facultyCache = new Map<string, Faculty>();

interface FacultyDataInput {
  name: string;
  abbreviation?: string;
  email: string;
  designation: Designation;
  seatingLocation: string;
  image?: string | null;
  joiningDate?: string;
  departmentId: string;
}

class FacultyService {
  // Retrieves all active faculties.
  public async getAllFaculties(): Promise<Faculty[]> {
    try {
      const faculties = await prisma.faculty.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false },
        },
        include: {
          department: true,
          mentoredDivisions: { where: { isDeleted: false } },
          allocations: { where: { isDeleted: false } },
        },
      });
      return faculties;
    } catch (error: any) {
      console.error('Error in FacultyService.getAllFaculties:', error);
      throw new AppError('Failed to retrieve faculties.', 500);
    }
  }

  // Creates a new faculty or updates an existing one based on email.
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

    facultyCache.clear();

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    const finalAbbreviation =
      abbreviation ||
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    const finalJoiningDate = joiningDate ? new Date(joiningDate) : new Date();

    try {
      const faculty = await prisma.faculty.upsert({
        where: { email: email },
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
          name: name,
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

      facultyCache.set(email, faculty);
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.createFaculty:', error);
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new AppError('Faculty with this email already exists.', 409);
      }
      throw new AppError('Failed to create faculty.', 500);
    }
  }

  // Retrieves a single active faculty by its ID.
  public async getFacultyById(id: string): Promise<Faculty | null> {
    let faculty: Faculty | null | undefined = facultyCache.get(id);
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
        facultyCache.set(id, faculty);
      }
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.getFacultyById:', error);
      throw new AppError('Failed to retrieve faculty.', 500);
    }
  }

  // Updates an existing faculty.
  public async updateFaculty(
    id: string,
    data: Partial<FacultyDataInput>
  ): Promise<Faculty> {
    try {
      facultyCache.clear();

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
        where: { id: id, isDeleted: false },
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
      facultyCache.set(id, faculty);
      return faculty;
    } catch (error: any) {
      console.error('Error in FacultyService.updateFaculty:', error);
      if (error.code === 'P2025') {
        throw new AppError('Faculty not found for update.', 404);
      }
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new AppError('Faculty with this email already exists.', 409);
      }
      throw new AppError('Failed to update faculty.', 500);
    }
  }

  // Soft deletes a faculty.
  public async softDeleteFaculty(id: string): Promise<Faculty> {
    try {
      facultyCache.clear();

      const faculty = await prisma.faculty.update({
        where: { id: id, isDeleted: false },
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

  // Performs a batch creation of faculties.
  public async batchCreateFaculties(
    facultiesData: FacultyDataInput[]
  ): Promise<Faculty[]> {
    facultyCache.clear();

    const results: Faculty[] = [];

    for (const fac of facultiesData) {
      const existingDepartment = await prisma.department.findUnique({
        where: { id: fac.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${fac.departmentId}' not found or is deleted for faculty '${fac.name}'.`,
          400
        );
      }

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

  // Retrieves faculty abbreviations, optionally filtered by department abbreviation.
  public async getFacultyAbbreviations(deptAbbr?: string): Promise<string[]> {
    try {
      const departmentFilter: Prisma.DepartmentWhereInput = {
        isDeleted: false,
        college: { isDeleted: false, id: 'LDRP-ITR' },
      };

      if (deptAbbr) {
        departmentFilter.abbreviation = deptAbbr.trim().toUpperCase();
      }

      const faculties = await prisma.faculty.findMany({
        where: {
          isDeleted: false,
          department: departmentFilter,
        },
        select: { abbreviation: true },
      });

      if (!faculties.length && deptAbbr) {
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
        return [];
      }

      const abbreviations = faculties
        .map((f) => f.abbreviation)
        .filter((abbr): abbr is string => abbr !== null && abbr !== undefined);
      return abbreviations;
    } catch (error: any) {
      console.error('Error in FacultyService.getFacultyAbbreviations:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve faculty abbreviations.', 500);
    }
  }
}

export const facultyService = new FacultyService();
