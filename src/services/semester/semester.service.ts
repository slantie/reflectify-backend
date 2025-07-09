/**
 * @file src/services/semester/semester.service.ts
 * @description Service layer for Semester operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Semester, Prisma, SemesterTypeEnum } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

const semesterCache = new Map<string, Semester>();

interface SemesterDataInput {
  departmentId: string;
  semesterNumber: number;
  academicYearId: string;
  startDate?: string;
  endDate?: string;
  semesterType: SemesterTypeEnum;
}

class SemesterService {
  // Retrieves all active semesters, optionally filtered.
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
          { academicYear: { yearString: 'desc' } },
          { semesterNumber: 'asc' },
        ],
      });
      return semesters;
    } catch (error: any) {
      console.error('Error in SemesterService.getAllSemesters:', error);
      throw new AppError('Failed to retrieve semesters.', 500);
    }
  }

  // Creates a new semester.
  public async createSemester(data: SemesterDataInput): Promise<Semester> {
    const {
      departmentId,
      semesterNumber,
      academicYearId,
      startDate,
      endDate,
      semesterType,
    } = data;

    semesterCache.clear();

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId, isDeleted: false },
    });
    if (!existingAcademicYear) {
      throw new AppError('Academic Year not found or is deleted.', 400);
    }

    try {
      const semester = await prisma.semester.upsert({
        where: {
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
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
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

  // Retrieves a single active semester by its ID.
  public async getSemesterById(id: string): Promise<Semester | null> {
    let semester: Semester | null | undefined = semesterCache.get(id);
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
        semesterCache.set(id, semester);
      }
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.getSemesterById:', error);
      throw new AppError('Failed to retrieve semester.', 500);
    }
  }

  // Updates an existing semester.
  public async updateSemester(
    id: string,
    data: Partial<SemesterDataInput>
  ): Promise<Semester> {
    try {
      semesterCache.clear();

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
        where: { id: id, isDeleted: false },
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
      semesterCache.set(id, semester);
      return semester;
    } catch (error: any) {
      console.error('Error in SemesterService.updateSemester:', error);
      if (error.code === 'P2025') {
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

  // Soft deletes a semester.
  public async softDeleteSemester(id: string): Promise<Semester> {
    try {
      semesterCache.clear();

      const semester = await prisma.semester.update({
        where: { id: id, isDeleted: false },
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

  // Performs a batch creation of semesters.
  public async batchCreateSemesters(
    semestersData: SemesterDataInput[]
  ): Promise<Semester[]> {
    semesterCache.clear();

    const results: Semester[] = [];

    for (const sem of semestersData) {
      const existingDepartment = await prisma.department.findUnique({
        where: { id: sem.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${sem.departmentId}' not found or is deleted for semester '${sem.semesterNumber}'.`,
          400
        );
      }

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

  // Retrieves all active semesters for a specific department.
  public async getSemestersByDepartmentId(
    departmentId: string
  ): Promise<Semester[]> {
    try {
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
          academicYear: { isDeleted: false },
        },
        include: {
          academicYear: true,
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
