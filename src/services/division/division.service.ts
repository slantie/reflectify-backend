/**
 * @file src/services/division/division.service.ts
 * @description Service layer for Division operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Division, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

const divisionCache = new Map<string, Division>();

interface DivisionDataInput {
  departmentId: string;
  semesterId: string;
  divisionName: string;
  studentCount?: number;
}

class DivisionService {
  // Retrieves all active divisions, optionally filtered by departmentId and semesterId.
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
            where: { isDeleted: false },
          },
          mentors: { where: { isDeleted: false } },
          subjectAllocations: { where: { isDeleted: false } },
          feedbackForms: { where: { isDeleted: false } },
        },
      });

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

  // Creates a new division.
  public async createDivision(data: DivisionDataInput): Promise<Division> {
    const { departmentId, semesterId, divisionName } = data;

    divisionCache.clear();

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

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
          studentCount: data.studentCount || 0,
        },
        update: {},
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

  // Retrieves a single active division by its ID.
  public async getDivisionById(id: string): Promise<Division | null> {
    let division: Division | null | undefined = divisionCache.get(id);
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
        divisionCache.set(id, division);
      }
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.getDivisionById:', error);
      throw new AppError('Failed to retrieve division.', 500);
    }
  }

  // Updates an existing division.
  public async updateDivision(
    id: string,
    data: Partial<DivisionDataInput>
  ): Promise<Division> {
    try {
      divisionCache.clear();

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
        where: { id: id, isDeleted: false },
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
      divisionCache.set(id, division);
      return division;
    } catch (error: any) {
      console.error('Error in DivisionService.updateDivision:', error);
      if (error.code === 'P2025') {
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

  // Soft deletes a division.
  public async softDeleteDivision(id: string): Promise<Division> {
    try {
      divisionCache.clear();

      const division = await prisma.division.update({
        where: { id: id, isDeleted: false },
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

  // Performs a batch creation of divisions.
  public async batchCreateDivisions(
    divisionsData: DivisionDataInput[]
  ): Promise<Division[]> {
    divisionCache.clear();

    const results: Division[] = [];

    for (const div of divisionsData) {
      const existingDepartment = await prisma.department.findUnique({
        where: { id: div.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${div.departmentId}' not found or is deleted for division '${div.divisionName}'.`,
          400
        );
      }

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
          update: {},
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
