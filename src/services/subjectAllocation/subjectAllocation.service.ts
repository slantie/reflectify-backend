// src/services/subjectAllocation/subjectAllocation.service.ts

import { SubjectAllocation, LectureType, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

// Interface for subject allocation data input
interface SubjectAllocationDataInput {
  facultyId: string;
  subjectId: string;
  divisionId: string;
  semesterId: string;
  departmentId: string;
  lectureType: LectureType;
  academicYear: string; // This is the yearString, e.g., "2023-2024"
  batch?: string;
}

class SubjectAllocationService {
  /**
   * @dev Retrieves all active subject allocations.
   * Includes related faculty, subject, division, semester, department, and academic year,
   * ensuring all related entities are also active.
   * @returns Promise<SubjectAllocation[]> A list of active subject allocation records.
   */
  public async getAllSubjectAllocations(): Promise<SubjectAllocation[]> {
    try {
      const subjectAllocations = await prisma.subjectAllocation.findMany({
        where: {
          isDeleted: false,
          faculty: { isDeleted: false },
          subject: { isDeleted: false },
          division: { isDeleted: false },
          semester: { isDeleted: false },
          department: { isDeleted: false },
          academicYear: { isDeleted: false },
        },
        include: {
          faculty: true,
          subject: true,
          division: true,
          semester: true,
          department: true,
          academicYear: true,
        },
      });
      return subjectAllocations;
    } catch (error: any) {
      console.error(
        'Error in SubjectAllocationService.getAllSubjectAllocations:',
        error
      );
      throw new AppError('Failed to retrieve subject allocations.', 500);
    }
  }

  /**
   * @dev Retrieves a single active subject allocation by its ID.
   * Includes related entities, ensuring they are active.
   * @param id The UUID of the subject allocation to retrieve.
   * @returns Promise<SubjectAllocation | null> The subject allocation record, or null if not found or deleted.
   */
  public async getSubjectAllocationById(
    id: string
  ): Promise<SubjectAllocation | null> {
    try {
      const subjectAllocation = await prisma.subjectAllocation.findUnique({
        where: {
          id: id,
          isDeleted: false,
          faculty: { isDeleted: false },
          subject: { isDeleted: false },
          division: { isDeleted: false },
          semester: { isDeleted: false },
          department: { isDeleted: false },
          academicYear: { isDeleted: false },
        },
        include: {
          faculty: true,
          subject: true,
          division: true,
          semester: true,
          department: true,
          academicYear: true,
          feedbackForms: { where: { isDeleted: false } }, // Include active feedback forms
          analytics: { where: { isDeleted: false } }, // Include active analytics
        },
      });
      return subjectAllocation;
    } catch (error: any) {
      console.error(
        `Error in SubjectAllocationService.getSubjectAllocationById for ID ${id}:`,
        error
      );
      throw new AppError('Failed to retrieve subject allocation.', 500);
    }
  }

  /**
   * @dev Creates a new subject allocation record.
   * Validates existence and active status of all related parent entities.
   * Resolves academicYear string to its ID.
   * @param data The data for the subject allocation to create.
   * @returns Promise<SubjectAllocation> The created subject allocation record.
   * @throws AppError if related entities are not found or are deleted,
   * or if there's a unique constraint violation.
   */
  public async createSubjectAllocation(
    data: SubjectAllocationDataInput
  ): Promise<SubjectAllocation> {
    const {
      facultyId,
      subjectId,
      divisionId,
      semesterId,
      departmentId,
      lectureType,
      academicYear,
      batch,
    } = data;

    // 1. Validate Faculty existence and active status
    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId, isDeleted: false },
    });
    if (!existingFaculty) {
      throw new AppError('Faculty not found or is deleted.', 400);
    }

    // 2. Validate Subject existence and active status
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId, isDeleted: false },
    });
    if (!existingSubject) {
      throw new AppError('Subject not found or is deleted.', 400);
    }

    // 3. Validate Division existence and active status
    const existingDivision = await prisma.division.findUnique({
      where: { id: divisionId, isDeleted: false },
    });
    if (!existingDivision) {
      throw new AppError('Division not found or is deleted.', 400);
    }

    // 4. Validate Semester existence and active status
    const existingSemester = await prisma.semester.findUnique({
      where: { id: semesterId, isDeleted: false },
    });
    if (!existingSemester) {
      throw new AppError('Semester not found or is deleted.', 400);
    }

    // 5. Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    // 6. Find AcademicYear by academicYear string
    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { yearString: academicYear, isDeleted: false },
    });
    if (!existingAcademicYear) {
      throw new AppError(
        `Academic Year '${academicYear}' not found or is deleted.`,
        400
      );
    }

    try {
      const subjectAllocation = await prisma.subjectAllocation.create({
        data: {
          faculty: { connect: { id: facultyId } },
          subject: { connect: { id: subjectId } },
          division: { connect: { id: divisionId } },
          semester: { connect: { id: semesterId } },
          department: { connect: { id: departmentId } },
          lectureType,
          academicYear: { connect: { id: existingAcademicYear.id } }, // Connect using the found ID
          batch,
        },
        include: {
          faculty: true,
          subject: true,
          division: true,
          semester: true,
          department: true,
          academicYear: true,
        },
      });
      return subjectAllocation;
    } catch (error: any) {
      console.error(
        'Error in SubjectAllocationService.createSubjectAllocation:',
        error
      );
      if (error.code === 'P2002') {
        // Unique constraint violation (facultyId, subjectId, divisionId, semesterId, lectureType, batch, academicYearId)
        throw new AppError(
          'A subject allocation with these details already exists.',
          409
        );
      }
      throw new AppError('Failed to create subject allocation.', 500);
    }
  }

  /**
   * @dev Updates an existing subject allocation record.
   * Validates existence and active status of parent entities if their IDs are provided in update data.
   * @param id The UUID of the subject allocation to update.
   * @param data The partial data to update the subject allocation with.
   * @returns Promise<SubjectAllocation> The updated subject allocation record.
   * @throws AppError if the subject allocation is not found or update fails.
   */
  public async updateSubjectAllocation(
    id: string,
    data: Partial<SubjectAllocationDataInput & { isDeleted?: boolean }>
  ): Promise<SubjectAllocation> {
    try {
      // First, check if the subject allocation exists and is not deleted
      const existingAllocation = await prisma.subjectAllocation.findUnique({
        where: { id: id, isDeleted: false },
      });

      if (!existingAllocation) {
        throw new AppError('Subject allocation not found or is deleted.', 404);
      }

      // Destructure data to separate relation IDs (which need 'connect') from direct update fields
      const {
        facultyId,
        subjectId,
        divisionId,
        semesterId,
        departmentId,
        academicYear, // This is the string for lookup
        ...restOfData // This will contain lectureType, batch, isDeleted, etc.
      } = data;

      const dataToUpdate: Prisma.SubjectAllocationUpdateInput = {
        ...restOfData, // Spread direct update fields
      };

      // Handle related entity updates by connecting to their IDs
      if (facultyId) {
        const faculty = await prisma.faculty.findUnique({
          where: { id: facultyId, isDeleted: false },
        });
        if (!faculty)
          throw new AppError(
            'Provided faculty ID does not exist or is deleted.',
            400
          );
        dataToUpdate.faculty = { connect: { id: facultyId } };
      }
      if (subjectId) {
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId, isDeleted: false },
        });
        if (!subject)
          throw new AppError(
            'Provided subject ID does not exist or is deleted.',
            400
          );
        dataToUpdate.subject = { connect: { id: subjectId } };
      }
      if (divisionId) {
        const division = await prisma.division.findUnique({
          where: { id: divisionId, isDeleted: false },
        });
        if (!division)
          throw new AppError(
            'Provided division ID does not exist or is deleted.',
            400
          );
        dataToUpdate.division = { connect: { id: divisionId } };
      }
      if (semesterId) {
        const semester = await prisma.semester.findUnique({
          where: { id: semesterId, isDeleted: false },
        });
        if (!semester)
          throw new AppError(
            'Provided semester ID does not exist or is deleted.',
            400
          );
        dataToUpdate.semester = { connect: { id: semesterId } };
      }
      if (departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: departmentId, isDeleted: false },
        });
        if (!department)
          throw new AppError(
            'Provided department ID does not exist or is deleted.',
            400
          );
        dataToUpdate.department = { connect: { id: departmentId } };
      }
      if (academicYear) {
        // This is the yearString
        const academicYearRecord = await prisma.academicYear.findUnique({
          where: { yearString: academicYear, isDeleted: false },
        });
        if (!academicYearRecord)
          throw new AppError(
            `Academic Year '${academicYear}' not found or is deleted.`,
            400
          );
        dataToUpdate.academicYear = { connect: { id: academicYearRecord.id } };
      }

      const updatedAllocation = await prisma.subjectAllocation.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: dataToUpdate,
        include: {
          faculty: true,
          subject: true,
          division: true,
          semester: true,
          department: true,
          academicYear: true,
        },
      });
      return updatedAllocation;
    } catch (error: any) {
      console.error(
        `Error in SubjectAllocationService.updateSubjectAllocation for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Subject allocation not found for update.', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError(
          'A subject allocation with these details already exists.',
          409
        );
      }
      throw new AppError('Failed to update subject allocation.', 500);
    }
  }

  /**
   * @dev Soft deletes a subject allocation by setting its isDeleted flag to true.
   * @param id The UUID of the subject allocation to soft delete.
   * @returns Promise<SubjectAllocation> The soft-deleted subject allocation record.
   * @throws AppError if the subject allocation is not found.
   */
  public async softDeleteSubjectAllocation(
    id: string
  ): Promise<SubjectAllocation> {
    try {
      const subjectAllocation = await prisma.subjectAllocation.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
        data: { isDeleted: true },
      });
      return subjectAllocation;
    } catch (error: any) {
      console.error(
        `Error in SubjectAllocationService.softDeleteSubjectAllocation for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Subject allocation not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete subject allocation.', 500);
    }
  }
}

export const subjectAllocationService = new SubjectAllocationService();
