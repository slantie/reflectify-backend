// src/services/common/database.service.ts

import { prisma } from './prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

class DatabaseService {
  /**
   * @dev Cleans all database tables by deleting records in the correct dependency order
   * to avoid foreign key constraint issues.
   * @returns Promise<void>
   * @throws AppError if the database cleaning process fails.
   */
  public async cleanDatabase(): Promise<void> {
    try {
      // Delete in order of dependencies (from child to parent)
      // This order is crucial to prevent foreign key constraint errors.
      // If your schema changes, this order might need adjustment.
      await prisma.$transaction([
        // Dependent on multiple entities (form, question, student)
        prisma.studentResponse.deleteMany(),
        // Dependent on form, category, faculty, subject
        prisma.feedbackQuestion.deleteMany(),
        // Dependent on division, subjectAllocation
        prisma.feedbackForm.deleteMany(),
        // Dependent on form, studentResponse
        prisma.feedbackAnalytics.deleteMany(),
        // Dependent on faculty, subject, division, semester, department, academicYear
        prisma.subjectAllocation.deleteMany(),
        // Dependent on department, semester, division, academicYear
        prisma.student.deleteMany(),
        // Dependent on department
        prisma.faculty.deleteMany(),
        // Dependent on department, semester
        prisma.subject.deleteMany(),
        // Dependent on department, semester
        prisma.division.deleteMany(),
        // Dependent on department, academicYear
        prisma.semester.deleteMany(),
        // Dependent on college
        prisma.department.deleteMany(),
        // Independent (top-level)
        prisma.college.deleteMany(),
        prisma.analyticsView.deleteMany(), // Independent or dependent on analytics data
        prisma.customReport.deleteMany(), // Independent or dependent on other data
        prisma.questionCategory.deleteMany(), // Independent or dependent on question
        prisma.academicYear.deleteMany(), // Independent
        prisma.formAccess.deleteMany(), // Dependent on form, student
      ]);

      console.log('🗑️ Database cleaned successfully');
    } catch (error: any) {
      console.error('Error in DatabaseService.cleanDatabase:', error);
      throw new AppError('Failed to clean database.', 500);
    }
  }
}

export const databaseService = new DatabaseService();
