// src/services/overrideStudents/overrideStudents.service.ts

import { OverrideStudent, FeedbackFormOverride } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { overrideStudentExcelRowSchema } from '../../utils/validators/overrideStudents.validation';

interface OverrideStudentUploadResult {
  message: string;
  rowsAffected: number;
  skippedRows: number;
  skippedDetails: string[];
}

interface UpdateOverrideStudentInput {
  name?: string;
  email?: string;
  enrollmentNumber?: string;
  batch?: string;
  phoneNumber?: string;
  department?: string;
  semester?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedOverrideStudents {
  students: OverrideStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class OverrideStudentsService {
  /**
   * @dev Extracts the string value from an ExcelJS cell, handling rich text and hyperlinks.
   * @param {ExcelJS.Cell} cell - The ExcelJS cell object.
   * @returns {string} The string representation of the cell's value.
   * @private
   */
  private getCellValue(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (
      value &&
      typeof value === 'object' &&
      'hyperlink' in value &&
      'text' in value
    ) {
      return value.text?.toString() || ''; // For hyperlink cells, use the text
    }
    return value?.toString() || ''; // Convert other values to string
  }

  /**
   * @dev Validates that a feedback form exists and is not deleted.
   * @param formId The UUID of the feedback form.
   * @returns Promise<void>
   * @throws AppError if the form is not found or is deleted.
   * @private
   */
  private async validateFeedbackForm(formId: string): Promise<void> {
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });

    if (!form) {
      throw new AppError('Feedback form not found or is deleted.', 404);
    }
  }

  /**
   * @dev Ensures that a FeedbackFormOverride record exists for the given form.
   * Creates one if it doesn't exist.
   * @param formId The UUID of the feedback form.
   * @param uploadedBy The ID of the admin who uploaded the students.
   * @returns Promise<FeedbackFormOverride>
   * @private
   */
  private async ensureFeedbackFormOverride(
    formId: string,
    uploadedBy: string
  ): Promise<FeedbackFormOverride> {
    let override = await prisma.feedbackFormOverride.findFirst({
      where: { feedbackFormId: formId, isDeleted: false },
    });

    if (!override) {
      override = await prisma.feedbackFormOverride.create({
        data: {
          feedbackFormId: formId,
          uploadedBy: uploadedBy,
          isDeleted: false,
        },
      });
    }

    return override;
  }

  /**
   * @description Processes an Excel/CSV file containing override student data.
   * Creates override student records for the specified feedback form.
   * @param formId The UUID of the feedback form.
   * @param fileBuffer The buffer of the uploaded Excel/CSV file.
   * @param uploadedBy The ID of the admin who uploaded the file.
   * @returns Promise<OverrideStudentUploadResult>
   * @throws AppError if file processing fails or form is not found.
   */
  public async uploadOverrideStudents(
    formId: string,
    fileBuffer: Buffer,
    uploadedBy: string
  ): Promise<OverrideStudentUploadResult> {
    let skippedRowsDetails: string[] = [];
    let addedRows = 0;
    let skippedCount = 0;

    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Ensure FeedbackFormOverride record exists
      const override = await this.ensureFeedbackFormOverride(
        formId,
        uploadedBy
      );

      // Clear any existing override students for this form
      await prisma.overrideStudent.updateMany({
        where: { feedbackFormOverrideId: override.id },
        data: { isDeleted: true },
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new AppError(
          'Invalid worksheet: Worksheet not found in the Excel file.',
          400
        );
      }

      // Track emails to prevent duplicates within the same upload
      const emailSet = new Set<string>();

      // Iterate over rows, starting from the second row (assuming first is header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Skip empty rows
        if (!row.hasValues) {
          continue;
        }

        // Extract raw cell values
        const rawData = {
          studentName: this.getCellValue(row.getCell(1)),
          email: this.getCellValue(row.getCell(2)),
          enrollmentNumber: this.getCellValue(row.getCell(3)),
          batch: this.getCellValue(row.getCell(4)),
          phoneNumber: this.getCellValue(row.getCell(5)),
          department: this.getCellValue(row.getCell(6)),
          semester: this.getCellValue(row.getCell(7)),
        };

        // Validate row data using Zod
        const validationResult =
          overrideStudentExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          skippedCount++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          studentName,
          email,
          enrollmentNumber,
          batch,
          phoneNumber,
          department,
          semester,
        } = validatedData;

        try {
          // Check for duplicate email within this upload
          if (emailSet.has(email)) {
            const message = `Row ${rowNumber}: Skipping duplicate email '${email}' within the same upload.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            skippedCount++;
            continue;
          }

          // Check if email already exists for this override
          const existingOverrideStudent =
            await prisma.overrideStudent.findUnique({
              where: {
                email_feedbackFormOverrideId: {
                  email: email,
                  feedbackFormOverrideId: override.id,
                },
              },
            });

          if (existingOverrideStudent && !existingOverrideStudent.isDeleted) {
            const message = `Row ${rowNumber}: Student with email '${email}' already exists for this form override.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            skippedCount++;
            continue;
          }

          // Add email to set to track duplicates
          emailSet.add(email);

          // Create or restore the override student
          if (existingOverrideStudent && existingOverrideStudent.isDeleted) {
            // Restore and update the soft-deleted record
            await prisma.overrideStudent.update({
              where: { id: existingOverrideStudent.id },
              data: {
                name: studentName,
                enrollmentNumber: enrollmentNumber,
                batch: batch,
                phoneNumber: phoneNumber,
                department: department,
                semester: semester,
                isDeleted: false,
              },
            });
            addedRows++;
          } else {
            // Create a new override student
            await prisma.overrideStudent.create({
              data: {
                feedbackFormOverrideId: override.id,
                name: studentName,
                email: email,
                enrollmentNumber: enrollmentNumber,
                batch: batch,
                phoneNumber: phoneNumber,
                department: department,
                semester: semester,
                isDeleted: false,
              },
            });
            addedRows++;
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Email '${email}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          skippedCount++;
        }
      }

      return {
        message: 'Override students data processing complete.',
        rowsAffected: addedRows,
        skippedRows: skippedCount,
        skippedDetails: skippedRowsDetails,
      };
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.uploadOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error processing override students data.',
        500
      );
    }
  }

  /**
   * @description Retrieves all override students for a specific feedback form with pagination.
   * @param formId The UUID of the feedback form.
   * @param options Pagination options.
   * @returns Promise<PaginatedOverrideStudents>
   * @throws AppError if the form is not found.
   */
  public async getOverrideStudents(
    formId: string,
    options: PaginationOptions
  ): Promise<PaginatedOverrideStudents> {
    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Find the override record for this form
      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return {
          students: [],
          pagination: {
            page: options.page,
            limit: options.limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      const { page, limit } = options;
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.overrideStudent.count({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      // Get paginated students
      const students = await prisma.overrideStudent.findMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        students,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.getOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error retrieving override students.',
        500
      );
    }
  }

  /**
   * @description Retrieves all override students for a specific feedback form without pagination.
   * @param formId The UUID of the feedback form.
   * @returns Promise<OverrideStudent[]>
   * @throws AppError if the form is not found.
   */
  public async getAllOverrideStudents(
    formId: string
  ): Promise<OverrideStudent[]> {
    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Find the override record for this form
      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return [];
      }

      // Get all students
      const students = await prisma.overrideStudent.findMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
      });

      return students;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.getAllOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error retrieving override students.',
        500
      );
    }
  }

  /**
   * @description Updates an override student.
   * @param formId The UUID of the feedback form.
   * @param studentId The UUID of the override student.
   * @param updateData The data to update.
   * @returns Promise<OverrideStudent>
   * @throws AppError if the form or student is not found.
   */
  public async updateOverrideStudent(
    formId: string,
    studentId: string,
    updateData: UpdateOverrideStudentInput
  ): Promise<OverrideStudent> {
    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Find the override record for this form
      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        throw new AppError('No override students found for this form.', 404);
      }

      // Validate that the override student exists
      const existingStudent = await prisma.overrideStudent.findUnique({
        where: {
          id: studentId,
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      if (!existingStudent) {
        throw new AppError('Override student not found.', 404);
      }

      // Check for email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingStudent.email) {
        const duplicateEmail = await prisma.overrideStudent.findUnique({
          where: {
            email_feedbackFormOverrideId: {
              email: updateData.email,
              feedbackFormOverrideId: override.id,
            },
          },
        });

        if (duplicateEmail && duplicateEmail.id !== studentId) {
          throw new AppError(
            'Another student with this email already exists for this form.',
            400
          );
        }
      }

      // Update the student
      const updatedStudent = await prisma.overrideStudent.update({
        where: { id: studentId },
        data: updateData,
      });

      return updatedStudent;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.updateOverrideStudent:',
        error
      );
      throw new AppError(
        error.message || 'Error updating override student.',
        500
      );
    }
  }

  /**
   * @description Deletes an override student (soft delete).
   * @param formId The UUID of the feedback form.
   * @param studentId The UUID of the override student.
   * @returns Promise<void>
   * @throws AppError if the form or student is not found.
   */
  public async deleteOverrideStudent(
    formId: string,
    studentId: string
  ): Promise<void> {
    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Find the override record for this form
      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        throw new AppError('No override students found for this form.', 404);
      }

      // Validate that the override student exists
      const existingStudent = await prisma.overrideStudent.findUnique({
        where: {
          id: studentId,
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      if (!existingStudent) {
        throw new AppError('Override student not found.', 404);
      }

      // Soft delete the student
      await prisma.overrideStudent.update({
        where: { id: studentId },
        data: { isDeleted: true },
      });
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.deleteOverrideStudent:',
        error
      );
      throw new AppError(
        error.message || 'Error deleting override student.',
        500
      );
    }
  }

  /**
   * @description Clears all override students for a feedback form.
   * @param formId The UUID of the feedback form.
   * @returns Promise<number> Number of students deleted.
   * @throws AppError if the form is not found.
   */
  public async clearOverrideStudents(formId: string): Promise<number> {
    try {
      // Validate that the feedback form exists
      await this.validateFeedbackForm(formId);

      // Find the override record for this form
      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return 0; // No override students to clear
      }

      // Count current active students
      const count = await prisma.overrideStudent.count({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      // Soft delete all override students for this form
      await prisma.overrideStudent.updateMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      return count;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.clearOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error clearing override students.',
        500
      );
    }
  }
}

export const overrideStudentsService = new OverrideStudentsService();
