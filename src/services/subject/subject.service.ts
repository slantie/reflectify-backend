/**
 * @file src/services/subject/subject.service.ts
 * @description Service layer for Subject operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Subject, SubjectType, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

interface SubjectDataInput {
  name: string;
  abbreviation: string;
  subjectCode: string;
  type: SubjectType;
  departmentId: string;
  semesterId: string;
}

class SubjectService {
  // Retrieves all active subjects.
  public async getAllSubjects(): Promise<Subject[]> {
    try {
      const subjects = await prisma.subject.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
        },
        include: {
          department: true,
          semester: true,
          allocations: { where: { isDeleted: false } },
        },
      });
      return subjects;
    } catch (error: any) {
      console.error('Error in SubjectService.getAllSubjects:', error);
      throw new AppError('Failed to retrieve subjects.', 500);
    }
  }

  // Retrieves a single active subject by its ID.
  public async getSubjectById(id: string): Promise<Subject | null> {
    try {
      const subject = await prisma.subject.findUnique({
        where: {
          id: id,
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
        },
        include: {
          department: true,
          semester: true,
          allocations: { where: { isDeleted: false } },
          FeedbackQuestion: { where: { isDeleted: false } },
        },
      });
      return subject;
    } catch (error: any) {
      console.error(
        `Error in SubjectService.getSubjectById for ID ${id}:`,
        error
      );
      throw new AppError('Failed to retrieve subject.', 500);
    }
  }

  // Creates a new subject record.
  public async createSubject(data: SubjectDataInput): Promise<Subject> {
    const { name, abbreviation, subjectCode, type, departmentId, semesterId } =
      data;

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
      const subject = await prisma.subject.create({
        data: {
          name,
          abbreviation,
          subjectCode,
          type,
          department: { connect: { id: departmentId } },
          semester: { connect: { id: semesterId } },
        },
        include: {
          department: true,
          semester: true,
          allocations: true,
        },
      });
      return subject;
    } catch (error: any) {
      console.error('Error in SubjectService.createSubject:', error);
      if (error.code === 'P2002') {
        throw new AppError(
          `A subject with abbreviation '${abbreviation}' already exists for this department.`,
          409
        );
      }
      throw new AppError('Failed to create subject.', 500);
    }
  }

  // Updates an existing subject record.
  public async updateSubject(
    id: string,
    data: Partial<SubjectDataInput & { isDeleted?: boolean }>
  ): Promise<Subject> {
    try {
      const existingSubject = await prisma.subject.findUnique({
        where: { id: id, isDeleted: false },
      });

      if (!existingSubject) {
        throw new AppError('Subject not found or is deleted.', 404);
      }

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

      const { departmentId, semesterId, ...restOfData } = data;

      const updatedSubject = await prisma.subject.update({
        where: { id: id, isDeleted: false },
        data: {
          ...restOfData,
          department: departmentId
            ? { connect: { id: departmentId } }
            : undefined,
          semester: semesterId ? { connect: { id: semesterId } } : undefined,
        },
        include: {
          department: true,
          semester: true,
          allocations: true,
        },
      });
      return updatedSubject;
    } catch (error: any) {
      console.error(
        `Error in SubjectService.updateSubject for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Subject not found for update.', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError(
          `A subject with this ${error.meta?.target} already exists.`,
          409
        );
      }
      throw new AppError('Failed to update subject.', 500);
    }
  }

  // Soft deletes a subject.
  public async softDeleteSubject(id: string): Promise<Subject> {
    try {
      const subject = await prisma.subject.update({
        where: { id: id, isDeleted: false },
        data: { isDeleted: true },
      });
      return subject;
    } catch (error: any) {
      console.error(
        `Error in SubjectService.softDeleteSubject for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Subject not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete subject.', 500);
    }
  }

  // Retrieves subjects by semester ID.
  public async getSubjectsBySemester(semesterId: string): Promise<Subject[]> {
    try {
      const semester = await prisma.semester.findUnique({
        where: { id: semesterId, isDeleted: false },
      });
      if (!semester) {
        throw new AppError(
          `Semester with ID '${semesterId}' not found or is deleted.`,
          404
        );
      }

      const subjects = await prisma.subject.findMany({
        where: {
          semesterId: semesterId,
          isDeleted: false,
          department: { isDeleted: false },
        },
        include: {
          department: true,
          semester: true,
          allocations: { where: { isDeleted: false } },
        },
      });
      return subjects;
    } catch (error: any) {
      console.error(
        `Error in SubjectService.getSubjectsBySemester for semester ID ${semesterId}:`,
        error
      );
      throw new AppError('Failed to retrieve subjects by semester.', 500);
    }
  }

  // Retrieves subject abbreviations, optionally filtered by department abbreviation.
  public async getSubjectAbbreviations(deptAbbr?: string): Promise<string[]> {
    try {
      let whereClause: Prisma.SubjectWhereInput = { isDeleted: false };

      if (deptAbbr) {
        const department = await prisma.department.findFirst({
          where: { abbreviation: deptAbbr.toUpperCase(), isDeleted: false },
        });

        if (!department) {
          throw new AppError(
            `Department '${deptAbbr}' not found or is deleted.`,
            404
          );
        }
        whereClause = { ...whereClause, departmentId: department.id };
      }

      const subjects = await prisma.subject.findMany({
        where: whereClause,
        select: { abbreviation: true },
      });

      const abbreviations = Array.from(
        new Set(subjects.map((s) => s.abbreviation))
      );
      return abbreviations;
    } catch (error: any) {
      console.error('Error in SubjectService.getSubjectAbbreviations:', error);
      throw new AppError('Failed to retrieve subject abbreviations.', 500);
    }
  }

  // Creates multiple subject records in a single transaction.
  public async batchCreateSubjects(
    subjectsData: SubjectDataInput[]
  ): Promise<Subject[]> {
    const results: Subject[] = [];

    const departmentIds = Array.from(
      new Set(subjectsData.map((s) => s.departmentId))
    );
    const semesterIds = Array.from(
      new Set(subjectsData.map((s) => s.semesterId))
    );

    const existingDepartments = await prisma.department.findMany({
      where: { id: { in: departmentIds }, isDeleted: false },
      select: { id: true },
    });
    const foundDepartmentIds = new Set(existingDepartments.map((d) => d.id));

    const existingSemesters = await prisma.semester.findMany({
      where: { id: { in: semesterIds }, isDeleted: false },
      select: { id: true },
    });
    const foundSemesterIds = new Set(existingSemesters.map((s) => s.id));

    for (const subData of subjectsData) {
      if (!foundDepartmentIds.has(subData.departmentId)) {
        throw new AppError(
          `Department with ID '${subData.departmentId}' not found or is deleted for subject '${subData.name}'.`,
          400
        );
      }
      if (!foundSemesterIds.has(subData.semesterId)) {
        throw new AppError(
          `Semester with ID '${subData.semesterId}' not found or is deleted for subject '${subData.name}'.`,
          400
        );
      }
    }

    try {
      const transactionResults = await prisma.$transaction(
        subjectsData.map((subjectData) => {
          return prisma.subject.upsert({
            where: {
              departmentId_abbreviation: {
                departmentId: subjectData.departmentId,
                abbreviation: subjectData.abbreviation,
              },
            },
            create: {
              name: subjectData.name,
              abbreviation: subjectData.abbreviation,
              subjectCode: subjectData.subjectCode,
              type: subjectData.type,
              department: { connect: { id: subjectData.departmentId } },
              semester: { connect: { id: subjectData.semesterId } },
            },
            update: {
              isDeleted: false,
              name: subjectData.name,
              subjectCode: subjectData.subjectCode,
              type: subjectData.type,
              department: { connect: { id: subjectData.departmentId } },
              semester: { connect: { id: subjectData.semesterId } },
            },
            include: {
              department: true,
              semester: true,
              allocations: true,
            },
          });
        })
      );
      results.push(...transactionResults);
      return results;
    } catch (error: any) {
      console.error('Error in SubjectService.batchCreateSubjects:', error);
      if (error.code === 'P2002') {
        throw new AppError(
          `A subject with a duplicate abbreviation for its department exists in the batch.`,
          409
        );
      }
      if (error.code === 'P2025') {
        throw new AppError(
          `One or more related records (Department, Semester) not found for a subject in the batch.`,
          404
        );
      }
      throw new AppError('Failed to batch create subjects.', 500);
    }
  }
}

export const subjectService = new SubjectService();
