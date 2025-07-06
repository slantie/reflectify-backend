// src/services/subject/subject.service.ts

import { Subject, SubjectType, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

// Interface for subject data input
interface SubjectDataInput {
  name: string;
  abbreviation: string;
  subjectCode: string;
  type: SubjectType;
  departmentId: string;
  semesterId: string;
}

class SubjectService {
  /**
   * @dev Retrieves all active subjects.
   * Includes related department and semester, ensuring they are also active.
   * @returns Promise<Subject[]> A list of active subject records.
   */
  public async getAllSubjects(): Promise<Subject[]> {
    try {
      const subjects = await prisma.subject.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false }, // Ensure department is active
          semester: { isDeleted: false }, // Ensure semester is active
        },
        include: {
          department: true,
          semester: true,
          allocations: { where: { isDeleted: false } }, // Include active allocations
        },
      });
      return subjects;
    } catch (error: any) {
      console.error('Error in SubjectService.getAllSubjects:', error);
      throw new AppError('Failed to retrieve subjects.', 500);
    }
  }

  /**
   * @dev Retrieves a single active subject by its ID.
   * Includes related department, semester, and feedback questions, ensuring they are active.
   * @param id The UUID of the subject to retrieve.
   * @returns Promise<Subject | null> The subject record, or null if not found or deleted.
   */
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
          FeedbackQuestion: { where: { isDeleted: false } }, // Include active feedback questions
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

  /**
   * @dev Creates a new subject record.
   * Validates existence and active status of parent department and semester.
   * @param data The data for the subject to create.
   * @returns Promise<Subject> The created subject record.
   * @throws AppError if related entities (Department, Semester) are not found or are deleted,
   * or if there's a unique constraint violation.
   */
  public async createSubject(data: SubjectDataInput): Promise<Subject> {
    const { name, abbreviation, subjectCode, type, departmentId, semesterId } =
      data;

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
        // Unique constraint violation (departmentId_abbreviation)
        throw new AppError(
          `A subject with abbreviation '${abbreviation}' already exists for this department.`,
          409
        );
      }
      throw new AppError('Failed to create subject.', 500);
    }
  }

  /**
   * @dev Updates an existing subject record.
   * Validates existence and active status of parent entities if their IDs are provided in update data.
   * @param id The UUID of the subject to update.
   * @param data The partial data to update the subject with.
   * @returns Promise<Subject> The updated subject record.
   * @throws AppError if the subject is not found or update fails.
   */
  public async updateSubject(
    id: string,
    data: Partial<SubjectDataInput & { isDeleted?: boolean }>
  ): Promise<Subject> {
    try {
      // First, check if the subject exists and is not deleted
      const existingSubject = await prisma.subject.findUnique({
        where: { id: id, isDeleted: false },
      });

      if (!existingSubject) {
        throw new AppError('Subject not found or is deleted.', 404);
      }

      // Validate parent entity existence if their IDs are provided in update data
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

      // Destructure the data to separate direct foreign key IDs from other update fields
      const { departmentId, semesterId, ...restOfData } = data;

      const updatedSubject = await prisma.subject.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: {
          ...restOfData, // Spread the rest of the update data
          // Conditionally connect relations if their IDs are provided
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

  /**
   * @dev Soft deletes a subject by setting its isDeleted flag to true.
   * @param id The UUID of the subject to soft delete.
   * @returns Promise<Subject> The soft-deleted subject record.
   * @throws AppError if the subject is not found.
   */
  public async softDeleteSubject(id: string): Promise<Subject> {
    try {
      const subject = await prisma.subject.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
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

  /**
   * @dev Retrieves subjects by semester ID, filtering out soft-deleted records.
   * Ensures the semester itself is active.
   * @param semesterId The UUID of the semester.
   * @returns Promise<Subject[]> A list of active subjects for the given semester.
   * @throws AppError if the semester is not found or is deleted.
   */
  public async getSubjectsBySemester(semesterId: string): Promise<Subject[]> {
    try {
      // Validate Semester exists and is not deleted
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
          isDeleted: false, // Apply soft deletion filter
          department: { isDeleted: false }, // Ensure related department is active
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

  /**
   * @dev Retrieves subject abbreviations, optionally filtered by department abbreviation.
   * Filters out soft-deleted records and ensures related department is active.
   * @param deptAbbr Optional department abbreviation to filter subjects.
   * @returns Promise<string[]> An array of unique subject abbreviations.
   * @throws AppError if the department is not found or is deleted.
   */
  public async getSubjectAbbreviations(deptAbbr?: string): Promise<string[]> {
    try {
      let whereClause: Prisma.SubjectWhereInput = { isDeleted: false }; // Base filter for soft deletion

      if (deptAbbr) {
        // Find the department by abbreviation and ensure it's not deleted
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

      // Ensure abbreviations are unique and return them
      const abbreviations = Array.from(
        new Set(subjects.map((s) => s.abbreviation))
      );
      return abbreviations;
    } catch (error: any) {
      console.error('Error in SubjectService.getSubjectAbbreviations:', error);
      throw new AppError('Failed to retrieve subject abbreviations.', 500);
    }
  }

  /**
   * @dev Creates multiple subject records in a single transaction.
   * Validates existence and active status of parent entities for each subject.
   * @param subjectsData An array of subject data objects to create.
   * @returns Promise<Subject[]> An array of the created subject records.
   * @throws AppError if any subject creation/update fails due to invalid parent IDs or unique constraints.
   */
  public async batchCreateSubjects(
    subjectsData: SubjectDataInput[]
  ): Promise<Subject[]> {
    const results: Subject[] = [];

    // Pre-validate all department and semester IDs to avoid partial transactions
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
            // Using upsert as per original logic
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
              isDeleted: false, // Ensure it's active if upserting an existing one
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
      results.push(...transactionResults); // Collect results from transaction
      return results;
    } catch (error: any) {
      console.error('Error in SubjectService.batchCreateSubjects:', error);
      if (error.code === 'P2002') {
        throw new AppError(
          `A subject with a duplicate abbreviation for its department exists in the batch.`,
          409
        );
      }
      // P2025: Not found error for related records (though pre-validated, good to have fallback for other issues)
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
