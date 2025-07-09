/**
 * @file src/services/studentResponse/studentResponse.service.ts
 * @description Service layer for Student Response operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages student feedback submissions.
 */

import { StudentResponse } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

type ResponsesInput = {
  [questionId: string]: any;
};

class StudentResponseService {
  // Submits student responses for a given feedback form via an access token.
  public async submitResponses(
    token: string,
    responses: ResponsesInput
  ): Promise<StudentResponse[]> {
    const formAccess = await prisma.formAccess.findUnique({
      where: { accessToken: token },
      include: {
        form: {
          include: {
            subjectAllocation: {
              include: {
                faculty: true,
                subject: true,
              },
            },
          },
        },
        student: {
          include: {
            academicYear: true,
            semester: {
              include: {
                department: true,
              },
            },
            division: true,
          },
        },
        OverrideStudent: true,
      },
    });

    if (!formAccess) {
      throw new AppError('Invalid access token.', 404);
    }

    if (formAccess.form?.isDeleted) {
      throw new AppError('Form not found or is deleted.', 404);
    }

    if (formAccess.form?.status !== 'ACTIVE') {
      throw new AppError('Form is not currently active for submission.', 403);
    }

    if (formAccess.form?.endDate && new Date() > formAccess.form.endDate) {
      throw new AppError('Form submission period has ended.', 403);
    }

    if (formAccess.isSubmitted) {
      throw new AppError(
        'Feedback already submitted for this access token.',
        400
      );
    }

    const isOverrideStudent = !!formAccess.OverrideStudent;
    const isRegularStudent = !!formAccess.student;

    if (
      !formAccess.form ||
      !formAccess.form.subjectAllocation ||
      !formAccess.form.subjectAllocation.faculty ||
      !formAccess.form.subjectAllocation.subject
    ) {
      console.error(
        'Missing essential form data for feedback snapshot:',
        JSON.stringify(formAccess, null, 2)
      );
      throw new AppError(
        'Internal server error: Missing essential form data for snapshot creation.',
        500
      );
    }

    if (
      isRegularStudent &&
      (!formAccess.student ||
        !formAccess.student.academicYear ||
        !formAccess.student.semester ||
        !formAccess.student.division)
    ) {
      console.error(
        'Missing essential student data for feedback snapshot:',
        JSON.stringify(formAccess, null, 2)
      );
      throw new AppError(
        'Internal server error: Missing essential student data for snapshot creation.',
        500
      );
    }

    if (isOverrideStudent && !formAccess.OverrideStudent) {
      console.error(
        'Missing override student data for feedback snapshot:',
        JSON.stringify(formAccess, null, 2)
      );
      throw new AppError(
        'Internal server error: Missing override student data for snapshot creation.',
        500
      );
    }

    if (!isRegularStudent && !isOverrideStudent) {
      console.error(
        'No student data found (neither regular nor override):',
        JSON.stringify(formAccess, null, 2)
      );
      throw new AppError(
        'Internal server error: No student data found for snapshot creation.',
        500
      );
    }

    const questionIds = Object.keys(responses);

    const questionsWithDetails = await prisma.feedbackQuestion.findMany({
      where: {
        id: {
          in: questionIds,
        },
        formId: formAccess.form.id,
        isDeleted: false,
      },
      include: {
        category: true,
        faculty: true,
        subject: true,
      },
    });

    const questionsMap = new Map(questionsWithDetails.map((q) => [q.id, q]));

    const createdResponses = await prisma.$transaction(async (tx) => {
      const newStudentResponses: StudentResponse[] = [];

      for (const [questionId, value] of Object.entries(responses)) {
        const question = questionsMap.get(questionId);

        if (!question) {
          console.warn(
            `Question with ID ${questionId} not found in the associated form or is deleted. Skipping response and snapshot creation for this question.`
          );
          continue;
        }

        const studentResponse = await tx.studentResponse.create({
          data: {
            studentId: formAccess.studentId,
            overrideStudentId: formAccess.overrideStudentId,
            feedbackFormId: formAccess.form.id,
            questionId: question.id,
            responseValue: JSON.stringify(value),
            isDeleted: false,
            submittedAt: new Date(),
          },
        });

        let studentData;
        let academicData;

        if (isRegularStudent && formAccess.student) {
          studentData = {
            studentId: formAccess.student.id,
            studentEnrollmentNumber: formAccess.student.enrollmentNumber,
            studentName: formAccess.student.name,
            studentEmail: formAccess.student.email,
            overrideStudentId: null,
            isOverrideStudent: false,
          };

          academicData = {
            academicYearId: formAccess.student.academicYear.id,
            academicYearString: formAccess.student.academicYear.yearString,
            academicYearIsDeleted: formAccess.student.academicYear.isDeleted,
            departmentId: formAccess.student.semester.departmentId,
            departmentName: formAccess.student.semester.department?.name || '',
            departmentAbbreviation:
              formAccess.student.semester.department?.abbreviation || '',
            departmentIsDeleted:
              formAccess.student.semester.department?.isDeleted || false,
            semesterId: formAccess.student.semester.id,
            semesterNumber: formAccess.student.semester.semesterNumber,
            semesterIsDeleted: formAccess.student.semester.isDeleted,
            divisionId: formAccess.student.division.id,
            divisionName: formAccess.student.division.divisionName,
            divisionIsDeleted: formAccess.student.division.isDeleted,
          };
        } else if (isOverrideStudent && formAccess.OverrideStudent) {
          studentData = {
            studentId: null,
            studentEnrollmentNumber:
              formAccess.OverrideStudent.enrollmentNumber || '',
            studentName: formAccess.OverrideStudent.name,
            studentEmail: formAccess.OverrideStudent.email,
            overrideStudentId: formAccess.OverrideStudent.id,
            isOverrideStudent: true,
          };

          const formDivision = await tx.division.findUnique({
            where: { id: formAccess.form.subjectAllocation.divisionId },
            include: {
              semester: {
                include: {
                  department: true,
                  academicYear: true,
                },
              },
            },
          });

          academicData = {
            academicYearId: formDivision?.semester.academicYear.id || '',
            academicYearString:
              formDivision?.semester.academicYear.yearString || '',
            academicYearIsDeleted:
              formDivision?.semester.academicYear.isDeleted || false,
            departmentId: formDivision?.semester.departmentId || '',
            departmentName:
              formDivision?.semester.department?.name ||
              formAccess.OverrideStudent.department ||
              '',
            departmentAbbreviation:
              formDivision?.semester.department?.abbreviation || '',
            departmentIsDeleted:
              formDivision?.semester.department?.isDeleted || false,
            semesterId: formDivision?.semester.id || '',
            semesterNumber:
              formDivision?.semester.semesterNumber ||
              parseInt(formAccess.OverrideStudent.semester || '0'),
            semesterIsDeleted: formDivision?.semester.isDeleted || false,
            divisionId: formDivision?.id || '',
            divisionName: formDivision?.divisionName || '',
            divisionIsDeleted: formDivision?.isDeleted || false,
          };
        } else {
          throw new AppError(
            'Unable to determine student type for snapshot creation.',
            500
          );
        }

        await tx.feedbackSnapshot.create({
          data: {
            originalStudentResponseId: studentResponse.id,
            ...studentData,
            formId: formAccess.form.id,
            formName: formAccess.form.title,
            formStatus: formAccess.form.status,
            formIsDeleted: formAccess.form.isDeleted,
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            questionCategoryId: question.category.id,
            questionCategoryName: question.category.categoryName,
            questionBatch: question.batch,
            questionIsDeleted: question.isDeleted,
            facultyId: question.faculty.id,
            facultyName: question.faculty.name,
            facultyEmail: question.faculty.email,
            facultyAbbreviation: question.faculty.abbreviation || '',
            subjectId: question.subject.id,
            subjectName: question.subject.name,
            subjectAbbreviation: question.subject.abbreviation,
            subjectCode: question.subject.subjectCode,
            subjectIsDeleted: question.subject.isDeleted,
            ...academicData,
            responseValue: JSON.stringify(value),
            batch: question.batch,
            submittedAt: studentResponse.submittedAt,
            isDeleted: false,
          },
        });

        newStudentResponses.push(studentResponse);
      }

      await tx.formAccess.update({
        where: { id: formAccess.id },
        data: { isSubmitted: true },
      });

      return newStudentResponses;
    });

    return createdResponses;
  }

  // Checks the submission status of a feedback form via an access token.
  public async checkSubmission(
    token: string
  ): Promise<{ isSubmitted: boolean }> {
    const formAccess = await prisma.formAccess.findUnique({
      where: { accessToken: token },
      include: {
        form: true,
        student: true,
      },
    });

    if (!formAccess) {
      throw new AppError('Invalid access token.', 404);
    }

    if (formAccess.form?.isDeleted) {
      throw new AppError('Form not found or is deleted.', 404);
    }

    return { isSubmitted: formAccess.isSubmitted };
  }
}

export const studentResponseService = new StudentResponseService();
