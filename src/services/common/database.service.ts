/**
 * @file src/services/common/database.service.ts
 * @description Service layer for cleaning database operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { prisma } from './prisma.service';
import AppError from '../../utils/appError';

class DatabaseService {
  // Cleans all database tables except the Admin table.
  public async cleanDatabase(): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.studentResponse.deleteMany(),
        prisma.formAccess.deleteMany(),
        prisma.feedbackQuestion.deleteMany(),
        prisma.feedbackForm.deleteMany(),
        prisma.feedbackAnalytics.deleteMany(),
        prisma.subjectAllocation.deleteMany(),
        prisma.student.deleteMany(),
        prisma.promotionHistory.deleteMany(),
        prisma.faculty.deleteMany(),
        prisma.subject.deleteMany(),
        prisma.division.deleteMany(),
        prisma.semester.deleteMany(),
        prisma.department.deleteMany(),
        prisma.college.deleteMany(),
        prisma.analyticsView.deleteMany(),
        prisma.customReport.deleteMany(),
        prisma.questionCategory.deleteMany(),
        prisma.academicYear.deleteMany(),
        prisma.oTP.deleteMany(),
        prisma.feedbackSnapshot.deleteMany(),
        // prisma.admin.deleteMany(),
      ]);

      console.log('🗑️ Database cleaned successfully (Admins preserved)');
    } catch (error: any) {
      console.error('Error in DatabaseService.cleanDatabase:', error);
      throw new AppError('Failed to clean database.', 500);
    }
  }
}

export const databaseService = new DatabaseService();
