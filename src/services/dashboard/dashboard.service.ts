/**
 * @file src/services/dashboard/dashboard.service.ts
 * @description Service layer for handling dashboard-related business logic,
 * including fetching aggregated statistics.
 */

import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

class DashboardService {
  // Fetches aggregated counts of various entities for the dashboard.
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
        prisma.feedbackSnapshot.count(),
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

  // Deletes all data from the database (for development only).
  public async deleteAllData(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          'Database deletion is not allowed in production.',
          403
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.studentResponse.deleteMany({});
        await tx.formAccess.deleteMany({});
        await tx.overrideStudent.deleteMany({});
        await tx.feedbackFormOverride.deleteMany({});
        await tx.feedbackQuestion.deleteMany({});
        await tx.feedbackForm.deleteMany({});
        await tx.subjectAllocation.deleteMany({});
        await tx.faculty.deleteMany({});
        await tx.student.deleteMany({});
        await tx.subject.deleteMany({});
        await tx.questionCategory.deleteMany({});
        await tx.division.deleteMany({});
        await tx.semester.deleteMany({});
        await tx.academicYear.deleteMany({});
        await tx.department.deleteMany({});
        await tx.college.deleteMany({});
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
