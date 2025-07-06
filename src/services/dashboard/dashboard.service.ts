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
   * departments, divisions, subjects, semesters, and student responses.
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
      ] = await Promise.all([
        prisma.studentResponse.count({ where: { isDeleted: false } }),
        prisma.faculty.count({ where: { isDeleted: false } }),
        prisma.student.count({ where: { isDeleted: false } }),
        prisma.department.count({ where: { isDeleted: false } }),
        prisma.division.count({ where: { isDeleted: false } }),
        prisma.subject.count({ where: { isDeleted: false } }),
        prisma.semester.count({ where: { isDeleted: false } }),
      ]);

      return {
        responseCount,
        facultyCount,
        studentCount,
        departmentCount,
        divisionCount,
        subjectCount,
        semesterCount,
      };
    } catch (error: any) {
      console.error('Error in DashboardService.getDashboardStats:', error);
      throw new AppError(
        error.message || 'Failed to fetch dashboard statistics.',
        500
      );
    }
  }
}

export const dashboardService = new DashboardService();
