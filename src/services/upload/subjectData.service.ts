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
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { subjectExcelRowSchema } from '../../utils/validators/upload.validation';

const COLLEGE_ID = 'LDRP-ITR';
const collegeCache = new Map<string, College>();
const departmentCache = new Map<string, Department>();
const academicYearCache = new Map<string, AcademicYear>();
const semesterCache = new Map<string, Semester>();

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

  // Upserts (creates or updates) a Department record, using a canonical mapping.
  private async upsertDepartment(
    deptAbbreviationInput: string,
    collegeId: string
  ): Promise<Department> {
    let department = departmentCache.get(deptAbbreviationInput);
    let canonicalDept: { name: string; abbreviation: string } | undefined;

    if (department) return department;

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

  // Finds or creates the AcademicYear record in the database and caches it.
  private async findOrCreateAcademicYear(
    yearString: string
  ): Promise<AcademicYear> {
    let academicYear: AcademicYear | null | undefined =
      academicYearCache.get(yearString);
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: { yearString: yearString, isDeleted: false },
    });

    if (!academicYear) {
      console.log(
        `Academic Year '${yearString}' not found. Creating it automatically.`
      );

      const existingActiveYear = await prisma.academicYear.findFirst({
        where: {
          isActive: true,
          isDeleted: false,
        },
      });

      if (existingActiveYear) {
        await prisma.academicYear.update({
          where: { id: existingActiveYear.id },
          data: { isActive: false },
        });
        console.log(
          `Deactivated previous active academic year: ${existingActiveYear.yearString}`
        );
      }

      academicYear = await prisma.academicYear.create({
        data: {
          yearString: yearString,
          isActive: true,
          isDeleted: false,
        },
      });

      console.log(`Academic Year '${yearString}' created successfully.`);
    }

    academicYearCache.set(yearString, academicYear);
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
        isDeleted: false,
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

  // Processes an Excel file containing subject data.
  public async processSubjectData(fileBuffer: Buffer): Promise<{
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
      academicYearCache.clear();
      semesterCache.clear();

      const college = await this.ensureCollege();

      let academicYear = await prisma.academicYear.findFirst({
        where: {
          isActive: true,
          isDeleted: false,
        },
      });

      if (!academicYear) {
        const now = new Date();
        const currentMonth = now.getMonth();
        let currentYear = now.getFullYear();
        if (currentMonth < 7) {
          currentYear = currentYear - 1;
        }
        const currentYearString = `${currentYear}-${currentYear + 1}`;

        academicYear = await this.findOrCreateAcademicYear(currentYearString);
      }

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

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

        const validationResult = subjectExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Subject Name: '${rawData.subjectName}', Dept: '${rawData.deptAbbreviationInput}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          _skippedRows++;
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

        const semesterNumber = parseInt(semesterNumberStr, 10);

        const semesterType: SemesterTypeEnum =
          semesterNumber % 2 !== 0
            ? SemesterTypeEnum.ODD
            : SemesterTypeEnum.EVEN;

        try {
          const department = await this.upsertDepartment(
            deptAbbreviationInput,
            college.id
          );

          const semester = await this.upsertSemester(
            department.id,
            semesterNumber,
            academicYear.id,
            semesterType
          );

          const subjectType: SubjectType =
            isElectiveStr === 'TRUE'
              ? SubjectType.ELECTIVE
              : SubjectType.MANDATORY;

          const newSubjectData = {
            name: subjectName,
            abbreviation: subjectAbbreviation,
            subjectCode: subjectCode,
            type: subjectType,
          };

          const existingSubject = await prisma.subject.findUnique({
            where: {
              departmentId_abbreviation: {
                departmentId: department.id,
                abbreviation: newSubjectData.abbreviation,
              },
              isDeleted: false,
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
            const existingNormalizedData = {
              name: existingSubject.name?.trim() || '',
              abbreviation: existingSubject.abbreviation?.trim() || '',
              subjectCode: existingSubject.subjectCode?.trim() || '',
              type: existingSubject.type,
              departmentId: existingSubject.departmentId,
              semesterId: existingSubject.semesterId,
            };

            const isChanged =
              existingNormalizedData.name !== newSubjectData.name ||
              existingNormalizedData.subjectCode !==
              newSubjectData.subjectCode ||
              existingNormalizedData.type !== newSubjectData.type ||
              existingNormalizedData.semesterId !== semester.id;

            if (isChanged) {
              await prisma.subject.update({
                where: {
                  id: existingSubject.id,
                },
                data: {
                  name: newSubjectData.name,
                  subjectCode: newSubjectData.subjectCode,
                  type: newSubjectData.type,
                  semester: { connect: { id: semester.id } },
                  isDeleted: false,
                },
              });
              updatedRows++;
            } else {
              _unchangedRows++;
            }
          } else {
            await prisma.subject.create({
              data: {
                ...newSubjectData,
                department: { connect: { id: department.id } },
                semester: { connect: { id: semester.id } },
                isDeleted: false,
              },
            });
            addedRows++;
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Subject '${subjectName}', Dept: '${deptAbbreviationInput}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          _skippedRows++;
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
      collegeCache.clear();
      departmentCache.clear();
      academicYearCache.clear();
      semesterCache.clear();
    }
  }
}

export const subjectDataUploadService = new SubjectDataUploadService();
