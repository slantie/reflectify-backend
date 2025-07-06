/**
 * @file src/services/upload/facultyData.service.ts
 * @description Service layer for handling faculty data upload and processing from Excel files.
 * It manages department and faculty record creation/updates, including HOD assignments.
 */

import ExcelJS from 'exceljs';
import { Designation, College, Department } from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError
import { facultyExcelRowSchema } from '../../utils/validators/upload.validation'; // Import Zod schema

// Caches to reduce database lookups for frequently accessed entities during a single upload operation
const COLLEGE_ID = 'LDRP-ITR'; // Assuming this is a constant for your college
const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();
// No need for facultyCache here as we're doing findUnique for each faculty, not batch lookups

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

class FacultyDataUploadService {
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
   * @dev Extracts the string, number, or Date value from an ExcelJS cell, handling rich text and hyperlinks.
   * Returns null for empty or undefined cells.
   * @param {ExcelJS.Cell} cell - The ExcelJS cell object.
   * @returns {string | number | Date | null} The value of the cell, or null if empty/undefined.
   * @private
   */
  private getCellValue(cell: ExcelJS.Cell): string | number | Date | null {
    const value = cell.value;

    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && 'hyperlink' in value && 'text' in value) {
      return value.text?.toString() || null; // Return null if text is empty for hyperlink cells
    }

    if (typeof value === 'number') {
      return value;
    }

    return value.toString();
  }

  /**
   * @dev Formats a Date object to a YYYY-MM-DD string for consistent comparison.
   * @param {Date | null} date - The date to format.
   * @returns {string} The formatted date string, or an empty string if null/invalid.
   * @private
   */
  private formatDateToYYYYMMDD(date: Date | null): string {
    if (!date) return '';
    try {
      const d = new Date(date); // Ensure it's a valid Date object
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date:', date, e);
      return '';
    }
  }

  /**
   * @dev Parses a date string in DD-MM-YYYY or DD/MM/YYYY format into a Date object.
   * @param {string} dateString - The date string to parse.
   * @returns {Date | null} The parsed Date object, or null if invalid.
   * @private
   */
  private parseDDMMYYYY(dateString: string): Date | null {
    if (!dateString) return null;

    const normalizedDateString = dateString.replace(/\//g, '-');
    const parts = normalizedDateString.split('-');

    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript Date
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        // Validate if the parsed date components match the input to prevent invalid date conversions
        if (
          date.getDate() === day &&
          date.getMonth() === month &&
          date.getFullYear() === year
        ) {
          return date;
        }
      }
    }
    return null;
  }

  /**
   * @dev Upserts (creates or updates) a Department record, using a canonical mapping.
   * Caches the result for subsequent lookups.
   * @param deptInput The abbreviation or name from the Excel file.
   * @param collegeId The ID of the associated college.
   * @returns {Promise<Department>} The Department record.
   * @private
   * @throws AppError if the department cannot be created or found.
   */
  private async upsertDepartment(
    deptInput: string,
    collegeId: string
  ): Promise<Department> {
    let department = departmentCache.get(deptInput); // Try to get from cache using original input string
    let canonicalDept: { name: string; abbreviation: string } | undefined;

    if (department) return department; // Return from cache if found

    // Attempt to find canonical department details from our mapping
    canonicalDept = DEPARTMENT_MAPPING[deptInput.toUpperCase()]; // Use uppercase for map key lookup

    if (!canonicalDept) {
      // If not found as an abbreviation, check if it's a full name
      for (const key in DEPARTMENT_MAPPING) {
        if (
          DEPARTMENT_MAPPING[key].name.toLowerCase() === deptInput.toLowerCase()
        ) {
          canonicalDept = DEPARTMENT_MAPPING[key];
          break;
        }
      }
    }

    if (!canonicalDept) {
      // If still not found in our predefined map, use the input as is, but warn
      console.warn(
        `Department '${deptInput}' not found in predefined mapping. Using input as canonical.`
      );
      canonicalDept = { name: deptInput, abbreviation: deptInput }; // Fallback to using input as both
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
        `Department '${deptInput}' could not be created or found.`,
        500
      );
    }

    departmentCache.set(deptInput, department); // Cache using the original input string for future lookups in this request
    return department;
  }

  /**
   * @description Processes an Excel file containing faculty data,
   * creating or updating faculty records and related department entities.
   * @param fileBuffer The buffer of the uploaded Excel file.
   * @returns {Promise<{ message: string; addedRows: number; updatedRows: number; unchangedRows: number; skippedRows: number; skippedRowsDetails: string[]; }>}
   * A summary of the processing results.
   * @throws AppError if file processing fails or essential data is missing.
   */
  public async processFacultyData(fileBuffer: Buffer): Promise<{
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

      // Ensure College exists once per upload
      const college = await this.ensureCollege();

      // Iterate over rows, starting from the second row (assuming first is header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Extract raw cell values
        const rawData = {
          name: this.getCellValue(row.getCell(2))?.toString()?.trim() || '', // Column B
          email:
            this.getCellValue(row.getCell(3))
              ?.toString()
              ?.trim()
              ?.toLowerCase() || '', // Column C - IMPORTANT: Normalize to lowercase
          facultyAbbreviation:
            this.getCellValue(row.getCell(4))?.toString()?.trim() || null, // Abbreviation (Column D)
          designationString:
            this.getCellValue(row.getCell(5))?.toString()?.trim() || '', // Designation (Column E)
          deptInput:
            this.getCellValue(row.getCell(6))?.toString()?.trim() || '', // Department (Column F)
          joiningDate: this.getCellValue(row.getCell(7)), // Joining Date (Column G)
        };

        // Validate row data using Zod
        const validationResult = facultyExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Faculty Name: '${rawData.name}', Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          skippedRows++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          name,
          email,
          facultyAbbreviation,
          designationString,
          deptInput,
          joiningDate: rawJoiningDateValue, // Renamed for clarity
        } = validatedData;

        // Map Designation String to Enum
        let facultyDesignation: Designation;
        const lowerCaseDesignation = designationString.toLowerCase();
        switch (lowerCaseDesignation) {
          case 'hod':
          case 'head of department':
            facultyDesignation = Designation.HOD;
            break;
          case 'asstprof':
          case 'assistant professor':
            facultyDesignation = Designation.AsstProf;
            break;
          case 'labasst':
          case 'lab assistant':
            facultyDesignation = Designation.LabAsst;
            break;
          default:
            // This case should ideally be caught by Zod's refine, but as a fallback
            const message = `Row ${rowNumber}: Unknown designation '${designationString}' for faculty '${name}'. Defaulting to AsstProf.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            facultyDesignation = Designation.AsstProf;
            break;
        }

        try {
          // Ensure department exists or is upserted
          const department = await this.upsertDepartment(deptInput, college.id);

          // Handle Joining Date Parsing
          let actualJoiningDate: Date | null = null;
          if (rawJoiningDateValue instanceof Date) {
            actualJoiningDate = rawJoiningDateValue;
          } else if (
            typeof rawJoiningDateValue === 'string' &&
            rawJoiningDateValue.trim() !== ''
          ) {
            const parsedDate = this.parseDDMMYYYY(rawJoiningDateValue.trim());
            if (parsedDate) {
              actualJoiningDate = parsedDate;
            } else {
              const message = `Row ${rowNumber}: Invalid Joining Date string format (Column G): '${rawJoiningDateValue}'. Expected DD-MM-YYYY or DD/MM/YYYY if not a standard date cell.`;
              console.warn(message);
              skippedRowsDetails.push(message);
              skippedRows++;
              continue;
            }
          }
          // If rawJoiningDateValue is null/undefined, actualJoiningDate remains null, which is fine.

          // Prepare data for Faculty upsert/create
          const newFacultyData = {
            name: name,
            email: email, // Use the normalized lowercase email
            abbreviation: facultyAbbreviation, // Store empty string as null for abbreviation
            designation: facultyDesignation, // Use the mapped enum value
            seatingLocation: `${department.name} Department`, // Derived from department
            joiningDate: actualJoiningDate, // Use the parsed Date object or null
            departmentId: department.id,
          };

          // --- Faculty Upsert/Update Logic (with soft-delete filter) ---
          const existingFaculty = await prisma.faculty.findUnique({
            where: { email: newFacultyData.email, isDeleted: false }, // Lookup by unique (normalized) email, filter out soft-deleted
            select: {
              id: true, // Need ID for update
              name: true,
              email: true,
              abbreviation: true,
              designation: true,
              seatingLocation: true,
              joiningDate: true,
              departmentId: true,
            },
          });

          if (existingFaculty) {
            // Normalize existing data for comparison (trim strings and lowercase email)
            const existingNormalizedData = {
              name: existingFaculty.name?.trim() || '',
              email: existingFaculty.email?.trim()?.toLowerCase() || '', // Normalize existing email
              abbreviation: existingFaculty.abbreviation || null, // Normalize null/undefined to null
              designation: existingFaculty.designation, // Enum value
              seatingLocation: existingFaculty.seatingLocation?.trim() || '',
              joiningDate: this.formatDateToYYYYMMDD(
                existingFaculty.joiningDate
              ),
              departmentId: existingFaculty.departmentId,
            };

            // Normalize new data from Excel for comparison
            const newNormalizedData = {
              name: newFacultyData.name,
              email: newFacultyData.email, // Already normalized
              abbreviation: newFacultyData.abbreviation, // Already normalized to null
              designation: newFacultyData.designation, // Enum value
              seatingLocation: newFacultyData.seatingLocation,
              joiningDate: this.formatDateToYYYYMMDD(
                newFacultyData.joiningDate
              ),
              departmentId: newFacultyData.departmentId,
            };

            // Compare individual fields to determine if an update is needed
            const isChanged =
              existingNormalizedData.name !== newNormalizedData.name ||
              existingNormalizedData.email !== newNormalizedData.email || // Compare normalized emails
              existingNormalizedData.abbreviation !==
                newNormalizedData.abbreviation ||
              existingNormalizedData.designation !==
                newNormalizedData.designation ||
              existingNormalizedData.seatingLocation !==
                newNormalizedData.seatingLocation ||
              existingNormalizedData.joiningDate !==
                newNormalizedData.joiningDate ||
              existingNormalizedData.departmentId !==
                newNormalizedData.departmentId;

            if (isChanged) {
              await prisma.faculty.update({
                where: { id: existingFaculty.id }, // Update by ID for robustness
                data: {
                  name: newFacultyData.name,
                  email: newFacultyData.email, // Store normalized email
                  abbreviation: newFacultyData.abbreviation, // Pass null if empty
                  designation: newFacultyData.designation, // Pass enum value
                  seatingLocation: newFacultyData.seatingLocation,
                  joiningDate: newFacultyData.joiningDate || undefined, // Send Date object or undefined for null
                  department: { connect: { id: newFacultyData.departmentId } }, // Connect to existing department
                  isDeleted: false, // Ensure it's not soft-deleted if it was for some reason
                },
              });
              updatedRows++;
            } else {
              unchangedRows++;
            }
          } else {
            // Create new faculty record
            await prisma.faculty.create({
              data: {
                name: newFacultyData.name,
                email: newFacultyData.email, // Store normalized email
                abbreviation: newFacultyData.abbreviation, // Pass null if empty
                designation: newFacultyData.designation, // Pass enum value
                seatingLocation: newFacultyData.seatingLocation,
                department: {
                  connect: { id: newFacultyData.departmentId }, // Connect to existing department
                },
                joiningDate: newFacultyData.joiningDate || undefined, // Pass Date object or undefined for null
                isDeleted: false, // Ensure new faculty is not soft-deleted
              },
            });
            addedRows++;
          }

          // --- Update HoD information if the current faculty is an HoD ---
          if (facultyDesignation === Designation.HOD) {
            // Fetch the department again with hodName and hodEmail to ensure latest state for comparison
            const currentDepartment = await prisma.department.findUnique({
              where: { id: department.id, isDeleted: false }, // Filter out soft-deleted departments
              select: { hodName: true, hodEmail: true },
            });

            if (
              currentDepartment &&
              (currentDepartment.hodName !== newFacultyData.name ||
                currentDepartment.hodEmail !== newFacultyData.email)
            ) {
              // Use a transaction for HOD update to ensure atomicity
              await prisma.$transaction(async (tx) => {
                await tx.department.update({
                  where: { id: department.id },
                  data: {
                    hodName: newFacultyData.name,
                    hodEmail: newFacultyData.email,
                  },
                });
              });
            }
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Faculty '${name}', Email '${email}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          skippedRows++;
        }
      }

      const rowsAffected = addedRows + updatedRows;
      console.log("Faculty rowsAffected:", rowsAffected);

      return {
        message: 'Faculty data import complete.',
        rowsAffected: rowsAffected, // Total rows affected (added + updated)
      };
    } catch (error: any) {
      console.error(
        'Error in FacultyDataUploadService.processFacultyData:',
        error
      );
      throw new AppError(
        error.message || 'Error processing faculty data.',
        500
      );
    } finally {
      // Clear all caches after processing to free up memory.
      collegeCache.clear();
      departmentCache.clear();
    }
  }
}

export const facultyDataUploadService = new FacultyDataUploadService();
