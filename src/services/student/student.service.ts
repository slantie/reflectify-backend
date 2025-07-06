/**
 * @file src/services/student/student.service.ts
 * @description Service layer for Student operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Student } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Simple in-memory cache for student data
// Keyed by enrollmentNumber or ID
const studentCache = new Map<string, Student>();

// Interface for student data input
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
  /**
   * Retrieves all active students.
   * Includes related department, semester, and division.
   * Only returns students that are not soft-deleted and belong to non-soft-deleted parents.
   * @returns An array of Student objects.
   */
  public async getAllStudents(): Promise<Student[]> {
    try {
      const students = await prisma.student.findMany({
        where: {
          isDeleted: false,
          department: { isDeleted: false },
          semester: { isDeleted: false },
          division: { isDeleted: false },
          academicYear: { isDeleted: false }, // Ensure academic year is also active
        },
        include: {
          department: {
            include: {
              college: true, // Include college within department
            },
          },
          semester: true,
          division: true,
          academicYear: true, // Include academic year
          responses: { where: { isDeleted: false } }, // Include active responses
        },
      });
      return students;
    } catch (error: any) {
      console.error('Error in StudentService.getAllStudents:', error);
      throw new AppError('Failed to retrieve students.', 500);
    }
  }

  /**
   * Creates a new student or updates an existing one based on enrollment number.
   * Validates existence and active status of parent department, semester, division, and academic year.
   * @param data - The data for the new student.
   * @returns The created or updated Student object.
   * @throws AppError if parent entities not found or if enrollment number/email already exists.
   */
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

    // Clear cache on any write operation
    studentCache.clear();

    // 1. Validate Academic Year existence and active status
    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId, isDeleted: false },
    });
    if (!existingAcademicYear) {
      throw new AppError('Academic Year not found or is deleted.', 400);
    }

    // 2. Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    // 3. Validate Semester existence and active status
    const existingSemester = await prisma.semester.findUnique({
      where: { id: semesterId, isDeleted: false },
    });
    if (!existingSemester) {
      throw new AppError('Semester not found or is deleted.', 400);
    }

    // 4. Validate Division existence and active status
    const existingDivision = await prisma.division.findUnique({
      where: { id: divisionId, isDeleted: false },
    });
    if (!existingDivision) {
      throw new AppError('Division not found or is deleted.', 400);
    }

    try {
      const student = await prisma.student.upsert({
        where: { enrollmentNumber: enrollmentNumber }, // Unique field for upsert
        create: {
          name,
          enrollmentNumber,
          email,
          phoneNumber,
          academicYear: { connect: { id: academicYearId } }, // Connect to AcademicYear by ID
          batch,
          department: { connect: { id: departmentId } }, // Connect to Department by ID
          semester: { connect: { id: semesterId } },
          division: { connect: { id: divisionId } },
          image,
        },
        update: {
          // When updating, explicitly define fields. Do NOT spread the entire 'data' object
          // if it contains foreign key IDs that are also handled by 'connect'.
          name: data.name,
          enrollmentNumber: data.enrollmentNumber,
          email: data.email,
          phoneNumber: data.phoneNumber,
          batch: data.batch,
          image: data.image,
          // Conditionally connect relations if their IDs are provided in the update data
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

      studentCache.set(enrollmentNumber, student); // Cache by enrollment number
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.createStudent:', error);
      if (error.code === 'P2002') {
        // Unique constraint violation (enrollmentNumber or email)
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

  /**
   * Retrieves a single active student by their ID.
   * Includes related department (with college), semester, division, academic year, and responses.
   * @param id - The ID of the student to retrieve.
   * @returns The Student object, or null if not found.
   */
  public async getStudentById(id: string): Promise<Student | null> {
    // Try to get from cache first
    let student: Student | null | undefined = studentCache.get(id); // Assuming cache key is ID for this method
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
        studentCache.set(id, student); // Cache the result by ID
      }
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.getStudentById:', error);
      throw new AppError('Failed to retrieve student.', 500);
    }
  }

  /**
   * Updates an existing student.
   * Validates existence and active status of parent entities if their IDs are provided.
   * @param id - The ID of the student to update.
   * @param data - The partial data to update the student with.
   * @returns The updated Student object.
   * @throws AppError if the student is not found or update fails.
   */
  public async updateStudent(
    id: string,
    data: Partial<StudentDataInput>
  ): Promise<Student> {
    try {
      // Clear cache on any write operation
      studentCache.clear();

      // Validate parent entity existence if their IDs are provided in update data
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

      // Destructure the data to separate direct foreign key IDs from other update fields
      const {
        academicYearId,
        departmentId,
        semesterId,
        divisionId,
        ...restOfData
      } = data;

      const student = await prisma.student.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: {
          ...restOfData, // Spread the rest of the update data
          // Conditionally connect relations if their IDs are provided
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
      studentCache.set(id, student); // Update cache by ID
      return student;
    } catch (error: any) {
      console.error('Error in StudentService.updateStudent:', error);
      if (error.code === 'P2025') {
        // Prisma error for record not found for update
        throw new AppError('Student not found for update.', 404);
      }
      if (error.code === 'P2002') {
        // Unique constraint violation (enrollmentNumber or email)
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

  /**
   * Soft deletes a student by setting its isDeleted flag to true.
   * @param id - The ID of the student to soft delete.
   * @returns The soft-deleted Student object.
   * @throws AppError if the student is not found.
   */
  public async softDeleteStudent(id: string): Promise<Student> {
    try {
      // Clear cache before deletion
      studentCache.clear();

      const student = await prisma.student.update({
        where: { id: id, isDeleted: false }, // Ensure it's not already soft-deleted
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

  /**
   * Performs a batch creation of students.
   * Validates existence and active status of parent entities for each student.
   * @param studentsData - An array of student data objects.
   * @returns An array of created or updated Student objects.
   * @throws AppError if any student creation/update fails due to invalid parent IDs or unique constraints.
   */
  public async batchCreateStudents(
    studentsData: StudentDataInput[]
  ): Promise<Student[]> {
    // Clear cache before batch operation
    studentCache.clear();

    const results: Student[] = [];

    for (const std of studentsData) {
      // Validate Academic Year existence and active status
      const existingAcademicYear = await prisma.academicYear.findUnique({
        where: { id: std.academicYearId, isDeleted: false },
      });
      if (!existingAcademicYear) {
        throw new AppError(
          `Academic Year with ID '${std.academicYearId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      // Validate Department existence and active status
      const existingDepartment = await prisma.department.findUnique({
        where: { id: std.departmentId, isDeleted: false },
      });
      if (!existingDepartment) {
        throw new AppError(
          `Department with ID '${std.departmentId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      // Validate Semester existence and active status
      const existingSemester = await prisma.semester.findUnique({
        where: { id: std.semesterId, isDeleted: false },
      });
      if (!existingSemester) {
        throw new AppError(
          `Semester with ID '${std.semesterId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      // Validate Division existence and active status
      const existingDivision = await prisma.division.findUnique({
        where: { id: std.divisionId, isDeleted: false },
      });
      if (!existingDivision) {
        throw new AppError(
          `Division with ID '${std.divisionId}' not found or is deleted for student '${std.name}'.`,
          400
        );
      }

      // Destructure the data to separate direct foreign key IDs from other update fields
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
            // When updating, explicitly define fields. Do NOT spread the entire 'std' object
            // if it contains foreign key IDs that are also handled by 'connect'.
            ...restOfStdData, // Spread the rest of the update data
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
          // Unique constraint violation (enrollmentNumber or email)
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
