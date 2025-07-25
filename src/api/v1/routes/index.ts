/**
 * @file src/api/v1/routes/index.ts
 * @description Aggregates all API v1 routes.
 * This file acts as the main router for /api/v1 endpoints.
 */

import { Router } from 'express';

import academicYearRoutes from './academicYear/academicYear.routes';
import authRoutes from './auth/auth.routes';
import collegeRoutes from './college/college.routes';
import departmentRoutes from './department/department.routes';
import divisionRoutes from './division/division.routes';
import semesterRoutes from './semester/semester.routes';
import facultyRoutes from './faculty/faculty.routes';
import studentRoutes from './student/student.routes';
import subjectRoutes from './subject/subject.routes';
import subjectAllocationRoutes from './subjectAllocation/subjectAllocation.routes';
import feedbackQuestionRoutes from './feedbackQuestion/feedbackQuestion.routes';
import feedbackFormRoutes from './feedbackForm/feedbackForm.routes';
import studentResponseRoutes from './studentResponse/studentResponse.routes';
import databaseRoutes from './common/database.routes';
import uploadRoutes from './upload/upload.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import academicStructureRoutes from './common/academicStructure.routes';
import analyticsRoutes from './analytics/analytics.routes';
import emailRoutes from './email/email.routes';
import contactRoutes from './contact/contact.routes';

const router = Router();

// Mount feature-specific routers
router.use('/auth', authRoutes);
router.use('/academic-years', academicYearRoutes);
router.use('/colleges', collegeRoutes);
router.use('/departments', departmentRoutes);
router.use('/divisions', divisionRoutes);
router.use('/semesters', semesterRoutes);
router.use('/faculties', facultyRoutes);
router.use('/students', studentRoutes);
router.use('/subjects', subjectRoutes);
router.use('/subject-allocations', subjectAllocationRoutes);
router.use('/feedback-questions', feedbackQuestionRoutes);
router.use('/feedback-forms', feedbackFormRoutes);
router.use('/student-responses', studentResponseRoutes);
router.use('/database', databaseRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/academic-structure', academicStructureRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/emails', emailRoutes);
router.use('/contact', contactRoutes);

export default router;
