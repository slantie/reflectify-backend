// src/services/feedbackForm/feedbackForm.service.ts

import {
  FeedbackForm,
  SubjectAllocation,
  Division,
  FormStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { emailService } from '../email/email.service';

// Interfaces for input data
interface SemesterSelection {
  id: string;
  divisions: string[];
}

interface FormGenerationRequest {
  departmentId: string;
  selectedSemesters: SemesterSelection[];
}

interface AddQuestionToFormInput {
  categoryId: string;
  facultyId: string;
  subjectId: string;
  batch?: string;
  text: string;
  type: string;
  isRequired?: boolean;
  displayOrder: number;
}

interface UpdateFormInput {
  title?: string;
  status?: FormStatus;
  startDate?: string; // ISO 8601 string
  endDate?: string; // ISO 8601 string
  isDeleted?: boolean;
}

interface UpdateFormStatusInput {
  status: FormStatus;
  startDate?: string;
  endDate?: string;
}

interface BulkUpdateFormStatusInput {
  formIds: string[];
  status: FormStatus;
  startDate?: string;
  endDate?: string;
}

class FeedbackFormService {
  /**
   * @dev Ensures essential question categories exist in the database.
   * This is called during form generation to guarantee category IDs are valid.
   * @private
   */
  private async ensureQuestionCategories(): Promise<void> {
    const categories = [
      {
        id: 'lecture-feedback',
        categoryName: 'Lecture Feedback',
        description: 'Feedback for theory lectures',
      },
      {
        id: 'lab-feedback',
        categoryName: 'Laboratory Feedback',
        description: 'Feedback for laboratory sessions',
      },
    ];

    for (const category of categories) {
      await prisma.questionCategory.upsert({
        where: { id: category.id },
        update: {},
        create: { ...category, isDeleted: false }, // Ensure isDeleted is false on creation
      });
    }
  }

  /**
   * @dev Generates a dynamic title for a feedback form based on division.
   * @param division The division object (expected to have a 'divisionName' property).
   * @returns string The generated form title.
   * @private
   */
  private generateFormTitle(division: Division): string {
    // Corrected: Using 'divisionName' as per Prisma's Division model
    return `Student Feedback Form - ${division.divisionName}`;
  }

  /**
   * @dev Generates a random alphanumeric hash for form access.
   * @returns string The generated hash.
   * @private
   */
  private generateHash(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * @dev Generates feedback questions based on subject allocations.
   * @param allocations An array of subject allocation objects.
   * @returns Prisma.FeedbackQuestionCreateManyFormInput[] An array of question creation data.
   * @private
   */
  private generateQuestionsForAllSubjects(
    allocations: (SubjectAllocation & {
      faculty: { id: string; name: string };
      subject: { id: string; name: string };
    })[]
  ): Prisma.FeedbackQuestionCreateManyFormInput[] {
    let questions: Prisma.FeedbackQuestionCreateManyFormInput[] = [];
    let displayOrder = 1;

    allocations.forEach((allocation) => {
      const sessionType =
        allocation.lectureType === 'LECTURE' ? 'Theory' : 'Lab';
      const categoryId =
        allocation.lectureType === 'LECTURE'
          ? 'lecture-feedback'
          : 'lab-feedback';
      const batchValue =
        allocation.lectureType === 'LECTURE' ? 'None' : allocation.batch;

      questions.push({
        categoryId,
        facultyId: allocation.faculty.id,
        subjectId: allocation.subject.id,
        batch: batchValue,
        text: `Rate Prof. ${allocation.faculty.name} in Subject: ${allocation.subject.name} (${sessionType}) - ${batchValue}`,
        type: 'rating', // Hardcoded as 'rating' based on original logic
        isRequired: true,
        displayOrder: displayOrder++,
        isDeleted: false, // Explicitly set to false on creation
      });
    });

    return questions;
  }

  /**
   * @dev Generates feedback forms based on department and selected semesters/divisions.
   * This involves looking up subject allocations and creating forms with associated questions.
   * @param requestData The data for form generation.
   * @returns Promise<FeedbackForm[]> An array of generated feedback forms.
   * @throws AppError if any required related entities are not found or are deleted.
   */
  public async generateForms(
    requestData: FormGenerationRequest
  ): Promise<FeedbackForm[]> {
    await this.ensureQuestionCategories(); // Ensure categories exist

    const { departmentId, selectedSemesters } = requestData;
    const generatedForms: FeedbackForm[] = [];

    // Validate Department existence and active status
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    for (const semester of selectedSemesters) {
      // Validate Semester existence and active status
      const existingSemester = await prisma.semester.findUnique({
        where: { id: semester.id, isDeleted: false },
      });
      if (!existingSemester) {
        throw new AppError(
          `Semester with ID '${semester.id}' not found or is deleted.`,
          400
        );
      }

      for (const divisionId of semester.divisions) {
        // Validate Division existence and active status
        const existingDivision = await prisma.division.findUnique({
          where: { id: divisionId, isDeleted: false },
          include: { semester: true, department: true }, // Include for title generation
        });
        if (!existingDivision) {
          throw new AppError(
            `Division with ID '${divisionId}' not found or is deleted.`,
            400
          );
        }

        const allocations = await prisma.subjectAllocation.findMany({
          where: {
            divisionId,
            semesterId: semester.id,
            isDeleted: false, // Only active allocations
            faculty: { isDeleted: false }, // Ensure related entities are active
            subject: { isDeleted: false },
            OR: [{ lectureType: 'LECTURE' }, { lectureType: 'LAB' }],
          },
          include: {
            faculty: true,
            subject: true,
            division: true,
          },
        });

        if (!allocations.length) {
          console.warn(
            `No active subject allocations found for Division ID ${divisionId} and Semester ID ${semester.id}. Skipping form generation for this combination.`
          );
          continue; // Skip if no allocations found
        }

        // Use the first allocation for form title and subjectAllocationId, as per original logic
        const firstAllocation = allocations[0];

        try {
          const form = await prisma.feedbackForm.create({
            data: {
              division: { connect: { id: divisionId } },
              subjectAllocation: { connect: { id: firstAllocation.id } }, // Connect to the first allocation
              title: this.generateFormTitle(existingDivision), // Use validated division
              status: 'DRAFT',
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
              accessHash: this.generateHash(),
              isDeleted: false,
              questions: {
                create: this.generateQuestionsForAllSubjects(allocations),
              },
            },
            include: {
              questions: true,
              division: {
                include: {
                  semester: true,
                  department: true,
                },
              },
            },
          });
          generatedForms.push(form);
        } catch (error: any) {
          console.error(
            `Error creating form for Division ${divisionId}, Semester ${semester.id}:`,
            error
          );
          // Corrected: Using 'divisionName' and 'semesterNumber' as per Prisma's Division and Semester models
          throw new AppError(
            `Failed to generate form for division ${existingDivision.divisionName} in semester ${existingSemester.semesterNumber}.`,
            500
          );
        }
      }
    }
    return generatedForms;
  }

  /**
   * @dev Retrieves all active feedback forms.
   * Includes related questions, division, and subject allocation details.
   * @returns Promise<FeedbackForm[]> A list of active feedback forms.
   */
  public async getAllForms(): Promise<FeedbackForm[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false,
          division: { isDeleted: false },
          subjectAllocation: { isDeleted: false }, // Ensure related entities are active
        },
        include: {
          questions: { where: { isDeleted: false } }, // Only active questions
          division: true,
          subjectAllocation: {
            include: {
              faculty: true,
              subject: true,
            },
          },
        },
      });
      return forms;
    } catch (error: any) {
      console.error('Error in FeedbackFormService.getAllForms:', error);
      throw new AppError('Failed to retrieve feedback forms.', 500);
    }
  }

  /**
   * @dev Retrieves a single active feedback form by its ID.
   * Includes related questions, division, and subject allocation details.
   * @param id The UUID of the form to retrieve.
   * @returns Promise<FeedbackForm | null> The feedback form record, or null if not found or deleted.
   */
  public async getFormById(id: string): Promise<FeedbackForm | null> {
    try {
      const form = await prisma.feedbackForm.findUnique({
        where: {
          id,
          isDeleted: false,
          division: { isDeleted: false },
          subjectAllocation: { isDeleted: false },
        },
        include: {
          questions: {
            where: { isDeleted: false }, // Only active questions
            include: {
              faculty: true,
              subject: true,
              category: true,
            },
          },
          division: true,
          subjectAllocation: true, // Include subject allocation directly
        },
      });
      return form;
    } catch (error: any) {
      console.error(
        `Error in FeedbackFormService.getFormById for ID ${id}:`,
        error
      );
      throw new AppError('Failed to retrieve feedback form.', 500);
    }
  }

  /**
   * @dev Updates an existing feedback form.
   * @param id The UUID of the form to update.
   * @param data The partial data to update the form with.
   * @returns Promise<FeedbackForm> The updated feedback form record.
   * @throws AppError if the form is not found or update fails.
   */
  public async updateForm(
    id: string,
    data: UpdateFormInput
  ): Promise<FeedbackForm> {
    try {
      const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingForm) {
        throw new AppError('Feedback form not found or is deleted.', 404);
      }

      const dataToUpdate: Prisma.FeedbackFormUpdateInput = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      const updatedForm = await prisma.feedbackForm.update({
        where: { id: id, isDeleted: false },
        data: dataToUpdate,
        include: {
          questions: {
            where: { isDeleted: false },
            include: {
              faculty: true,
              subject: true,
              category: true,
            },
          },
          division: true, // Include division for consistency
        },
      });
      return updatedForm;
    } catch (error: any) {
      console.error(
        `Error in FeedbackFormService.updateForm for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback form not found for update.', 404);
      }
      throw new AppError('Failed to update feedback form.', 500);
    }
  }

  /**
   * @dev Soft deletes a feedback form by setting its isDeleted flag to true.
   * Cascades soft deletion to associated questions and student responses,
   * and marks related feedback snapshots as form deleted.
   * @param id The UUID of the form to soft delete.
   * @returns Promise<FeedbackForm> The soft-deleted form record.
   * @throws AppError if the form is not found.
   */
  public async softDeleteForm(id: string): Promise<FeedbackForm> {
    try {
      const form = await prisma.$transaction(async (tx) => {
        // 1. Soft delete the FeedbackForm record
        const deletedForm = await tx.feedbackForm.update({
          where: { id: id, isDeleted: false },
          data: {
            isDeleted: true,
            status: 'CLOSED', // Set status to CLOSED when soft-deleted
          },
        });

        if (!deletedForm) {
          throw new AppError('Feedback form not found for deletion.', 404);
        }

        // 2. Soft delete related FeedbackQuestions
        await tx.feedbackQuestion.updateMany({
          where: { formId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        // 3. Soft delete related StudentResponses
        await tx.studentResponse.updateMany({
          where: { feedbackFormId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        // 4. Update all FeedbackSnapshot entries linked to this form or its responses
        await tx.feedbackSnapshot.updateMany({
          where: {
            OR: [
              { formId: id },
              {
                originalStudentResponseId: {
                  in: (
                    await tx.studentResponse.findMany({
                      where: { feedbackFormId: id },
                      select: { id: true },
                    })
                  ).map((sr) => sr.id),
                },
              },
            ],
          },
          data: {
            formDeleted: true,
          },
        });

        return deletedForm;
      });
      return form;
    } catch (error: any) {
      console.error(
        `Error in FeedbackFormService.softDeleteForm for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback form not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete feedback form.', 500);
    }
  }

  /**
   * @dev Adds a new question to an existing feedback form.
   * @param formId The UUID of the form to add the question to.
   * @param questionData The data for the new question.
   * @returns Promise<FeedbackForm> The updated feedback form with the new question.
   * @throws AppError if the form or related entities are not found or are deleted.
   */
  public async addQuestionToForm(
    formId: string,
    questionData: AddQuestionToFormInput
  ): Promise<FeedbackForm> {
    const {
      categoryId,
      facultyId,
      subjectId,
      batch,
      text,
      type,
      isRequired,
      displayOrder,
    } = questionData;

    // 1. Validate Form existence and active status
    const existingForm = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });
    if (!existingForm) {
      throw new AppError('Feedback Form not found or is deleted.', 404);
    }

    // 2. Validate Category existence and active status
    const existingCategory = await prisma.questionCategory.findUnique({
      where: { id: categoryId, isDeleted: false },
    });
    if (!existingCategory) {
      throw new AppError('Question Category not found or is deleted.', 400);
    }

    // 3. Validate Faculty existence and active status
    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId, isDeleted: false },
    });
    if (!existingFaculty) {
      throw new AppError('Faculty not found or is deleted.', 400);
    }

    // 4. Validate Subject existence and active status
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId, isDeleted: false },
    });
    if (!existingSubject) {
      throw new AppError('Subject not found or is deleted.', 400);
    }

    try {
      const updatedForm = await prisma.feedbackForm.update({
        where: { id: formId, isDeleted: false },
        data: {
          questions: {
            create: {
              categoryId,
              facultyId,
              subjectId,
              batch,
              text,
              type,
              isRequired,
              displayOrder,
              isDeleted: false,
            },
          },
        },
        include: {
          questions: {
            include: {
              faculty: true,
              subject: true,
              category: true,
            },
          },
        },
      });
      return updatedForm;
    } catch (error: any) {
      console.error(
        `Error in FeedbackFormService.addQuestionToForm for Form ID ${formId}:`,
        error
      );
      throw new AppError('Failed to add question to form.', 500);
    }
  }

  /**
   * @dev Updates the status and dates of a single feedback form.
   * Sends access emails if the status becomes 'ACTIVE'.
   * @param id The UUID of the form to update.
   * @param data The status and date data.
   * @returns Promise<FeedbackForm> The updated feedback form.
   * @throws AppError if the form is not found or update fails.
   */
  public async updateFormStatus(
    id: string,
    data: UpdateFormStatusInput
  ): Promise<FeedbackForm> {
    try {
      const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingForm) {
        throw new AppError('Feedback form not found or is deleted.', 404);
      }

      const updatedForm = await prisma.feedbackForm.update({
        where: { id: id, isDeleted: false },
        data: {
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: {
          division: true,
          questions: {
            include: {
              faculty: true,
              subject: true,
            },
          },
        },
      });

      // Send emails when form becomes active
      if (updatedForm.status === 'ACTIVE') {
        // Check if this form has override students first
        console.log(
          `Checking for override students for form ${updatedForm.id}`
        );
        const hasOverrideStudents = await prisma.feedbackFormOverride.findFirst(
          {
            where: {
              feedbackFormId: updatedForm.id,
              isDeleted: false,
              overrideStudents: {
                some: {
                  isDeleted: false,
                },
              },
            },
            include: {
              overrideStudents: {
                where: {
                  isDeleted: false,
                },
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          }
        );

        console.log(
          `Override students found:`,
          hasOverrideStudents ? hasOverrideStudents.overrideStudents.length : 0
        );

        if (
          hasOverrideStudents &&
          hasOverrideStudents.overrideStudents.length > 0
        ) {
          // Send emails to override students
          console.log('Sending emails to override students');
          await emailService.sendFormAccessEmailToOverrideStudents(
            updatedForm.id
          );
        } else {
          // Send emails to regular division students
          console.log('Sending emails to regular division students');
          await emailService.sendFormAccessEmail(
            updatedForm.id,
            updatedForm.divisionId
          );
        }
      }

      return updatedForm;
    } catch (error: any) {
      console.error(
        `Error in FeedbackFormService.updateFormStatus for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback form not found for status update.', 404);
      }
      throw new AppError('Failed to update form status.', 500);
    }
  }

  /**
   * @dev Bulk updates the status and dates for multiple feedback forms.
   * @param data The bulk update data, including form IDs, status, and dates.
   * @returns Promise<FeedbackForm[]> An array of updated feedback forms.
   * @throws AppError if any form is not found or update fails.
   */
  public async bulkUpdateFormStatus(
    data: BulkUpdateFormStatusInput
  ): Promise<FeedbackForm[]> {
    const { formIds, status, startDate, endDate } = data;
    const updatedForms: FeedbackForm[] = [];

    try {
      const transactionResults = await prisma.$transaction(
        formIds.map((id: string) =>
          prisma.feedbackForm.update({
            where: {
              id,
              isDeleted: false, // Ensure we are not bulk updating status of soft-deleted forms
            },
            data: {
              status,
              startDate: startDate ? new Date(startDate) : undefined,
              endDate: endDate ? new Date(endDate) : undefined,
            },
            include: {
              division: true,
              questions: {
                include: {
                  faculty: true,
                  subject: true,
                },
              },
            },
          })
        )
      );
      updatedForms.push(...transactionResults);
      return updatedForms;
    } catch (error: any) {
      console.error(
        'Error in FeedbackFormService.bulkUpdateFormStatus:',
        error
      );
      if (error.code === 'P2025') {
        throw new AppError(
          'One or more feedback forms not found for bulk status update.',
          404
        );
      }
      throw new AppError('Failed to bulk update form status.', 500);
    }
  }

  /**
   * @dev Retrieves a feedback form using an access token.
   * Checks if the token is valid, form is active, and not yet submitted.
   * @param token The access token.
   * @returns Promise<FeedbackForm | null> The feedback form if accessible, otherwise null.
   * @throws AppError if the token is invalid, form is deleted, or already submitted.
   */
  public async getFormByAccessToken(
    token: string
  ): Promise<FeedbackForm | null> {
    try {
      const formAccess = await prisma.formAccess.findUnique({
        where: { accessToken: token },
        include: {
          form: {
            include: {
              questions: {
                where: { isDeleted: false }, // Only active questions
                include: {
                  faculty: true,
                  subject: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!formAccess) {
        throw new AppError('Invalid access token.', 404);
      }

      // Check if the form itself is soft-deleted
      if (formAccess.form?.isDeleted) {
        throw new AppError('Form not found or is deleted.', 404);
      }

      // Check if the form is expired based on creation date (7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const formCreationDate = formAccess.createdAt;

      const isExpiredByTime = formCreationDate < sevenDaysAgo;

      // Update the form's isExpired status if needed
      if (isExpiredByTime && !formAccess.form.isExpired) {
        await prisma.feedbackForm.update({
          where: { id: formAccess.form.id },
          data: { isExpired: true },
        });

        throw new AppError(
          'Form has expired. Forms are valid for 7 days only.',
          403
        );
      }

      // Check explicit expiration flag
      if (formAccess.form?.isExpired) {
        throw new AppError('Form has expired.', 403);
      }

      // Check if the form is active (status)
      if (formAccess.form?.status !== 'ACTIVE') {
        throw new AppError('Form is not currently active.', 403);
      }

      // Check if the form has passed its end date
      if (formAccess.form?.endDate && new Date() > formAccess.form.endDate) {
        throw new AppError('Form submission period has ended.', 403);
      }

      if (formAccess.isSubmitted) {
        throw new AppError('Form already submitted.', 403);
      }

      return formAccess.form;
    } catch (error: any) {
      console.error(
        'Error in FeedbackFormService.getFormByAccessToken:',
        error
      );
      // Re-throw AppError directly, otherwise wrap generic errors
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve form by token.', 500);
    }
  }

  /**
   * Expires feedback forms that are older than 7 days based on their creation date.
   * This can be called by a scheduled job or API endpoint.
   * @returns Promise<number> The number of forms that were marked as expired.
   */
  public async expireOldForms(): Promise<number> {
    try {
      // Calculate the date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Update all forms that are older than 7 days and not already expired
      const result = await prisma.feedbackForm.updateMany({
        where: {
          createdAt: {
            lt: sevenDaysAgo,
          },
          isExpired: false,
          isDeleted: false,
        },
        data: {
          isExpired: true,
        },
      });

      return result.count;
    } catch (error: any) {
      console.error('Error in FeedbackFormService.expireOldForms:', error);
      throw new AppError('Failed to expire old forms.', 500);
    }
  }
}

export const feedbackFormService = new FeedbackFormService();
