/**
 * @file src/services/upload/facultyData.service.ts
 * @description Service layer for handling faculty data upload and processing from Excel files.
 * It manages department and faculty record creation/updates, including HOD assignments.
 */

import ExcelJS from 'exceljs';
import { Designation, College, Department } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { facultyExcelRowSchema } from '../../utils/validators/upload.validation';

const COLLEGE_ID = 'LDRP-ITR';
const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();

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

class FacultyDataUploadService {
  // Ensures the College record exists in the database and caches it.
  private async ensureCollege(): Promise<College> {
    let college = collegeCache.get(COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: COLLEGE_ID, isDeleted: false },
        create: {
          id: COLLEGE_ID,
          name: 'LDRP Institute of Technology and Research',
          websiteUrl: 'https://ldrp.ac.in',
          address: 'Sector 15, Gandhinagar, Gujarat',
          contactNumber: '+91-79-23241492',
          isDeleted: false,
        },
        update: {},
      });
      collegeCache.set(COLLEGE_ID, college);
    }
    return college;
  }

  // Extracts the string, number, or Date value from an ExcelJS cell.
  private getCellValue(cell: ExcelJS.Cell): string | number | Date | null {
    const value = cell.value;

    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && 'hyperlink' in value && 'text' in value) {
      return value.text?.toString() || null;
    }

    if (typeof value === 'number') {
      return value;
    }

    return value.toString();
  }

  // Formats a Date object to a YYYY-MM-DD string.
  private formatDateToYYYYMMDD(date: Date | null): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date:', date, e);
      return '';
    }
  }

  // Parses a date string in DD-MM-YYYY or DD/MM/YYYY format into a Date object.
  private parseDDMMYYYY(dateString: string): Date | null {
    if (!dateString) return null;

    const normalizedDateString = dateString.replace(/\//g, '-');
    const parts = normalizedDateString.split('-');

    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
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

  // Upserts (creates or updates) a Department record, using a canonical mapping.
  private async upsertDepartment(
    deptInput: string,
    collegeId: string
  ): Promise<Department> {
    let department = departmentCache.get(deptInput);
    let canonicalDept: { name: string; abbreviation: string } | undefined;

    if (department) return department;

    canonicalDept = DEPARTMENT_MAPPING[deptInput.toUpperCase()];

    if (!canonicalDept) {
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
      console.warn(
        `Department '${deptInput}' not found in predefined mapping. Using input as canonical.`
      );
      canonicalDept = { name: deptInput, abbreviation: deptInput };
    }

    department = await prisma.department.upsert({
      where: {
        name_collegeId: {
          name: canonicalDept.name,
          collegeId: collegeId,
        },
        isDeleted: false,
      },
      create: {
        name: canonicalDept.name,
        abbreviation: canonicalDept.abbreviation,
        hodName: `HOD of ${canonicalDept.name}`,
        hodEmail: `hod.${canonicalDept.abbreviation.toLowerCase()}@ldrp.ac.in`,
        collegeId: collegeId,
        isDeleted: false,
      },
      update: {
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

    departmentCache.set(deptInput, department);
    return department;
  }

  // Processes an Excel file containing faculty data.
  public async processFacultyData(fileBuffer: Buffer): Promise<{
    message: string;
    rowsAffected: number;
  }> {
    let addedRows = 0;
    let updatedRows = 0;
    let _unchangedRows = 0;
    let _skippedRows = 0;
    const skippedRowsDetails: string[] = [];

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new AppError(
          'Invalid worksheet: Worksheet not found in the Excel file.',
          400
        );
      }

      collegeCache.clear();
      departmentCache.clear();

      const college = await this.ensureCollege();

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        const rawData = {
          name: this.getCellValue(row.getCell(2))?.toString()?.trim() || '',
          email:
            this.getCellValue(row.getCell(3))
              ?.toString()
              ?.trim()
              ?.toLowerCase() || '',
          facultyAbbreviation:
            this.getCellValue(row.getCell(4))?.toString()?.trim() || null,
          designationString:
            this.getCellValue(row.getCell(5))?.toString()?.trim() || '',
          deptInput:
            this.getCellValue(row.getCell(6))?.toString()?.trim() || '',
          joiningDate: this.getCellValue(row.getCell(7)),
        };

        const validationResult = facultyExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Faculty Name: '${rawData.name}', Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          _skippedRows++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          name,
          email,
          facultyAbbreviation,
          designationString,
          deptInput,
          joiningDate: rawJoiningDateValue,
        } = validatedData;

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
            const message = `Row ${rowNumber}: Unknown designation '${designationString}' for faculty '${name}'. Defaulting to AsstProf.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            facultyDesignation = Designation.AsstProf;
            break;
        }

        try {
          const department = await this.upsertDepartment(deptInput, college.id);

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
              _skippedRows++;
              continue;
            }
          }

          const newFacultyData = {
            name: name,
            email: email,
            abbreviation: facultyAbbreviation,
            designation: facultyDesignation,
            seatingLocation: `${department.name} Department`,
            joiningDate: actualJoiningDate,
            departmentId: department.id,
          };

          const existingFaculty = await prisma.faculty.findUnique({
            where: { email: newFacultyData.email, isDeleted: false },
            select: {
              id: true,
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
            const existingNormalizedData = {
              name: existingFaculty.name?.trim() || '',
              email: existingFaculty.email?.trim()?.toLowerCase() || '',
              abbreviation: existingFaculty.abbreviation || null,
              designation: existingFaculty.designation,
              seatingLocation: existingFaculty.seatingLocation?.trim() || '',
              joiningDate: this.formatDateToYYYYMMDD(
                existingFaculty.joiningDate
              ),
              departmentId: existingFaculty.departmentId,
            };

            const newNormalizedData = {
              name: newFacultyData.name,
              email: newFacultyData.email,
              abbreviation: newFacultyData.abbreviation,
              designation: newFacultyData.designation,
              seatingLocation: newFacultyData.seatingLocation,
              joiningDate: this.formatDateToYYYYMMDD(
                newFacultyData.joiningDate
              ),
              departmentId: newFacultyData.departmentId,
            };

            const isChanged =
              existingNormalizedData.name !== newNormalizedData.name ||
              existingNormalizedData.email !== newNormalizedData.email ||
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
                where: { id: existingFaculty.id },
                data: {
                  name: newFacultyData.name,
                  email: newFacultyData.email,
                  abbreviation: newFacultyData.abbreviation,
                  designation: newFacultyData.designation,
                  seatingLocation: newFacultyData.seatingLocation,
                  joiningDate: newFacultyData.joiningDate || undefined,
                  department: { connect: { id: newFacultyData.departmentId } },
                  isDeleted: false,
                },
              });
              updatedRows++;
            } else {
              _unchangedRows++;
            }
          } else {
            await prisma.faculty.create({
              data: {
                name: newFacultyData.name,
                email: newFacultyData.email,
                abbreviation: newFacultyData.abbreviation,
                designation: newFacultyData.designation,
                seatingLocation: newFacultyData.seatingLocation,
                department: {
                  connect: { id: newFacultyData.departmentId },
                },
                joiningDate: newFacultyData.joiningDate || undefined,
                isDeleted: false,
              },
            });
            addedRows++;
          }

          if (facultyDesignation === Designation.HOD) {
            const currentDepartment = await prisma.department.findUnique({
              where: { id: department.id, isDeleted: false },
              select: { hodName: true, hodEmail: true },
            });

            if (
              currentDepartment &&
              (currentDepartment.hodName !== newFacultyData.name ||
                currentDepartment.hodEmail !== newFacultyData.email)
            ) {
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
          _skippedRows++;
        }
      }

      const rowsAffected = addedRows + updatedRows;
      console.log('Faculty rowsAffected:', rowsAffected);

      return {
        message: 'Faculty data import complete.',
        rowsAffected: rowsAffected,
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
      collegeCache.clear();
      departmentCache.clear();
    }
  }
}

export const facultyDataUploadService = new FacultyDataUploadService();
