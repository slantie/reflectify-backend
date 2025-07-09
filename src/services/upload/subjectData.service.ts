/**
 * @file src/services/upload/subjectData.service.ts
 * @description Service layer for handling subject data upload and processing from Excel files.
 * It manages department, academic year, semester, and subject record creation/updates.
 */

import ExcelJS from 'exceljs';
import {
  SubjectType,
  SemesterTypeEnum,
  College,
  Department,
  AcademicYear,
  Semester,
} from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError
import { subjectExcelRowSchema } from '../../utils/validators/upload.validation'; // Import Zod schema for subject rows

// Caches to reduce database lookups for frequently accessed entities during a single upload operation
const COLLEGE_ID = 'LDRP-ITR'; // Assuming this is a constant for your college
const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();
const academicYearCache = new Map<string, AcademicYear>();
const semesterCache = new Map<string, Semester>();

// --- Canonical Department Mapping ---
// This map defines the canonical full name and abbreviation for each department.
// Keyed by a common identifier (e.g., the abbreviation) for easy lookup.
const DEPARTMENT_MAPPING: Record<
  string,
  { name: string; abbreviation: string }
> = {
  CE: { name: 'Computer Engineering', abbreviation: 'CE' },
  IT: { name: 'Information Technology', abbreviation: 'IT' },
  EC: { name: 'Electronics & Communication Engineering', abbreviation: 'EC' },
  MECH: { name: 'Mechanical Engineering', abbreviation: 'MECH' },
  CIVIL: { name: 'Civil Engineering', abbreviation: 'CIVIL' },
  AUTO: { name: 'Automobile Engineering', abbreviation: 'AUTO' },
  EE: { name: 'Electrical Engineering', abbreviation: 'EE' },
};

class SubjectDataUploadService {
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
      return value.text?.toString() || '';
    }
    return value?.toString() || '';
  }

  /**
   * @dev Ensures the College record exists in the database and caches it.
   * This prevents repeated database queries for the same college during an upload.
   * @returns {Promise<College>} The College record.
   * @private
   */
  private async ensureCollege(): Promise<College> {
    let college = collegeCache.get(COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: COLLEGE_ID, isDeleted: false }, // Filter out soft-deleted colleges
        create: {
          id: COLLEGE_ID,
          name: 'LDRP Institute of Technology and Research',
          websiteUrl: 'https://ldrp.ac.in',
          address: 'Sector 15, Gandhinagar, Gujarat',
          contactNumber: '+91-79-23241492',
          logo: 'ldrp-logo.png',
          images: {}, // Assuming images is a JSON field or similar
          isDeleted: false, // Ensure new college is not soft-deleted
        },
        update: {}, // No specific update data needed if it exists
      });
      collegeCache.set(COLLEGE_ID, college);
    }
    return college;
  }

  /**
   * @dev Upserts (creates or updates) a Department record, using a canonical mapping.
   * Caches the result for subsequent lookups.
   * @param deptAbbreviationInput The abbreviation or name from the Excel file.
   * @param collegeId The ID of the associated college.
   * @returns {Promise<Department>} The Department record.
   * @private
   * @throws AppError if the department cannot be created or found.
   */
  private async upsertDepartment(
    deptAbbreviationInput: string,
    collegeId: string
  ): Promise<Department> {
    let department = departmentCache.get(deptAbbreviationInput); // Try to get from cache using original input string
    let canonicalDept: { name: string; abbreviation: string } | undefined;

    if (department) return department; // Return from cache if found

    // Attempt to find canonical department details from our mapping
    canonicalDept = DEPARTMENT_MAPPING[deptAbbreviationInput.toUpperCase()]; // Use uppercase for map key lookup

    if (!canonicalDept) {
      // If not found as an abbreviation, check if it's a full name
      for (const key in DEPARTMENT_MAPPING) {
        if (
          DEPARTMENT_MAPPING[key].name.toLowerCase() ===
          deptAbbreviationInput.toLowerCase()
        ) {
          canonicalDept = DEPARTMENT_MAPPING[key];
          break;
        }
      }
    }

    if (!canonicalDept) {
      // If still not found in our predefined map, use the input as is, but warn
      console.warn(
        `Department '${deptAbbreviationInput}' not found in predefined mapping. Using input as canonical.`
      );
      canonicalDept = {
        name: deptAbbreviationInput,
        abbreviation: deptAbbreviationInput,
      }; // Fallback to using input as both
    }

    // Now, use the canonical name and abbreviation for database operations
    department = await prisma.department.upsert({
      where: {
        name_collegeId: {
          // Use the canonical name for the unique constraint
          name: canonicalDept.name,
          collegeId: collegeId,
        },
        isDeleted: false, // Only consider non-soft-deleted departments
      },
      create: {
        name: canonicalDept.name,
        abbreviation: canonicalDept.abbreviation,
        hodName: `HOD of ${canonicalDept.name}`, // Placeholder HOD name
        hodEmail: `hod.${canonicalDept.abbreviation.toLowerCase()}@ldrp.ac.in`, // Placeholder HOD email
        collegeId: collegeId,
        isDeleted: false, // Ensure new department is not soft-deleted
      },
      update: {
        // Ensure existing department's name and abbreviation are updated to canonical form
        name: canonicalDept.name,
        abbreviation: canonicalDept.abbreviation,
      },
    });

    if (!department) {
      throw new AppError(
        `Department '${deptAbbreviationInput}' could not be created or found.`,
        500
      );
    }

    departmentCache.set(deptAbbreviationInput, department); // Cache using the original input string for future lookups in this request
    return department;
  }

  /**
   * @dev Finds or creates the AcademicYear record in the database and caches it.
   * If the academic year doesn't exist, it will be created automatically.
   * @param {string} yearString - The academic year string (e.g., "2024-2025").
   * @returns {Promise<AcademicYear>} The AcademicYear record.
   * @private
   */
  private async findOrCreateAcademicYear(
    yearString: string
  ): Promise<AcademicYear> {
    // Explicitly type academicYear to allow null or undefined from cache/findFirst
    let academicYear: AcademicYear | null | undefined =
      academicYearCache.get(yearString);
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: { yearString: yearString, isDeleted: false }, // Only consider non-soft-deleted academic years
    });

    if (!academicYear) {
      // Create the academic year if it doesn't exist
      console.log(
        `Academic Year '${yearString}' not found. Creating it automatically.`
      );

      // Find any existing active academic year
      const existingActiveYear = await prisma.academicYear.findFirst({
        where: {
          isActive: true,
          isDeleted: false,
        },
      });

      // If there's an active year, deactivate it first
      if (existingActiveYear) {
        await prisma.academicYear.update({
          where: { id: existingActiveYear.id },
          data: { isActive: false },
        });
        console.log(
          `Deactivated previous active academic year: ${existingActiveYear.yearString}`
        );
      }

      // Create the new academic year
      academicYear = await prisma.academicYear.create({
        data: {
          yearString: yearString,
          isActive: true, // Set as active by default
          isDeleted: false,
        },
      });

      console.log(`Academic Year '${yearString}' created successfully.`);
    }

    academicYearCache.set(yearString, academicYear);
    return academicYear;
  }

  /**
   * @dev Upserts a Semester record. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param semesterNumber The semester number.
   * @param academicYearId The ID of the associated academic year.
   * @param semesterType The type of semester (ODD/EVEN).
   * @returns {Promise<Semester>} The Semester record.
   * @private
   */
  private async upsertSemester(
    departmentId: string,
    semesterNumber: number,
    academicYearId: string,
    semesterType: SemesterTypeEnum
  ): Promise<Semester> {
    const semesterKey = `${departmentId}_${semesterNumber}_${academicYearId}_${semesterType}`;
    let semester = semesterCache.get(semesterKey);
    if (semester) return semester;

    semester = await prisma.semester.upsert({
      where: {
        departmentId_semesterNumber_academicYearId_semesterType: {
          departmentId: departmentId,
          semesterNumber: semesterNumber,
          academicYearId: academicYearId,
          semesterType: semesterType,
        },
        isDeleted: false, // Only consider non-soft-deleted semesters
      },
      create: {
        departmentId: departmentId,
        semesterNumber: semesterNumber,
        academicYearId: academicYearId,
        semesterType: semesterType,
        isDeleted: false,
      },
      update: {
        semesterType: semesterType, // Ensure consistency
      },
    });
    semesterCache.set(semesterKey, semester);
    return semester;
  }

  /**
   * @description Processes an Excel file containing subject data,
   * creating or updating subject records and related academic entities.
   * @param fileBuffer The buffer of the uploaded Excel file.
   * @returns {Promise<{ message: string; addedRows: number; updatedRows: number; unchangedRows: number; skippedRows: number; skippedRowsDetails: string[]; }>}
   * A summary of the processing results.
   * @throws AppError if file processing fails or essential data is missing.
   */
  public async processSubjectData(fileBuffer: Buffer): Promise<{
    message: string;
    rowsAffected: number;
  }> {
    let addedRows = 0;
    let updatedRows = 0;
    let unchangedRows = 0;
    let skippedRows = 0;
    const skippedRowsDetails: string[] = [];

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new AppError(
          'Invalid worksheet: Worksheet not found in the Excel file.',
          400
        );
      }

      // Clear caches at the beginning of the request to ensure fresh data
      collegeCache.clear();
      departmentCache.clear();
      academicYearCache.clear();
      semesterCache.clear();

      // Ensure College exists (cached)
      const college = await this.ensureCollege();

      // First try to get active academic year
      let academicYear = await prisma.academicYear.findFirst({
        where: {
          isActive: true,
          isDeleted: false,
        },
      });

      // If no active year exists, create one based on current date
      if (!academicYear) {
        // Determine the current academic year string (e.g., "2024-2025")
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-indexed (Jan=0, Dec=11)
        let currentYear = now.getFullYear();
        // If current month is before August (0-6), assume previous academic year started in previous calendar year
        if (currentMonth < 7) {
          // Assuming academic year starts in August (month 7)
          currentYear = currentYear - 1;
        }
        const currentYearString = `${currentYear}-${currentYear + 1}`;

        academicYear = await this.findOrCreateAcademicYear(currentYearString);
      }
      // findOrCreateAcademicYear will create the academic year if it doesn't exist

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Extract raw cell values
        const rawData = {
          subjectName: this.getCellValue(row.getCell(2))?.trim() || '',
          subjectAbbreviation: this.getCellValue(row.getCell(3))?.trim() || '',
          subjectCode: this.getCellValue(row.getCell(4))?.trim() || '',
          semesterNumberStr: this.getCellValue(row.getCell(5))?.trim() || '',
          isElectiveStr:
            this.getCellValue(row.getCell(6))?.toUpperCase()?.trim() || '',
          deptAbbreviationInput:
            this.getCellValue(row.getCell(7))?.trim() || '',
        };

        // Validate row data using Zod
        const validationResult = subjectExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Subject Name: '${rawData.subjectName}', Dept: '${rawData.deptAbbreviationInput}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          skippedRows++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          subjectName,
          subjectAbbreviation,
          subjectCode,
          semesterNumberStr,
          isElectiveStr,
          deptAbbreviationInput,
        } = validatedData;

        const semesterNumber = parseInt(semesterNumberStr, 10); // Already validated by Zod refine

        // Determine SemesterTypeEnum (ODD/EVEN) based on semester number
        const semesterType: SemesterTypeEnum =
          semesterNumber % 2 !== 0
            ? SemesterTypeEnum.ODD
            : SemesterTypeEnum.EVEN;

        try {
          // Ensure Department exists or is upserted
          const department = await this.upsertDepartment(
            deptAbbreviationInput,
            college.id
          );

          // Ensure Semester exists or is upserted
          const semester = await this.upsertSemester(
            department.id,
            semesterNumber,
            academicYear.id,
            semesterType
          );

          // Determine SubjectType
          const subjectType: SubjectType =
            isElectiveStr === 'TRUE'
              ? SubjectType.ELECTIVE
              : SubjectType.MANDATORY;

          // Prepare New Subject Data
          // IMPORTANT: Do NOT include departmentId and semesterId directly here
          // when using nested `connect` operations below.
          const newSubjectData = {
            name: subjectName,
            abbreviation: subjectAbbreviation,
            subjectCode: subjectCode,
            type: subjectType,
            // departmentId: department.id, // REMOVED: Handled by nested connect
            // semesterId: semester.id, // REMOVED: Handled by nested connect
          };

          // Find Existing Subject and Compare (with soft-delete filter)
          // Subject is unique by departmentId and abbreviation
          const existingSubject = await prisma.subject.findUnique({
            where: {
              departmentId_abbreviation: {
                departmentId: department.id, // Use department.id for lookup
                abbreviation: newSubjectData.abbreviation,
              },
              isDeleted: false, // Only consider non-soft-deleted subjects
            },
            select: {
              id: true,
              name: true,
              abbreviation: true,
              subjectCode: true,
              type: true,
              departmentId: true,
              semesterId: true,
            },
          });

          if (existingSubject) {
            // Normalize existing data for comparison (trim strings)
            const existingNormalizedData = {
              name: existingSubject.name?.trim() || '',
              abbreviation: existingSubject.abbreviation?.trim() || '',
              subjectCode: existingSubject.subjectCode?.trim() || '',
              type: existingSubject.type,
              departmentId: existingSubject.departmentId,
              semesterId: existingSubject.semesterId,
            };

            // Compare fields to determine if a change occurred
            const isChanged =
              existingNormalizedData.name !== newSubjectData.name ||
              existingNormalizedData.subjectCode !==
                newSubjectData.subjectCode ||
              existingNormalizedData.type !== newSubjectData.type ||
              existingNormalizedData.semesterId !== semester.id; // Compare with the ID of the resolved semester

            if (isChanged) {
              await prisma.subject.update({
                where: {
                  id: existingSubject.id,
                },
                data: {
                  name: newSubjectData.name,
                  subjectCode: newSubjectData.subjectCode,
                  type: newSubjectData.type,
                  semester: { connect: { id: semester.id } }, // Update the semester association
                  isDeleted: false,
                },
              });
              updatedRows++;
            } else {
              unchangedRows++;
            }
          } else {
            // Create new subject
            await prisma.subject.create({
              data: {
                ...newSubjectData,
                department: { connect: { id: department.id } }, // Connect to department
                semester: { connect: { id: semester.id } }, // Connect to semester
                isDeleted: false,
              },
            });
            addedRows++;
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Subject '${subjectName}', Dept: '${deptAbbreviationInput}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          skippedRows++;
        }
      }

      return {
        message: 'Subject data import complete.',
        rowsAffected: addedRows + updatedRows,
      };
    } catch (error: any) {
      console.error(
        'Error in SubjectDataUploadService.processSubjectData:',
        error
      );
      throw new AppError(
        error.message || 'Error processing subject data.',
        500
      );
    } finally {
      // Clear all caches after processing to free up memory.
      collegeCache.clear();
      departmentCache.clear();
      academicYearCache.clear();
      semesterCache.clear();
    }
  }
}

export const subjectDataUploadService = new SubjectDataUploadService();
