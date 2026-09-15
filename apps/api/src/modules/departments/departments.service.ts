import { departmentsRepository, DepartmentsRepository } from './departments.repository';
import { NotFoundError, ConflictError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';

export class DepartmentsService {
  constructor(private repo: DepartmentsRepository = departmentsRepository) {}

  async listDepartments(organizationId?: string) {
    return this.repo.findAll(organizationId);
  }

  async getDepartment(id: string, organizationId?: string) {
    const dept = await this.repo.findById(id, organizationId);
    if (!dept) throw new NotFoundError('Department not found');
    return dept;
  }

  async createDepartment(
    data: { name: string; description?: string | null },
    actorId?: string,
    organizationId?: string
  ) {
    try {
      const dept = await this.repo.create({
        name: data.name.trim(),
        description: data.description ? data.description.trim() : null,
        organizationId
      });

      await prisma.auditLog.create({
        data: {
          organizationId: organizationId || null,
          userId: actorId || null,
          action: 'DEPARTMENT_CREATED',
          entity: 'Department',
          entityId: dept.id,
          metadata: { name: dept.name, organizationId }
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
    actorId?: string,
    organizationId?: string
  ) {
    await this.getDepartment(id, organizationId);

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
          organizationId: organizationId || null,
          userId: actorId || null,
          action,
          entity: 'Department',
          entityId: id,
          metadata: { ...data, organizationId } as any
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

