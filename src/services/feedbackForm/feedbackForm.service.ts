/**
 * @file src/services/feedbackForm/feedbackForm.service.ts
 * @description Service layer for sending feedback form access emails.
 * Handles email transporter setup, token generation, and database interaction for form access.
 */

import {
  FeedbackForm,
  SubjectAllocation,
  Division,
  FormStatus,
  Prisma,
  Semester,
  Department,
} from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { emailService, EmailJobPayload } from '../email/email.service';
import { getFeedbackFormTemplate } from '../../utils/emailTemplates/feedbackForm.template';

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
  description?: string;
  status?: FormStatus;
  startDate?: string;
  endDate?: string;
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

// NEW: Helper function to generate email HTML using the professional template.
const createFeedbackFormEmailHtml = async (
  accessToken: string,
  formId: string
): Promise<string> => {
  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_PROD_URL
      : process.env.FRONTEND_DEV_URL;

  // Get form details to pass to the template
  const form = await prisma.feedbackForm.findUnique({
    where: { id: formId },
    include: {
      division: {
        include: {
          semester: true,
        },
      },
    },
  });

  if (!form) {
    // Fallback if form not found
    return getFeedbackFormTemplate(
      0,
      'Unknown',
      'Student Feedback Form',
      accessToken,
      apiUrl || 'http://localhost:3000'
    );
  }

  return getFeedbackFormTemplate(
    form.division.semester.semesterNumber,
    form.division.divisionName,
    form.title,
    accessToken,
    apiUrl || 'http://localhost:3000'
  );
};

class FeedbackFormService {
  // Ensures essential question categories exist.
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
        create: { ...category, isDeleted: false },
      });
    }
  }

  // Generates a dynamic title for a feedback form.
  private generateFormTitle(
    department: Department,
    division: Division,
    semester: Semester
  ): string {
    return `${department.abbreviation} ${semester.semesterNumber}${division.divisionName} - Student Feedback Form`;
  }

  // Generates a random alphanumeric hash for form access.
  private generateHash(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Generates feedback questions based on subject allocations.
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
        type: 'rating',
        isRequired: true,
        displayOrder: displayOrder++,
        isDeleted: false,
      });
    });

    return questions;
  }

  // Generates feedback forms based on department and selected semesters/divisions.
  public async generateForms(
    requestData: FormGenerationRequest
  ): Promise<FeedbackForm[]> {
    await this.ensureQuestionCategories();

    const { departmentId, selectedSemesters } = requestData;
    const generatedForms: FeedbackForm[] = [];

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!existingDepartment) {
      throw new AppError('Department not found or is deleted.', 400);
    }

    for (const semester of selectedSemesters) {
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
        const existingDivision = await prisma.division.findUnique({
          where: { id: divisionId, isDeleted: false },
          include: { semester: true, department: true },
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
            isDeleted: false,
            faculty: { isDeleted: false },
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
          continue;
        }

        const firstAllocation = allocations[0];

        try {
          const form = await prisma.feedbackForm.create({
            data: {
              division: { connect: { id: divisionId } },
              subjectAllocation: { connect: { id: firstAllocation.id } },
              title: this.generateFormTitle(
                existingDivision.department,
                existingDivision,
                existingSemester
              ),
              status: 'DRAFT',
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
          throw new AppError(
            `Failed to generate form for division ${existingDivision.divisionName} in semester ${existingSemester.semesterNumber}.`,
            500
          );
        }
      }
    }
    return generatedForms;
  }

  // Retrieves all active feedback forms.
  public async getAllForms(): Promise<FeedbackForm[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false,
          division: { isDeleted: false },
          subjectAllocation: { isDeleted: false },
        },
        include: {
          questions: { where: { isDeleted: false } },
          division: {
            include: {
              department: true,
              semester: {
                include: {
                  academicYear: true,
                },
              },
            },
          },
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

  // Retrieves a single active feedback form by its ID.
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
            where: { isDeleted: false },
            include: {
              faculty: true,
              subject: true,
              category: true,
            },
          },
          division: {
            include: {
              department: true,
              semester: {
                include: {
                  academicYear: true,
                },
              },
            },
          },
          subjectAllocation: true,
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

  // Updates an existing feedback form.
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

      console.log('Received Data', data);

      const dataToUpdate: Prisma.FeedbackFormUpdateInput = {
        ...data,
        title: data.title || existingForm.title,
        status: data.status || existingForm.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        description: data.description,
      };

      console.log(`Updating form with ID ${id} with data:`, dataToUpdate);

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
          division: {
            include: {
              department: true,
              semester: {
                include: {
                  academicYear: true,
                },
              },
            },
          },
        },
      });
      console.log(`Returning: Updated form: ${updatedForm.description}`);

      // Send email notification if the form is active
      if (updatedForm.status === 'ACTIVE') {
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

        if (hasOverrideStudents) {
          console.log('Queuing emails for override students');
          await this.queueEmailsForOverrideStudents(updatedForm.id);
        } else {
          console.log('Queuing emails for regular division students');
          await this.queueEmailsForDivision(
            updatedForm.id,
            updatedForm.divisionId
          );
        }
      }

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

  // Soft deletes a feedback form and cascades deletion to related entities.
  public async softDeleteForm(id: string): Promise<FeedbackForm> {
    try {
      const form = await prisma.$transaction(async (tx) => {
        const deletedForm = await tx.feedbackForm.update({
          where: { id: id, isDeleted: false },
          data: {
            isDeleted: true,
            status: 'CLOSED',
          },
        });

        if (!deletedForm) {
          throw new AppError('Feedback form not found for deletion.', 404);
        }

        await tx.feedbackQuestion.updateMany({
          where: { formId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        await tx.studentResponse.updateMany({
          where: { feedbackFormId: id, isDeleted: false },
          data: { isDeleted: true },
        });

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

  // Adds a new question to an existing feedback form.
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

    const existingForm = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });
    if (!existingForm) {
      throw new AppError('Feedback Form not found or is deleted.', 404);
    }

    const existingCategory = await prisma.questionCategory.findUnique({
      where: { id: categoryId, isDeleted: false },
    });
    if (!existingCategory) {
      throw new AppError('Question Category not found or is deleted.', 400);
    }

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId, isDeleted: false },
    });
    if (!existingFaculty) {
      throw new AppError('Faculty not found or is deleted.', 400);
    }

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
          division: {
            include: {
              department: true,
              semester: {
                include: {
                  academicYear: true,
                },
              },
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

  // Updates the status and dates of a single feedback form.
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
          division: {
            include: {
              department: true,
              semester: {
                include: {
                  academicYear: true,
                },
              },
            },
          },
          questions: {
            include: {
              faculty: true,
              subject: true,
            },
          },
        },
      });

      if (updatedForm.status === 'ACTIVE') {
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

        if (hasOverrideStudents) {
          console.log('Queuing emails for override students');
          await this.queueEmailsForOverrideStudents(updatedForm.id);
        } else {
          console.log('Queuing emails for regular division students');
          await this.queueEmailsForDivision(
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

  // Bulk updates the status and dates for multiple feedback forms.
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
              isDeleted: false,
            },
            data: {
              status,
              startDate: startDate ? new Date(startDate) : undefined,
              endDate: endDate ? new Date(endDate) : undefined,
            },
            include: {
              division: {
                include: {
                  department: true,
                  semester: {
                    include: {
                      academicYear: true,
                    },
                  },
                },
              },
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

  // Retrieves a feedback form using an access token.
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
                where: { isDeleted: false },
                include: {
                  faculty: true,
                  subject: true,
                  category: true,
                },
              },
              division: {
                include: {
                  department: true,
                  semester: {
                    include: {
                      academicYear: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!formAccess) {
        throw new AppError('Invalid access token.', 404);
      }

      if (formAccess.form?.isDeleted) {
        throw new AppError('Form not found or is deleted.', 404);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const formCreationDate = formAccess.createdAt;

      const isExpiredByTime = formCreationDate < sevenDaysAgo;

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

      if (formAccess.form?.isExpired) {
        throw new AppError('Form has expired.', 403);
      }

      if (formAccess.form?.status !== 'ACTIVE') {
        throw new AppError('Form is not currently active.', 403);
      }

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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve form by token.', 500);
    }
  }

  // Expires feedback forms that are older than 7 days.
  public async expireOldForms(): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
  /**
   * NEW: Queues access emails for all regular students in a division for a specific form.
   * @param formId - The ID of the feedback form.
   * @param divisionId - The ID of the division.
   */
  public async queueEmailsForDivision(
    formId: string,
    divisionId: string
  ): Promise<void> {
    // Get form details for email subject
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId },
      select: { title: true },
    });

    const students = await prisma.student.findMany({
      where: { divisionId, isDeleted: false },
    });

    if (students.length === 0) {
      console.log(`No regular students found in division ${divisionId}.`);
      return;
    }

    console.log(
      `Attempting to queue feedback form emails for ${students.length} regular students.`
    );

    let emailsQueued = 0;
    let emailsSkipped = 0;

    for (const student of students) {
      // Check if FormAccess already exists for this student and form
      let formAccess = await prisma.formAccess.findUnique({
        where: {
          form_student_unique: {
            formId: formId,
            studentId: student.id,
          },
        },
      });

      // If FormAccess doesn't exist, create it
      if (!formAccess) {
        formAccess = await prisma.formAccess.create({
          data: {
            studentId: student.id,
            formId: formId,
            accessToken: this.generateHash(), // Using your existing hash function
          },
        });

        console.log(
          `Created new FormAccess for regular student: ${student.email}`
        );
      } else {
        console.log(
          `FormAccess already exists for regular student: ${student.email}, skipping creation`
        );
      }

      // Only send email if FormAccess exists and is not submitted
      if (!formAccess.isSubmitted) {
        const emailHtml = await createFeedbackFormEmailHtml(
          formAccess.accessToken,
          formId
        );
        const payload: EmailJobPayload = {
          to: student.email,
          subject: `📄 ${form?.title || 'Student Feedback Form'} - Your Input Required`,
          html: emailHtml,
        };

        await emailService.addEmailJobToQueue(
          `send-form-access-to-${student.email}`,
          payload
        );
        emailsQueued++;
      } else {
        console.log(
          `Skipping email for regular student ${student.email} - form already submitted`
        );
        emailsSkipped++;
      }
    }

    console.log(
      `Regular students email summary: ${emailsQueued} emails queued, ${emailsSkipped} skipped (already submitted)`
    );
  }

  /**
   * NEW: Queues access emails for override students for a specific form.
   * @param formId - The ID of the feedback form.
   */
  public async queueEmailsForOverrideStudents(formId: string): Promise<void> {
    // Get form details for email subject
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId },
      select: { title: true },
    });

    const override = await prisma.feedbackFormOverride.findFirst({
      where: { feedbackFormId: formId, isDeleted: false },
      include: {
        overrideStudents: {
          where: { isDeleted: false },
        },
      },
    });

    const students = override?.overrideStudents;
    if (!students || students.length === 0) {
      console.log(`No override students found for form ${formId}.`);
      return;
    }

    console.log(
      `Attempted to queue feedback form emails for ${students.length} override students.`
    );

    let emailsQueued = 0;
    let emailsSkipped = 0;

    for (const student of students) {
      // Check if FormAccess already exists for this student and form
      let formAccess = await prisma.formAccess.findUnique({
        where: {
          form_override_student_unique: {
            formId: formId,
            overrideStudentId: student.id,
          },
        },
      });

      // If FormAccess doesn't exist, create it
      if (!formAccess) {
        formAccess = await prisma.formAccess.create({
          data: {
            overrideStudentId: student.id, // Fixed: Use overrideStudentId instead of studentId
            formId: formId,
            accessToken: this.generateHash(),
          },
        });

        console.log(
          `Created new FormAccess for override student: ${student.email}`
        );
      } else {
        console.log(
          `FormAccess already exists for override student: ${student.email}, skipping creation`
        );
      }

      // Only send email if FormAccess exists and is not submitted
      if (!formAccess.isSubmitted) {
        const emailHtml = await createFeedbackFormEmailHtml(
          formAccess.accessToken,
          formId
        );
        const payload: EmailJobPayload = {
          to: student.email,
          subject: `📄 ${form?.title || 'Student Feedback Form'} - Your Input Required`,
          html: emailHtml,
        };

        await emailService.addEmailJobToQueue(
          `send-form-access-to-override-${student.email}`,
          payload
        );
        emailsQueued++;
      } else {
        console.log(
          `Skipping email for override student ${student.email} - form already submitted`
        );
        emailsSkipped++;
      }
    }

    console.log(
      `Override students email summary: ${emailsQueued} emails queued, ${emailsSkipped} skipped (already submitted)`
    );
  }

  /**
   * NEW: Main method to queue emails for a feedback form.
   * Automatically determines whether to send to division students or override students.
   * @param formId - The ID of the feedback form.
   * @returns The number of emails queued.
   */
  public async queueEmailsForFeedbackForm(formId: string): Promise<number> {
    // First, get the form to check its structure
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
      include: {
        division: true,
      },
    });

    if (!form) {
      throw new AppError('Feedback form not found or is deleted.', 404);
    }

    // Check if this form has override students
    const hasOverrideStudents = await prisma.feedbackFormOverride.findFirst({
      where: {
        feedbackFormId: formId,
        isDeleted: false,
      },
      include: {
        overrideStudents: {
          where: { isDeleted: false },
        },
      },
    });

    let emailCount = 0;

    if (
      hasOverrideStudents &&
      hasOverrideStudents.overrideStudents.length > 0
    ) {
      console.log('Queuing emails for override students');
      await this.queueEmailsForOverrideStudents(formId);
      emailCount = hasOverrideStudents.overrideStudents.length;
    } else {
      console.log('Queuing emails for regular division students');
      await this.queueEmailsForDivision(formId, form.divisionId);

      // Count the students in the division
      const students = await prisma.student.findMany({
        where: { divisionId: form.divisionId, isDeleted: false },
      });
      emailCount = students.length;
    }

    return emailCount;
  }
}

export const feedbackFormService = new FeedbackFormService();
