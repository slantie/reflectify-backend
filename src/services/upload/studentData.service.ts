// src/services/upload/studentData.service.ts

import {
  Prisma,
  SemesterTypeEnum,
  College,
  Department,
  AcademicYear,
  Semester,
  Division,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError
import { studentExcelRowSchema } from '../../utils/validators/upload.validation'; // Import Zod schema

// Caches to reduce database lookups for frequently accessed entities during a single upload operation
const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();
const academicYearCache = new Map<string, AcademicYear>();
const semesterCache = new Map<string, Semester>();
const divisionCache = new Map<string, Division>();

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
  // Add any other departments here
};

class StudentDataUploadService {
  private COLLEGE_ID = 'LDRP-ITR'; // Assuming this is a constant for your college

  /**
   * @dev Ensures the College record exists in the database and caches it.
   * This prevents repeated database queries for the same college during an upload.
   * @returns {Promise<College>} The College record.
   * @private
   */
  private async ensureCollege(): Promise<College> {
    let college = collegeCache.get(this.COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: this.COLLEGE_ID, isDeleted: false }, // Filter out soft-deleted colleges
        create: {
          id: this.COLLEGE_ID,
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
      collegeCache.set(this.COLLEGE_ID, college);
    }
    return college;
  }

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
    let department = departmentCache.get(deptAbbreviationInput);
    if (department) return department;

    let canonicalDept: { name: string; abbreviation: string } | undefined;

    // Attempt to find canonical department details from our mapping by abbreviation or name
    canonicalDept = DEPARTMENT_MAPPING[deptAbbreviationInput.toUpperCase()];
    if (!canonicalDept) {
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
      // If not found in mapping, use input as canonical (with a warning)
      console.warn(
        `Department '${deptAbbreviationInput}' not found in predefined mapping. Using input as canonical.`
      );
      canonicalDept = {
        name: deptAbbreviationInput,
        abbreviation: deptAbbreviationInput,
      };
    }

    department = await prisma.department.upsert({
      where: {
        name_collegeId: {
          name: canonicalDept.name,
          collegeId: collegeId,
        },
        isDeleted: false, // Only consider non-soft-deleted departments
      },
      create: {
        name: canonicalDept.name,
        abbreviation: canonicalDept.abbreviation,
        hodName: `HOD of ${canonicalDept.name}`, // Placeholder
        hodEmail: `hod.${canonicalDept.abbreviation.toLowerCase()}@ldrp.ac.in`, // Placeholder
        collegeId: collegeId,
        isDeleted: false, // Ensure new department is not soft-deleted
      },
      update: {
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

    departmentCache.set(deptAbbreviationInput, department);
    return department;
  }

  /**
   * @dev Finds an AcademicYear record by its year string and handles activation.
   * Caches the result.
   * @param academicYearString The year string (e.g., "2023-2024").
   * @returns {Promise<AcademicYear>} The AcademicYear record.
   * @private
   * @throws AppError if the academic year is not found.
   */
  private async findAcademicYear(
    academicYearString: string
  ): Promise<AcademicYear> {
    // Explicitly type academicYear to allow null as findFirst can return null
    let academicYear: AcademicYear | null =
      academicYearCache.get(academicYearString) || null;
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: {
        yearString: academicYearString,
        isDeleted: false, // Only consider non-soft-deleted academic years
      },
    });

    if (!academicYear) {
      throw new AppError(
        `Academic Year '${academicYearString}' not found. Please create it first via the Academic Year management API.`,
        400
      );
    }

    // --- Academic Year Activation Logic ---
    // If the academic year found/used for this student is not currently active, make it active.
    // And deactivate any other currently active academic year.
    if (!academicYear.isActive) {
      await prisma.$transaction(async (tx) => {
        const currentActiveYear = await tx.academicYear.findFirst({
          where: { isActive: true, isDeleted: false },
        });

        if (currentActiveYear && currentActiveYear.id !== academicYear!.id) {
          await tx.academicYear.update({
            where: { id: currentActiveYear.id },
            data: { isActive: false },
          });
          console.log(
            `Deactivated previous active Academic Year: ${currentActiveYear.yearString}`
          );
        }

        await tx.academicYear.update({
          where: { id: academicYear!.id },
          data: { isActive: true },
        });
        console.log(`Activated Academic Year: ${academicYear!.yearString}`);
        // Update the cached object to reflect its new active status
        academicYear!.isActive = true;
      });
    }

    academicYearCache.set(academicYearString, academicYear);
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
   * @dev Upserts a Division record. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param divisionName The name of the division.
   * @param semesterId The ID of the associated semester.
   * @returns {Promise<Division>} The Division record.
   * @private
   */
  private async upsertDivision(
    departmentId: string,
    divisionName: string,
    semesterId: string
  ): Promise<Division> {
    const divisionKey = `${departmentId}_${divisionName}_${semesterId}`;
    let division = divisionCache.get(divisionKey);
    if (division) return division;

    division = await prisma.division.upsert({
      where: {
        departmentId_divisionName_semesterId: {
          departmentId: departmentId,
          divisionName: divisionName,
          semesterId: semesterId,
        },
        isDeleted: false, // Only consider non-soft-deleted divisions
      },
      create: {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionName: divisionName,
        studentCount: 0, // Initial count
        isDeleted: false,
      },
      update: {}, // No specific update needed if found
    });
    divisionCache.set(divisionKey, division);
    return division;
  }

  /**
   * @description Processes an Excel file containing student data,
   * creating or updating student records and related academic entities.
   * @param fileBuffer The buffer of the uploaded Excel file.
   * @returns {Promise<{ message: string; rowsAffected: number;}>}
   * A summary of the processing results.
   * @throws AppError if file processing fails or essential data is missing.
   */
  public async processStudentData(fileBuffer: Buffer): Promise<{
    message: string;
    rowsAffected: number;
  }> {
    let skippedRowsDetails: string[] = [];
    let updatedRows = 0;
    let addedRows = 0;
    let skippedCount = 0;

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
      divisionCache.clear();

      // Ensure College exists once per upload
      const college = await this.ensureCollege();

      // Iterate over rows, starting from the second row (assuming first is header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Extract raw cell values
        const rawData = {
          studentName: this.getCellValue(row.getCell(2)),
          enrollmentNumber: this.getCellValue(row.getCell(3)),
          deptAbbreviation: this.getCellValue(row.getCell(4)),
          semesterNumber: parseInt(this.getCellValue(row.getCell(5))), // Parse here for Zod
          divisionName: this.getCellValue(row.getCell(6)),
          studentBatch: this.getCellValue(row.getCell(7)),
          email: this.getCellValue(row.getCell(8)),
          academicYearString: this.getCellValue(row.getCell(9)),
          intakeYear: this.getCellValue(row.getCell(10)),
        };

        // Validate row data using Zod
        const validationResult = studentExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Enrollment: '${rawData.enrollmentNumber}', Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          skippedCount++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          studentName,
          enrollmentNumber,
          deptAbbreviation,
          semesterNumber,
          divisionName,
          studentBatch,
          email,
          academicYearString,
          intakeYear,
        } = validatedData;

        // Determine SemesterTypeEnum (ODD/EVEN) based on semester number
        const semesterType: SemesterTypeEnum =
          semesterNumber % 2 !== 0
            ? SemesterTypeEnum.ODD
            : SemesterTypeEnum.EVEN;

        try {
          // Ensure related entities exist or are upserted
          const department = await this.upsertDepartment(
            deptAbbreviation,
            college.id
          );
          const academicYear = await this.findAcademicYear(academicYearString);
          const semester = await this.upsertSemester(
            department.id,
            semesterNumber,
            academicYear.id,
            semesterType
          );
          const division = await this.upsertDivision(
            department.id,
            divisionName,
            semester.id
          );

          // --- Student Processing Logic: Prioritize email for updates, handle enrollment conflicts ---
          let studentRecord = await prisma.student.findUnique({
            where: { email: email, isDeleted: false }, // Filter out soft-deleted students
          });

          if (studentRecord) {
            // Student record found by email, attempt to update it.
            const dataToUpdate: Prisma.StudentUpdateInput = {};
            let hasChanges = false;

            // Compare and prepare updates
            if (studentRecord.name !== studentName) {
              dataToUpdate.name = studentName;
              hasChanges = true;
            }
            if (studentRecord.phoneNumber !== email) {
              dataToUpdate.phoneNumber = email;
              hasChanges = true;
            } // Assuming phoneNumber can be updated to email
            if (studentRecord.academicYearId !== academicYear.id) {
              dataToUpdate.academicYear = { connect: { id: academicYear.id } };
              hasChanges = true;
            }
            if (studentRecord.batch !== studentBatch) {
              dataToUpdate.batch = studentBatch;
              hasChanges = true;
            }
            if (studentRecord.intakeYear !== intakeYear) {
              dataToUpdate.intakeYear = intakeYear;
              hasChanges = true;
            }
            if (studentRecord.departmentId !== department.id) {
              dataToUpdate.department = { connect: { id: department.id } };
              hasChanges = true;
            }
            if (studentRecord.semesterId !== semester.id) {
              dataToUpdate.semester = { connect: { id: semester.id } };
              hasChanges = true;
            }
            if (studentRecord.divisionId !== division.id) {
              dataToUpdate.division = { connect: { id: division.id } };
              hasChanges = true;
            }

            // Handle enrollment number changes and conflicts carefully
            if (studentRecord.enrollmentNumber !== enrollmentNumber) {
              const existingStudentWithNewEnrollmentNumber =
                await prisma.student.findUnique({
                  where: {
                    enrollmentNumber: enrollmentNumber,
                    isDeleted: false,
                  }, // Check only non-soft-deleted
                });

              if (
                existingStudentWithNewEnrollmentNumber &&
                existingStudentWithNewEnrollmentNumber.id !== studentRecord.id
              ) {
                const message = `Row ${rowNumber}: Skipping update for student with email '${email}': New enrollment number '${enrollmentNumber}' is already taken by another active student (ID: ${existingStudentWithNewEnrollmentNumber.id}).`;
                console.warn(message);
                skippedRowsDetails.push(message);
                skippedCount++;
                continue;
              }
              dataToUpdate.enrollmentNumber = enrollmentNumber;
              hasChanges = true;
            }

            if (hasChanges) {
              await prisma.student.update({
                where: { id: studentRecord.id },
                data: dataToUpdate,
              });
              updatedRows++;
            }
          } else {
            // Student record not found by email. Now, check if the enrollment number is already taken by an active student.
            const existingStudentByEnrollmentNumber =
              await prisma.student.findUnique({
                where: { enrollmentNumber: enrollmentNumber, isDeleted: false },
              });

            if (existingStudentByEnrollmentNumber) {
              const message = `Row ${rowNumber}: Skipping creation for student with enrollment number '${enrollmentNumber}': This enrollment number is already taken by an active student (ID: ${existingStudentByEnrollmentNumber.id}, Email: ${existingStudentByEnrollmentNumber.email}), but the email '${email}' is new. Manual review needed.`;
              console.warn(message);
              skippedRowsDetails.push(message);
              skippedCount++;
              continue;
            }

            // Create a new student.
            await prisma.student.create({
              data: {
                name: studentName,
                enrollmentNumber: enrollmentNumber,
                email: email,
                phoneNumber: email, // Assuming phoneNumber can be set to email if not provided
                academicYear: { connect: { id: academicYear.id } },
                batch: studentBatch,
                intakeYear: intakeYear,
                department: { connect: { id: department.id } },
                semester: { connect: { id: semester.id } },
                division: { connect: { id: division.id } },
                isDeleted: false,
              },
            });
            addedRows++;
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Enrollment '${enrollmentNumber}', Email '${email}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          skippedCount++;
        }
      }

      return {
        message: 'Student data processing complete.',
        rowsAffected: addedRows + updatedRows,
      };
    } catch (error: any) {
      console.error(
        'Error in StudentDataUploadService.processStudentData:',
        error
      );
      throw new AppError(
        error.message || 'Error processing student data.',
        500
      );
    } finally {
      // Clear all caches after processing to free up memory.
      collegeCache.clear();
      departmentCache.clear();
      academicYearCache.clear();
      semesterCache.clear();
      divisionCache.clear();
    }
  }
}

export const studentDataUploadService = new StudentDataUploadService();
