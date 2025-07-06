// src/services/studentResponse/studentResponse.service.ts

import { StudentResponse } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

// Define a type for the incoming responses object
type ResponsesInput = {
  [questionId: string]: any; // questionId (UUID) maps to any value
};

class StudentResponseService {
  /**
   * @dev Submits student responses for a given feedback form via an access token.
   * This involves creating StudentResponse records and denormalized FeedbackSnapshot records,
   * and marking the FormAccess as submitted.
   * @param token The access token for the form.
   * @param responses An object containing question IDs and their corresponding response values.
   * @returns Promise<StudentResponse[]> An array of the created student response records.
   * @throws AppError if the token is invalid, form is deleted, already submitted, or missing essential data.
   */
  public async submitResponses(
    token: string,
    responses: ResponsesInput
  ): Promise<StudentResponse[]> {
    // 1. Enrich Initial formAccess Fetch:
    // Include all necessary related data to minimize subsequent database queries.
    const formAccess = await prisma.formAccess.findUnique({
      where: { accessToken: token },
      include: {
        form: {
          include: {
            subjectAllocation: {
              include: {
                faculty: true, // Include faculty details for the allocation
                subject: true, // Include subject details for the allocation
              },
            },
          },
        },
        student: {
          include: {
            academicYear: true, // Include academic year details for the student
            semester: true, // Include semester details for the student
            division: true, // Include division details for the student
          },
        },
      },
    });

    if (!formAccess) {
      throw new AppError('Invalid access token.', 404);
    }

    // Check if the form itself is soft-deleted before proceeding
    if (formAccess.form?.isDeleted) {
      throw new AppError('Form not found or is deleted.', 404);
    }

    // Check if the form is active (status)
    if (formAccess.form?.status !== 'ACTIVE') {
      throw new AppError('Form is not currently active for submission.', 403);
    }

    // Check if the form has passed its end date
    if (formAccess.form?.endDate && new Date() > formAccess.form.endDate) {
      throw new AppError('Form submission period has ended.', 403);
    }

    if (formAccess.isSubmitted) {
      throw new AppError(
        'Feedback already submitted for this access token.',
        400
      );
    }

    // Ensure all required related data is available for snapshot creation
    if (
      !formAccess.student ||
      !formAccess.student.academicYear ||
      !formAccess.student.semester ||
      !formAccess.student.division ||
      !formAccess.form ||
      !formAccess.form.subjectAllocation ||
      !formAccess.form.subjectAllocation.faculty ||
      !formAccess.form.subjectAllocation.subject
    ) {
      console.error(
        'Missing essential related data for feedback snapshot:',
        JSON.stringify(formAccess, null, 2) // Log the full formAccess for debugging
      );
      throw new AppError(
        'Internal server error: Missing essential form or student data for snapshot creation.',
        500
      );
    }

    // 2. Batch Fetch Questions:
    // Get all unique question IDs from the incoming responses.
    const questionIds = Object.keys(responses);

    // Fetch all relevant FeedbackQuestion records and their relations in one go.
    // Ensure only non-deleted questions are considered for submission.
    const questionsWithDetails = await prisma.feedbackQuestion.findMany({
      where: {
        id: {
          in: questionIds,
        },
        formId: formAccess.form.id, // Ensure questions belong to this form
        isDeleted: false, // Only consider non-soft-deleted questions
      },
      include: {
        category: true, // Include question category
        faculty: true, // Include faculty associated with the question
        subject: true, // Include subject associated with the question
      },
    });

    // Create a map for quick lookup of question details by ID.
    const questionsMap = new Map(questionsWithDetails.map((q) => [q.id, q]));

    // Use a Prisma transaction to ensure atomicity for all operations.
    const createdResponses = await prisma.$transaction(async (tx) => {
      const newStudentResponses: StudentResponse[] = [];

      // Iterate over each question/response pair from the request body.
      for (const [questionId, value] of Object.entries(responses)) {
        const question = questionsMap.get(questionId);

        // If a question is not found (e.g., invalid questionId in request) or is soft-deleted, skip it.
        // It's already filtered by formId and isDeleted in the findMany query above.
        if (!question) {
          console.warn(
            `Question with ID ${questionId} not found in the associated form or is deleted. Skipping response and snapshot creation for this question.`
          );
          continue; // Skip to the next question
        }

        // Create the original StudentResponse record.
        const studentResponse = await tx.studentResponse.create({
          data: {
            studentId: formAccess.studentId,
            formId: formAccess.formId,
            questionId: question.id,
            value: JSON.stringify(value), // Store response value as JSON string
            isDeleted: false, // Explicitly set to false for new responses
            submittedAt: new Date(), // Capture submission timestamp
          },
        });

        // Create the denormalized FeedbackSnapshot record.
        await tx.feedbackSnapshot.create({
          data: {
            originalStudentResponseId: studentResponse.id, // Link to the original response
            // Student Information
            studentId: formAccess.student.id,
            studentEnrollmentNumber: formAccess.student.enrollmentNumber,
            studentName: formAccess.student.name,
            studentEmail: formAccess.student.email,
            // Form Information
            formId: formAccess.form.id,
            formName: formAccess.form.title,
            // Question Information
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            questionCategoryText: question.category.categoryName,
            // Faculty Information (from FeedbackQuestion's relation)
            facultyId: question.faculty.id,
            facultyName: question.faculty.name,
            facultyEmail: question.faculty.email,
            // Subject Information (from FeedbackQuestion's relation)
            subjectId: question.subject.id,
            subjectName: question.subject.name,
            subjectCode: question.subject.subjectCode,
            // Academic Context (from Student's relations)
            academicYearId: formAccess.student.academicYear.id,
            academicYearString: formAccess.student.academicYear.yearString,
            semesterNumber: formAccess.student.semester.semesterNumber,
            divisionName: formAccess.student.division.divisionName,
            batch: question.batch, // Using batch from FeedbackQuestion
            // Response Data
            responseValue: JSON.stringify(value), // Store the actual response value
            submittedAt: studentResponse.submittedAt, // Use the timestamp from the created StudentResponse
            formDeleted: formAccess.form.isDeleted, // Reflect form's soft-delete status at submission time
            // Removed 'questionDeleted' as it's not in the FeedbackSnapshot model
            // questionDeleted: question.isDeleted,
          },
        });

        newStudentResponses.push(studentResponse);
      }

      // Update the formAccess status to submitted.
      await tx.formAccess.update({
        where: { id: formAccess.id },
        data: { isSubmitted: true },
      });

      return newStudentResponses;
    });

    return createdResponses;
  }

  /**
   * @dev Checks the submission status of a feedback form via an access token.
   * @param token The access token for the form.
   * @returns Promise<{ isSubmitted: boolean }> The submission status.
   * @throws AppError if the token is invalid or the form is deleted.
   */
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

    // Check if the form itself is soft-deleted
    if (formAccess.form?.isDeleted) {
      throw new AppError('Form not found or is deleted.', 404);
    }

    // The primary source of truth for submission status is formAccess.isSubmitted.
    return { isSubmitted: formAccess.isSubmitted };
  }
}

export const studentResponseService = new StudentResponseService();
