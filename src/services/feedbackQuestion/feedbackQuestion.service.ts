// src/services/feedbackQuestion/feedbackQuestion.service.ts

import { FeedbackQuestion, QuestionCategory, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

// Interfaces for input data
interface CreateQuestionCategoryInput {
  categoryName: string;
  description: string;
}

interface UpdateQuestionCategoryInput
  extends Partial<CreateQuestionCategoryInput> {
  isDeleted?: boolean;
}

interface CreateFeedbackQuestionInput {
  formId: string;
  categoryId: string;
  facultyId: string;
  subjectId: string;
  batch?: string;
  text: string;
  type: string; // Assuming string type for now, adjust if it's an enum
  isRequired?: boolean;
  displayOrder: number;
}

interface UpdateFeedbackQuestionInput
  extends Partial<CreateFeedbackQuestionInput> {
  isDeleted?: boolean;
}

class FeedbackQuestionService {
  // --- Question Category Operations ---

  /**
   * @dev Retrieves all active question categories.
   * @returns Promise<QuestionCategory[]> A list of active question category records.
   */
  public async getAllQuestionCategories(): Promise<QuestionCategory[]> {
    try {
      const categories = await prisma.questionCategory.findMany({
        where: { isDeleted: false },
        include: { questions: { where: { isDeleted: false } } }, // Include active questions
      });
      return categories;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.getAllQuestionCategories:',
        error
      );
      throw new AppError('Failed to retrieve question categories.', 500);
    }
  }

  /**
   * @dev Retrieves a single active question category by its ID.
   * @param id The UUID of the category to retrieve.
   * @returns Promise<QuestionCategory | null> The category record, or null if not found or deleted.
   */
  public async getQuestionCategoryById(
    id: string
  ): Promise<QuestionCategory | null> {
    try {
      const category = await prisma.questionCategory.findUnique({
        where: { id: id, isDeleted: false },
        include: { questions: { where: { isDeleted: false } } },
      });
      return category;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.getQuestionCategoryById for ID ${id}:`,
        error
      );
      throw new AppError('Failed to retrieve question category.', 500);
    }
  }

  /**
   * @dev Creates a new question category.
   * @param data The data for the new category.
   * @returns Promise<QuestionCategory> The created category record.
   * @throws AppError if a category with the same name already exists.
   */
  public async createQuestionCategory(
    data: CreateQuestionCategoryInput
  ): Promise<QuestionCategory> {
    try {
      const newCategory = await prisma.questionCategory.create({
        data: {
          categoryName: data.categoryName,
          description: data.description,
          isDeleted: false, // Ensure it's active on creation
        },
      });
      return newCategory;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.createQuestionCategory:',
        error
      );
      if (error.code === 'P2002') {
        throw new AppError(
          `Question category with name '${data.categoryName}' already exists.`,
          409
        );
      }
      throw new AppError('Failed to create question category.', 500);
    }
  }

  /**
   * @dev Updates an existing question category.
   * @param id The UUID of the category to update.
   * @param data The partial data to update the category with.
   * @returns Promise<QuestionCategory> The updated category record.
   * @throws AppError if the category is not found or update fails.
   */
  public async updateQuestionCategory(
    id: string,
    data: UpdateQuestionCategoryInput
  ): Promise<QuestionCategory> {
    try {
      const existingCategory = await prisma.questionCategory.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingCategory) {
        throw new AppError('Question category not found or is deleted.', 404);
      }

      const updatedCategory = await prisma.questionCategory.update({
        where: { id: id, isDeleted: false }, // Ensure it's active
        data: data,
      });
      return updatedCategory;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.updateQuestionCategory for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Question category not found for update.', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError(
          `Question category with name '${data.categoryName}' already exists.`,
          409
        );
      }
      throw new AppError('Failed to update question category.', 500);
    }
  }

  /**
   * @dev Soft deletes a question category by setting its isDeleted flag to true.
   * Also soft deletes all associated feedback questions.
   * @param id The UUID of the category to soft delete.
   * @returns Promise<QuestionCategory> The soft-deleted category record.
   * @throws AppError if the category is not found.
   */
  public async softDeleteQuestionCategory(
    id: string
  ): Promise<QuestionCategory> {
    try {
      const category = await prisma.$transaction(async (tx) => {
        // 1. Soft delete the category itself
        const deletedCategory = await tx.questionCategory.update({
          where: { id: id, isDeleted: false },
          data: { isDeleted: true },
        });

        if (!deletedCategory) {
          throw new AppError('Question category not found for deletion.', 404);
        }

        // 2. Soft delete all associated feedback questions
        await tx.feedbackQuestion.updateMany({
          where: { categoryId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        // Optionally, update FeedbackSnapshot if needed, similar to deleteQuestion
        // This is a design decision based on how granular you want 'deleted' flags.
        // For now, we'll assume soft-deleting questions is sufficient.

        return deletedCategory;
      });
      return category;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.softDeleteQuestionCategory for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Question category not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete question category.', 500);
    }
  }

  // --- Feedback Question Operations ---

  /**
   * @dev Creates a new feedback question.
   * Validates existence and active status of parent form, category, faculty, and subject.
   * @param data The data for the new feedback question.
   * @returns Promise<FeedbackQuestion> The created question record.
   * @throws AppError if related entities are not found or are deleted.
   */
  public async createFeedbackQuestion(
    data: CreateFeedbackQuestionInput
  ): Promise<FeedbackQuestion> {
    const {
      formId,
      categoryId,
      facultyId,
      subjectId,
      batch,
      text,
      type,
      isRequired,
      displayOrder,
    } = data;

    // 1. Validate Form existence and active status
    const existingForm = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });
    if (!existingForm) {
      throw new AppError('Feedback Form not found or is deleted.', 400);
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
      const question = await prisma.feedbackQuestion.create({
        data: {
          form: { connect: { id: formId } },
          category: { connect: { id: categoryId } },
          faculty: { connect: { id: facultyId } },
          subject: { connect: { id: subjectId } },
          batch,
          text,
          type,
          isRequired,
          displayOrder,
          isDeleted: false, // Explicitly set to false on creation
        },
        include: {
          form: true,
          category: true,
          faculty: true,
          subject: true,
        },
      });
      return question;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.createFeedbackQuestion:',
        error
      );
      // No unique constraint on FeedbackQuestion itself, so no P2002 mapping here.
      throw new AppError('Failed to create feedback question.', 500);
    }
  }

  /**
   * @dev Updates an existing feedback question.
   * Validates existence and active status of parent entities if their IDs are provided in update data.
   * @param id The UUID of the question to update.
   * @param data The partial data to update the question with.
   * @returns Promise<FeedbackQuestion> The updated question record.
   * @throws AppError if the question is not found or update fails.
   */
  public async updateFeedbackQuestion(
    id: string,
    data: UpdateFeedbackQuestionInput
  ): Promise<FeedbackQuestion> {
    try {
      const existingQuestion = await prisma.feedbackQuestion.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingQuestion) {
        throw new AppError('Feedback question not found or is deleted.', 404);
      }

      const dataToUpdate: Prisma.FeedbackQuestionUpdateInput = { ...data };

      // Handle related entity updates
      if (data.formId) {
        const form = await prisma.feedbackForm.findUnique({
          where: { id: data.formId, isDeleted: false },
        });
        if (!form)
          throw new AppError(
            'Provided form ID does not exist or is deleted.',
            400
          );
        dataToUpdate.form = { connect: { id: data.formId } };
      }
      if (data.categoryId) {
        const category = await prisma.questionCategory.findUnique({
          where: { id: data.categoryId, isDeleted: false },
        });
        if (!category)
          throw new AppError(
            'Provided category ID does not exist or is deleted.',
            400
          );
        dataToUpdate.category = { connect: { id: data.categoryId } };
      }
      if (data.facultyId) {
        const faculty = await prisma.faculty.findUnique({
          where: { id: data.facultyId, isDeleted: false },
        });
        if (!faculty)
          throw new AppError(
            'Provided faculty ID does not exist or is deleted.',
            400
          );
        dataToUpdate.faculty = { connect: { id: data.facultyId } };
      }
      if (data.subjectId) {
        const subject = await prisma.subject.findUnique({
          where: { id: data.subjectId, isDeleted: false },
        });
        if (!subject)
          throw new AppError(
            'Provided subject ID does not exist or is deleted.',
            400
          );
        dataToUpdate.subject = { connect: { id: data.subjectId } };
      }

      // Remove the original ID fields from dataToUpdate if they were used for connection logic
      delete (dataToUpdate as any).formId;
      delete (dataToUpdate as any).categoryId;
      delete (dataToUpdate as any).facultyId;
      delete (dataToUpdate as any).subjectId;

      const updatedQuestion = await prisma.feedbackQuestion.update({
        where: { id: id, isDeleted: false },
        data: dataToUpdate,
        include: {
          form: true,
          category: true,
          faculty: true,
          subject: true,
        },
      });
      return updatedQuestion;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.updateFeedbackQuestion for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback question not found for update.', 404);
      }
      throw new AppError('Failed to update feedback question.', 500);
    }
  }

  /**
   * @dev Soft deletes a feedback question by setting its isDeleted flag to true.
   * Also soft deletes associated StudentResponses and updates FeedbackSnapshots.
   * @param id The UUID of the question to soft delete.
   * @returns Promise<FeedbackQuestion> The soft-deleted question record.
   * @throws AppError if the question is not found.
   */
  public async softDeleteFeedbackQuestion(
    id: string
  ): Promise<FeedbackQuestion> {
    try {
      const question = await prisma.$transaction(async (tx) => {
        // 1. Soft delete the FeedbackQuestion record
        const deletedQuestion = await tx.feedbackQuestion.update({
          where: { id: id, isDeleted: false },
          data: { isDeleted: true },
        });

        if (!deletedQuestion) {
          throw new AppError('Feedback question not found for deletion.', 404);
        }

        // 2. Soft delete all associated StudentResponses
        await tx.studentResponse.updateMany({
          where: { questionId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        // 3. Update all FeedbackSnapshot entries linked to this question or its responses
        // Assuming 'formDeleted' can also signify question deletion contextually for snapshot.
        // If a more granular flag is needed, add 'questionDeleted' to FeedbackSnapshot model.
        await tx.feedbackSnapshot.updateMany({
          where: {
            OR: [
              { questionId: id }, // Direct link to the question being soft-deleted
              {
                originalStudentResponseId: {
                  in: (
                    await tx.studentResponse.findMany({
                      where: { questionId: id },
                      select: { id: true },
                    })
                  ).map((sr) => sr.id),
                },
              }, // Link via original StudentResponse
            ],
          },
          data: {
            formDeleted: true, // Mark as deleted (contextually, the question is affected)
          },
        });

        return deletedQuestion;
      });
      return question;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.softDeleteFeedbackQuestion for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback question not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete feedback question.', 500);
    }
  }

  /**
   * @dev Retrieves active feedback questions by form ID.
   * Includes related faculty, subject, and category, ensuring they are active.
   * Orders questions by displayOrder ascending.
   * @param formId The UUID of the form.
   * @returns Promise<FeedbackQuestion[]> A list of active questions for the given form.
   * @throws AppError if the form is not found or is deleted.
   */
  public async getFeedbackQuestionsByFormId(
    formId: string
  ): Promise<FeedbackQuestion[]> {
    try {
      // Validate Form existence and active status
      const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: formId, isDeleted: false },
      });
      if (!existingForm) {
        throw new AppError('Feedback Form not found or is deleted.', 404);
      }

      const questions = await prisma.feedbackQuestion.findMany({
        where: {
          formId: formId,
          isDeleted: false, // Only fetch questions that are not soft-deleted
          category: { isDeleted: false },
          faculty: { isDeleted: false },
          subject: { isDeleted: false },
        },
        include: {
          category: true,
          faculty: true,
          subject: true,
        },
        orderBy: {
          displayOrder: 'asc',
        },
      });
      return questions;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.getFeedbackQuestionsByFormId for form ID ${formId}:`,
        error
      );
      throw new AppError(
        'Failed to retrieve feedback questions by form ID.',
        500
      );
    }
  }

  /**
   * @dev Performs a batch update of feedback questions.
   * Ensures questions exist and are active, and validates related entities if their IDs are updated.
   * @param questionsData An array of question data objects to update.
   * @returns Promise<FeedbackQuestion[]> An array of the updated question records.
   * @throws AppError if any question update fails due to invalid IDs or related entities.
   */
  public async batchUpdateFeedbackQuestions(
    questionsData: Array<{ id: string } & Partial<CreateFeedbackQuestionInput>>
  ): Promise<FeedbackQuestion[]> {
    const results: FeedbackQuestion[] = [];

    try {
      const transactionResults = await prisma.$transaction(
        questionsData.map((questionData) => {
          const {
            id,
            formId,
            categoryId,
            facultyId,
            subjectId,
            ...restOfData
          } = questionData;

          const dataToUpdate: Prisma.FeedbackQuestionUpdateInput = {
            ...restOfData,
          };

          // Conditionally connect relations if their IDs are provided
          if (formId) dataToUpdate.form = { connect: { id: formId } };
          if (categoryId)
            dataToUpdate.category = { connect: { id: categoryId } };
          if (facultyId) dataToUpdate.faculty = { connect: { id: facultyId } };
          if (subjectId) dataToUpdate.subject = { connect: { id: subjectId } };

          return prisma.feedbackQuestion.update({
            where: { id: id, isDeleted: false }, // Only update if not soft-deleted
            data: dataToUpdate,
            include: {
              form: true,
              category: true,
              faculty: true,
              subject: true,
            },
          });
        })
      );
      results.push(...transactionResults);
      return results;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.batchUpdateFeedbackQuestions:',
        error
      );
      if (error.code === 'P2025') {
        throw new AppError(
          'One or more feedback questions not found or are deleted for batch update.',
          404
        );
      }
      throw new AppError('Failed to batch update feedback questions.', 500);
    }
  }
}

export const feedbackQuestionService = new FeedbackQuestionService();
