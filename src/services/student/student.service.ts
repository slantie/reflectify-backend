/**
 * @file src/services/student/student.service.ts
 * @description Service layer for Student operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Student } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

const studentCache = new Map<string, Student>();

interface StudentDataInput {
  name: string;
  enrollmentNumber: string;
  email: string;
  phoneNumber: string;
  academicYearId: string;
  batch: string;
  departmentId: string;
  semesterId: string;
  divisionId: string;
  image?: string | null;
}

class StudentService {
  // Retrieves all active students.
  public async getAllStudents(): Promise<Student[]> {
    try {
      const students = await prisma.student.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
          division: { isDeleted: false },
          academicYear: { isDeleted: false },
        },
        include: {
          department: {
            include: {
              college: true,
            },
          },
          semester: true,
          division: true,
          academicYear: true,
          responses: { where: { isDeleted: false } },
        },
      });
      return students;
    } catch (error: any) {
      console.error('Error in StudentService.getAllStudents:', error);
      throw new AppError('Failed to retrieve students.', 500);
    }
  }

  // Creates a new student or updates an existing one based on enrollment number.
  public async createStudent(data: StudentDataInput): Promise<Student> {
    const {
      name,
      enrollmentNumber,
      email,
      phoneNumber,
      academicYearId,
      batch,
      departmentId,
      semesterId,
      divisionId,
      image,
    } = data;

    studentCache.clear();

    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId, isDeleted: false },
    });
    if (!existingAcademicYear) {
      throw new AppError('Academic Year not found or is deleted.', 400);
    }

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

    const existingDivision = await prisma.division.findUnique({
      where: { id: divisionId, isDeleted: false },
    });
    if (!existingDivision) {
      throw new AppError('Division not found or is deleted.', 400);
    }

    try {
      const student = await prisma.student.upsert({
        where: { enrollmentNumber: enrollmentNumber },
        create: {
          name,
          enrollmentNumber,
          email,
          phoneNumber,
          academicYear: { connect: { id: academicYearId } },
          batch,
          department: { connect: { id: departmentId } },
          semester: { connect: { id: semesterId } },
          division: { connect: { id: divisionId } },
          image,
        },
        update: {
          name: data.name,
          enrollmentNumber: data.enrollmentNumber,
          email: data.email,
          phoneNumber: data.phoneNumber,
          batch: data.batch,
          image: data.image,
          academicYear: data.academicYearId
            ? { connect: { id: data.academicYearId } }
            : undefined,
          department: data.departmentId
            ? { connect: { id: data.departmentId } }
            : undefined,
          semester: data.semesterId
            ? { connect: { id: data.semesterId } }
            : undefined,
          division: data.divisionId
            ? { connect: { id: data.divisionId } }
            : undefined,
        },
        include: {
          department: {
            include: {
              college: true,
            },
          },
          semester: true,
          division: true,
          academicYear: true,
        },
      });

      studentCache.set(enrollmentNumber, student);
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.createStudent:', error);
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('enrollmentNumber')) {
          throw new AppError(
            'Student with this enrollment number already exists.',
            409
          );
        }
        if (error.meta?.target?.includes('email')) {
          throw new AppError('Student with this email already exists.', 409);
        }
      }
      throw new AppError('Failed to create student.', 500);
    }
  }

  // Retrieves a single active student by their ID.
  public async getStudentById(id: string): Promise<Student | null> {
    let student: Student | null | undefined = studentCache.get(id);
    if (student) {
      return student;
    }

    try {
      student = await prisma.student.findUnique({
        where: {
          id: id,
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
          division: { isDeleted: false },
          academicYear: { isDeleted: false },
        },
        include: {
          department: {
            include: {
              college: true,
            },
          },
          semester: true,
          division: true,
          academicYear: true,
          responses: { where: { isDeleted: false } },
        },
      });

      if (student) {
        studentCache.set(id, student);
      }
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.getStudentById:', error);
      throw new AppError('Failed to retrieve student.', 500);
    }
  }

  // Updates an existing student.
  public async updateStudent(
    id: string,
    data: Partial<StudentDataInput>
  ): Promise<Student> {
    try {
      studentCache.clear();

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
      if (data.divisionId) {
        const existingDivision = await prisma.division.findUnique({
          where: { id: data.divisionId, isDeleted: false },
        });
        if (!existingDivision) {
          throw new AppError(
            'Provided division ID does not exist or is deleted.',
            400
          );
        }
      }

      const {
        academicYearId,
        departmentId,
        semesterId,
        divisionId,
        ...restOfData
      } = data;

      const student = await prisma.student.update({
        where: { id: id, isDeleted: false },
        data: {
          ...restOfData,
          academicYear: academicYearId
            ? { connect: { id: academicYearId } }
            : undefined,
          department: departmentId
            ? { connect: { id: departmentId } }
            : undefined,
          semester: semesterId ? { connect: { id: semesterId } } : undefined,
          division: divisionId ? { connect: { id: divisionId } } : undefined,
        },
        include: {
          department: {
            include: {
              college: true,
            },
          },
          semester: true,
          division: true,
          academicYear: true,
        },
      });
      studentCache.set(id, student);
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.updateStudent:', error);
      if (error.code === 'P2025') {
        throw new AppError('Student not found for update.', 404);
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('enrollmentNumber')) {
          throw new AppError(
            'Student with this enrollment number already exists.',
            409
          );
        }
        if (error.meta?.target?.includes('email')) {
          throw new AppError('Student with this email already exists.', 409);
        }
      }
      throw new AppError('Failed to update student.', 500);
    }
  }

  // Soft deletes a student.
  public async softDeleteStudent(id: string): Promise<Student> {
    try {
      studentCache.clear();

      const student = await prisma.student.update({
        where: { id: id, isDeleted: false },
        data: { isDeleted: true },
      });
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.softDeleteStudent:', error);
      if (error.code === 'P2025') {
        throw new AppError('Student not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete student.', 500);
    }
  }

  // Performs a batch creation of students.
  public async batchCreateStudents(
    studentsData: StudentDataInput[]
  ): Promise<Student[]> {
    studentCache.clear();

    const results: Student[] = [];

    for (const std of studentsData) {
      const existingAcademicYear = await prisma.academicYear.findUnique({
        where: { id: std.academicYearId, isDeleted: false },
      });
      if (!existingAcademicYear) {
        throw new AppError(
          `Academic Year with ID '${std.academicYearId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      const existingDepartment = await prisma.department.findUnique({
        where: { id: std.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${std.departmentId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      const existingSemester = await prisma.semester.findUnique({
        where: { id: std.semesterId, isDeleted: false },
      });
      if (!existingSemester) {
        throw new AppError(
          `Semester with ID '${std.semesterId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      const existingDivision = await prisma.division.findUnique({
        where: { id: std.divisionId, isDeleted: false },
      });
      if (!existingDivision) {
        throw new AppError(
          `Division with ID '${std.divisionId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      const {
        academicYearId,
        departmentId,
        semesterId,
        divisionId,
        ...restOfStdData
      } = std;

      try {
        const student = await prisma.student.upsert({
          where: { enrollmentNumber: std.enrollmentNumber },
          create: {
            name: std.name,
            enrollmentNumber: std.enrollmentNumber,
            email: std.email,
            phoneNumber: std.phoneNumber,
            academicYear: { connect: { id: std.academicYearId } },
            batch: std.batch,
            department: { connect: { id: std.departmentId } },
            semester: { connect: { id: std.semesterId } },
            division: { connect: { id: std.divisionId } },
            image: std.image,
          },
          update: {
            ...restOfStdData,
            academicYear: academicYearId
              ? { connect: { id: academicYearId } }
              : undefined,
            department: departmentId
              ? { connect: { id: departmentId } }
              : undefined,
            semester: semesterId ? { connect: { id: semesterId } } : undefined,
            division: divisionId ? { connect: { id: divisionId } } : undefined,
          },
          include: {
            department: {
              include: {
                college: true,
              },
            },
            semester: true,
            division: true,
            academicYear: true,
          },
        });
        results.push(student);
      } catch (error: any) {
        console.error(`Error in batch creating student '${std.name}':`, error);
        if (error.code === 'P2002') {
          if (error.meta?.target?.includes('enrollmentNumber')) {
            throw new AppError(
              `Student with enrollment number '${std.enrollmentNumber}' already exists.`,
              409
            );
          }
          if (error.meta?.target?.includes('email')) {
            throw new AppError(
              `Student with email '${std.email}' already exists.`,
              409
            );
          }
        }
        throw new AppError(
          `Failed to batch create student '${std.name}'.`,
          500
        );
      }
    }
    return results;
  }
}

export const studentService = new StudentService();
