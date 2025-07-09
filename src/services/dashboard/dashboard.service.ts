/**
 * @file src/services/dashboard/dashboard.service.ts
 * @description Service layer for handling dashboard-related business logic,
 * including fetching aggregated statistics.
 */

import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

class DashboardService {
  /**
   * @description Fetches aggregated counts of various entities for the dashboard.
   * Only counts records that are not soft-deleted.
   * @returns {Promise<object>} An object containing counts of faculty, students,
   * departments, divisions, subjects, semesters, academic years, and student responses.
   * @throws {AppError} If there is a failure in fetching dashboard statistics.
   */
  public async getDashboardStats(): Promise<{
    responseCount: number;
    facultyCount: number;
    studentCount: number;
    departmentCount: number;
    divisionCount: number;
    subjectCount: number;
    semesterCount: number;
    academicYearCount: number;
    activeAcademicYear?: {
      id: string;
      yearString: string;
    };
  }> {
    try {
      // Use Promise.all to concurrently fetch counts for better performance.
      // Apply isDeleted: false to ensure only active records are counted.
      const [
        responseCount,
        facultyCount,
        studentCount,
        departmentCount,
        divisionCount,
        subjectCount,
        semesterCount,
        academicYearCount,
        activeAcademicYear,
      ] = await Promise.all([
        prisma.studentResponse.count({ where: { isDeleted: false } }),
        prisma.faculty.count({ where: { isDeleted: false } }),
        prisma.student.count({ where: { isDeleted: false } }),
        prisma.department.count({ where: { isDeleted: false } }),
        prisma.division.count({ where: { isDeleted: false } }),
        prisma.subject.count({ where: { isDeleted: false } }),
        prisma.semester.count({ where: { isDeleted: false } }),
        prisma.academicYear.count({ where: { isDeleted: false } }),
        prisma.academicYear.findFirst({
          where: { isActive: true, isDeleted: false },
          select: { id: true, yearString: true },
        }),
      ]);

      return {
        responseCount,
        facultyCount,
        studentCount,
        departmentCount,
        divisionCount,
        subjectCount,
        semesterCount,
        academicYearCount,
        activeAcademicYear: activeAcademicYear || undefined,
      };
    } catch (error: any) {
      console.error('Error in DashboardService.getDashboardStats:', error);
      throw new AppError(
        error.message || 'Failed to fetch dashboard statistics.',
        500
      );
    }
  }

  /**
   * @description Deletes all data from the database (for development only).
   * This should only be used in development environments.
   * @throws {AppError} If there is a failure in deleting database data.
   */
  public async deleteAllData(): Promise<void> {
    try {
      // Only allow this operation in development
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          'Database deletion is not allowed in production.',
          403
        );
      }

      // Delete data in the correct order to avoid foreign key constraint issues
      await prisma.$transaction(async (tx) => {
        // Delete leaf records first (no foreign key dependencies)
        await tx.studentResponse.deleteMany({});
        await tx.formAccess.deleteMany({});
        await tx.overrideStudent.deleteMany({});
        await tx.feedbackFormOverride.deleteMany({});
        await tx.feedbackQuestion.deleteMany({});

        // Delete feedback forms (depends on subject allocations)
        await tx.feedbackForm.deleteMany({});

        // Delete subject allocations (depends on faculty, subjects, etc.)
        await tx.subjectAllocation.deleteMany({});

        // Delete faculty and students
        await tx.faculty.deleteMany({});
        await tx.student.deleteMany({});

        // Delete subjects and question categories
        await tx.subject.deleteMany({});
        await tx.questionCategory.deleteMany({});

        // Delete organizational structure (divisions depend on semesters)
        await tx.division.deleteMany({});

        // Delete semester and academic year structure
        await tx.semester.deleteMany({});
        await tx.academicYear.deleteMany({});

        // Delete remaining organizational structure
        await tx.department.deleteMany({});
        await tx.college.deleteMany({});

        // Delete analytics and other support tables
        await tx.feedbackAnalytics.deleteMany({});
        await tx.oTP.deleteMany({});
      });
    } catch (error: any) {
      console.error('Error in DashboardService.deleteAllData:', error);
      throw new AppError(
        error.message || 'Failed to delete database data.',
        500
      );
    }
  }
}

export const dashboardService = new DashboardService();
