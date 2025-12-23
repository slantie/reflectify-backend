/**
 * @file src/services/upload/studentData.service.ts
 * @description Service layer for handling student data upload and processing from Excel files.
 * It manages student record creation/updates and related academic entities.
 */

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
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { studentExcelRowSchema } from '../../utils/validators/upload.validation';

const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();
const academicYearCache = new Map<string, AcademicYear>();
const semesterCache = new Map<string, Semester>();
const divisionCache = new Map<string, Division>();

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

class StudentDataUploadService {
  private COLLEGE_ID = 'LDRP-ITR';

  // Ensures the College record exists in the database and caches it.
  private async ensureCollege(): Promise<College> {
    let college = collegeCache.get(this.COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: this.COLLEGE_ID, isDeleted: false },
        create: {
          id: this.COLLEGE_ID,
          name: 'LDRP Institute of Technology and Research',
          websiteUrl: 'https://ldrp.ac.in',
          address: 'Sector 15, Gandhinagar, Gujarat',
          contactNumber: '+91-79-23241492',
          isDeleted: false,
        },
        update: {},
      });
      collegeCache.set(this.COLLEGE_ID, college);
    }
    return college;
  }

  // Extracts the string value from an ExcelJS cell.
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

  // Upserts (creates or updates) a Department record, using a canonical mapping.
  private async upsertDepartment(
    deptAbbreviationInput: string,
    collegeId: string
  ): Promise<Department> {
    let department = departmentCache.get(deptAbbreviationInput);
    if (department) return department;

    let canonicalDept: { name: string; abbreviation: string } | undefined;

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
        `Department '${deptAbbreviationInput}' could not be created or found.`,
        500
      );
    }

    departmentCache.set(deptAbbreviationInput, department);
    return department;
  }

  // Finds an AcademicYear record by its year string and handles activation.
  private async findAcademicYear(
    academicYearString: string
  ): Promise<AcademicYear> {
    let academicYear: AcademicYear | null =
      academicYearCache.get(academicYearString) || null;
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: {
        yearString: academicYearString,
        isDeleted: false,
      },
    });

    if (!academicYear) {
      throw new AppError(
        `Academic Year '${academicYearString}' not found. Please create it first via the Academic Year management API.`,
        400
      );
    }

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
        academicYear!.isActive = true;
      });
    }

    academicYearCache.set(academicYearString, academicYear);
    return academicYear;
  }

  // Upserts a Semester record.
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
      },
      create: {
        departmentId: departmentId,
        semesterNumber: semesterNumber,
        academicYearId: academicYearId,
        semesterType: semesterType,
        isDeleted: false,
      },
      update: {
        semesterType: semesterType,
      },
    });
    semesterCache.set(semesterKey, semester);
    return semester;
  }

  // Upserts a Division record.
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
      },
      create: {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionName: divisionName,
        studentCount: 0,
        isDeleted: false,
      },
      update: {},
    });
    divisionCache.set(divisionKey, division);
    return division;
  }

  // Processes an Excel file containing student data.
  public async processStudentData(fileBuffer: Buffer): Promise<{
    message: string;
    rowsAffected: number;
  }> {
    let skippedRowsDetails: string[] = [];
    let updatedRows = 0;
    let addedRows = 0;
    let _skippedCount = 0;

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
      academicYearCache.clear();
      semesterCache.clear();
      divisionCache.clear();

      const college = await this.ensureCollege();

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        const rawData = {
          studentName: this.getCellValue(row.getCell(2)),
          enrollmentNumber: this.getCellValue(row.getCell(3)),
          deptAbbreviation: this.getCellValue(row.getCell(4)),
          semesterNumber: parseInt(this.getCellValue(row.getCell(5))),
          divisionName: this.getCellValue(row.getCell(6)),
          studentBatch: this.getCellValue(row.getCell(7)),
          email: this.getCellValue(row.getCell(8)),
          academicYearString: this.getCellValue(row.getCell(9)),
          intakeYear: this.getCellValue(row.getCell(10)),
        };

        const validationResult = studentExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Enrollment: '${rawData.enrollmentNumber}', Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          _skippedCount++;
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

        const semesterType: SemesterTypeEnum =
          semesterNumber % 2 !== 0
            ? SemesterTypeEnum.ODD
            : SemesterTypeEnum.EVEN;

        try {
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

          let studentRecord = await prisma.student.findUnique({
            where: { email: email, isDeleted: false },
          });

          if (studentRecord) {
            const dataToUpdate: Prisma.StudentUpdateInput = {};
            let hasChanges = false;

            if (studentRecord.name !== studentName) {
              dataToUpdate.name = studentName;
              hasChanges = true;
            }
            if (studentRecord.phoneNumber !== email) {
              dataToUpdate.phoneNumber = email;
              hasChanges = true;
            }
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

            if (studentRecord.enrollmentNumber !== enrollmentNumber) {
              const existingStudentWithNewEnrollmentNumber =
                await prisma.student.findUnique({
                  where: {
                    enrollmentNumber: enrollmentNumber,
                    isDeleted: false,
                  },
                });

              if (
                existingStudentWithNewEnrollmentNumber &&
                existingStudentWithNewEnrollmentNumber.id !== studentRecord.id
              ) {
                const message = `Row ${rowNumber}: Skipping update for student with email '${email}': New enrollment number '${enrollmentNumber}' is already taken by another active student (ID: ${existingStudentWithNewEnrollmentNumber.id}).`;
                console.warn(message);
                skippedRowsDetails.push(message);
                _skippedCount++;
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
            const existingStudentByEnrollmentNumber =
              await prisma.student.findUnique({
                where: { enrollmentNumber: enrollmentNumber, isDeleted: false },
              });

            if (existingStudentByEnrollmentNumber) {
              const message = `Row ${rowNumber}: Skipping creation for student with enrollment number '${enrollmentNumber}': This enrollment number is already taken by an active student (ID: ${existingStudentByEnrollmentNumber.id}, Email: ${existingStudentByEnrollmentNumber.email}), but the email '${email}' is new. Manual review needed.`;
              console.warn(message);
              skippedRowsDetails.push(message);
              _skippedCount++;
              continue;
            }

            await prisma.student.create({
              data: {
                name: studentName,
                enrollmentNumber: enrollmentNumber,
                email: email,
                phoneNumber: email,
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
          _skippedCount++;
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
      collegeCache.clear();
      departmentCache.clear();
      academicYearCache.clear();
      semesterCache.clear();
      divisionCache.clear();
    }
  }
}

export const studentDataUploadService = new StudentDataUploadService();
