/**
 * @file src/services/department/department.service.ts
 * @description Service layer for Department operations.
 * Encapsulates business logic, interacts with the Prisma client, and manages a simple cache.
 */

import { Department } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import { collegeService } from '../college/college.service';
import AppError from '../../utils/appError';

const departmentCache = new Map<string, Department>();

interface DepartmentDataInput {
  name: string;
  abbreviation?: string;
  hodName?: string;
  hodEmail?: string;
  collegeId?: string;
}

class DepartmentService {
  // Retrieves all active departments including related data.
  public async getAllDepartments(): Promise<Department[]> {
    try {
      const departments = await prisma.department.findMany({
        where: {
          isDeleted: false,
          college: {
            isDeleted: false,
          },
        },
        include: {
          college: true,
          semesters: { where: { isDeleted: false } },
          Division: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          faculties: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
        },
      });
      return departments;
    } catch (error: any) {
      console.error('Error in DepartmentService.getAllDepartments:', error);
      throw new AppError('Failed to retrieve departments.', 500);
    }
  }

  // Creates a new department or updates an existing one.
  public async createDepartment(
    data: DepartmentDataInput
  ): Promise<Department> {
    const { name, abbreviation, hodName, hodEmail } = data;
    let { collegeId } = data;

    departmentCache.clear();

    if (!collegeId) {
      const primaryCollege = await collegeService.upsertPrimaryCollege({});
      collegeId = primaryCollege.id;
    } else {
      const existingCollege = await prisma.college.findUnique({
        where: { id: collegeId, isDeleted: false },
      });
      if (!existingCollege) {
        throw new AppError(
          'Provided college ID does not exist or is deleted.',
          400
        );
      }
    }

    const finalAbbreviation = abbreviation || name;
    const finalHodName = hodName || `HOD of ${name}`;
    const finalHodEmail =
      hodEmail || `hod.${name.toLowerCase().replace(/\s/g, '')}@ldrp.ac.in`;

    try {
      const department = await prisma.department.upsert({
        where: {
          name_collegeId: {
            name: name,
            collegeId: collegeId,
          },
        },
        create: {
          name: name,
          abbreviation: finalAbbreviation,
          hodName: finalHodName,
          hodEmail: finalHodEmail,
          collegeId: collegeId,
        },
        update: {
          abbreviation:
            abbreviation !== undefined ? abbreviation : finalAbbreviation,
          hodName: hodName !== undefined ? hodName : finalHodName,
          hodEmail: hodEmail !== undefined ? hodEmail : finalHodEmail,
        },
        include: {
          college: true,
          semesters: true,
          faculties: true,
          subjects: true,
          Division: true,
        },
      });

      departmentCache.set(name, department);
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.createDepartment:', error);
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('name_collegeId')
      ) {
        throw new AppError(
          'Department with this name already exists in the specified college.',
          409
        );
      }
      throw new AppError('Failed to create department.', 500);
    }
  }

  // Retrieves a single department by its ID, using cache.
  public async getDepartmentById(id: string): Promise<Department | null> {
    let department: Department | null | undefined = departmentCache.get(id);
    if (department) {
      return department;
    }

    try {
      department = await prisma.department.findUnique({
        where: {
          id: id,
          isDeleted: false,
          college: {
            isDeleted: false,
          },
        },
        include: {
          college: true,
          semesters: { where: { isDeleted: false } },
          Division: { where: { isDeleted: false } },
          subjects: { where: { isDeleted: false } },
          faculties: { where: { isDeleted: false } },
          students: { where: { isDeleted: false } },
        },
      });

      if (department) {
        departmentCache.set(id, department);
      }
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.getDepartmentById:', error);
      throw new AppError('Failed to retrieve department.', 500);
    }
  }

  // Updates an existing department.
  public async updateDepartment(
    id: string,
    data: Partial<DepartmentDataInput>
  ): Promise<Department> {
    try {
      departmentCache.clear();

      if (data.collegeId) {
        const existingCollege = await prisma.college.findUnique({
          where: { id: data.collegeId, isDeleted: false },
        });
        if (!existingCollege) {
          throw new AppError(
            'Provided college ID does not exist or is deleted.',
            400
          );
        }
      }

      const department = await prisma.department.update({
        where: { id: id, isDeleted: false },
        data: data,
        include: {
          college: true,
          semesters: true,
          faculties: true,
          subjects: true,
          Division: true,
        },
      });
      departmentCache.set(id, department);
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.updateDepartment:', error);
      if (error.code === 'P2025') {
        throw new AppError('Department not found for update.', 404);
      }
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('name_collegeId')
      ) {
        throw new AppError(
          'Department name already exists within this college.',
          409
        );
      }
      throw new AppError('Failed to update department.', 500);
    }
  }

  // Soft deletes a department.
  public async softDeleteDepartment(id: string): Promise<Department> {
    try {
      departmentCache.clear();

      const department = await prisma.department.update({
        where: { id: id, isDeleted: false },
        data: { isDeleted: true },
      });
      return department;
    } catch (error: any) {
      console.error('Error in DepartmentService.softDeleteDepartment:', error);
      if (error.code === 'P2025') {
        throw new AppError('Department not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete department.', 500);
    }
  }

  // Performs a batch creation of departments.
  public async batchCreateDepartments(
    departmentsData: DepartmentDataInput[]
  ): Promise<Department[]> {
    departmentCache.clear();

    const results: Department[] = [];
    const primaryCollege = await collegeService.upsertPrimaryCollege({});

    for (const dept of departmentsData) {
      const finalAbbreviation = dept.abbreviation || dept.name;
      const finalHodName = dept.hodName || `HOD of ${dept.name}`;
      const finalHodEmail =
        dept.hodEmail ||
        `hod.${dept.name.toLowerCase().replace(/\s/g, '')}@ldrp.ac.in`;

      try {
        const department = await prisma.department.upsert({
          where: {
            name_collegeId: {
              name: dept.name,
              collegeId: primaryCollege.id,
            },
          },
          create: {
            name: dept.name,
            abbreviation: finalAbbreviation,
            hodName: finalHodName,
            hodEmail: finalHodEmail,
            collegeId: primaryCollege.id,
          },
          update: {
            abbreviation:
              dept.abbreviation !== undefined
                ? dept.abbreviation
                : finalAbbreviation,
            hodName: dept.hodName !== undefined ? dept.hodName : finalHodName,
            hodEmail:
              dept.hodEmail !== undefined ? dept.hodEmail : finalHodEmail,
          },
          include: {
            college: true,
            semesters: true,
            faculties: true,
            subjects: true,
            Division: true,
          },
        });
        results.push(department);
      } catch (error: any) {
        console.error(
          `Error in batch creating department ${dept.name}:`,
          error
        );
        if (
          error.code === 'P2002' &&
          error.meta?.target?.includes('name_collegeId')
        ) {
          throw new AppError(
            `Department '${dept.name}' already exists in the primary college.`,
            409
          );
        }
        throw new AppError(
          `Failed to batch create department '${dept.name}'.`,
          500
        );
      }
    }
    return results;
  }
}

export const departmentService = new DepartmentService();
