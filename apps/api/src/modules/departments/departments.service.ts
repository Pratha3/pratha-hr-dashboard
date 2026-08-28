import { departmentsRepository, DepartmentsRepository } from './departments.repository';
import { NotFoundError, ConflictError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';

export class DepartmentsService {
  constructor(private repo: DepartmentsRepository = departmentsRepository) {}

  async listDepartments() {
    return this.repo.findAll();
  }

  async getDepartment(id: string) {
    const dept = await this.repo.findById(id);
    if (!dept) throw new NotFoundError('Department not found');
    return dept;
  }

  async createDepartment(data: { name: string; description?: string | null }, actorId?: string) {
    try {
      const dept = await this.repo.create({
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null
      });

      await prisma.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'DEPARTMENT_CREATED',
          entity: 'Department',
          entityId: dept.id,
          metadata: { name: dept.name }
        }
      });

      return dept;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A department with this name already exists');
      }
      throw err;
    }
  }

  async updateDepartment(
    id: string,
    data: { name?: string; description?: string | null; isActive?: boolean },
    actorId?: string
  ) {
    await this.getDepartment(id);

    try {
      const updated = await this.repo.update(id, {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
      });

      let action = 'DEPARTMENT_UPDATED';
      if (data.isActive !== undefined) {
        action = data.isActive ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED';
      }

      await prisma.auditLog.create({
        data: {
          userId: actorId || null,
          action,
          entity: 'Department',
          entityId: id,
          metadata: data as any
        }
      });

      return updated;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A department with this name already exists');
      }
      throw err;
    }
  }
}

export const departmentsService = new DepartmentsService();

