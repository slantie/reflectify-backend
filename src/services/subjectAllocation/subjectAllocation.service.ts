/**
 * @file src/services/subjectAllocation/subjectAllocation.service.ts
 * @description Service layer for Subject Allocation operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages subject allocations.
 */

import { SubjectAllocation, LectureType, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

interface SubjectAllocationDataInput {
  facultyId: string;
  subjectId: string;
  divisionId: string;
  semesterId: string;
  departmentId: string;
  lectureType: LectureType;
  academicYear: string;
  batch?: string;
}

class SubjectAllocationService {
  // Retrieves all active subject allocations.
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

  // Retrieves a single active subject allocation by its ID.
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
          feedbackForms: { where: { isDeleted: false } },
          analytics: { where: { isDeleted: false } },
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

  // Creates a new subject allocation record.
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

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId, isDeleted: false },
    });
    if (!existingFaculty) {
      throw new AppError('Faculty not found or is deleted.', 400);
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId, isDeleted: false },
    });
    if (!existingSubject) {
      throw new AppError('Subject not found or is deleted.', 400);
    }

    const existingDivision = await prisma.division.findUnique({
      where: { id: divisionId, isDeleted: false },
    });
    if (!existingDivision) {
      throw new AppError('Division not found or is deleted.', 400);
    }

    const existingSemester = await prisma.semester.findUnique({
      where: { id: semesterId, isDeleted: false },
    });
    if (!existingSemester) {
      throw new AppError('Semester not found or is deleted.', 400);
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

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
          academicYear: { connect: { id: existingAcademicYear.id } },
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
        throw new AppError(
          'A subject allocation with these details already exists.',
          409
        );
      }
      throw new AppError('Failed to create subject allocation.', 500);
    }
  }

  // Updates an existing subject allocation record.
  public async updateSubjectAllocation(
    id: string,
    data: Partial<SubjectAllocationDataInput & { isDeleted?: boolean }>
  ): Promise<SubjectAllocation> {
    try {
      const existingAllocation = await prisma.subjectAllocation.findUnique({
        where: { id: id, isDeleted: false },
      });

      if (!existingAllocation) {
        throw new AppError('Subject allocation not found or is deleted.', 404);
      }

      const {
        facultyId,
        subjectId,
        divisionId,
        semesterId,
        departmentId,
        academicYear,
        ...restOfData
      } = data;

      const dataToUpdate: Prisma.SubjectAllocationUpdateInput = {
        ...restOfData,
      };

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
        where: { id: id, isDeleted: false },
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

  // Soft deletes a subject allocation.
  public async softDeleteSubjectAllocation(
    id: string
  ): Promise<SubjectAllocation> {
    try {
      const subjectAllocation = await prisma.subjectAllocation.update({
        where: { id: id, isDeleted: false },
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
