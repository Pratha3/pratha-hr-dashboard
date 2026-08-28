import { departmentsRepository, DepartmentsRepository } from './departments.repository';
import { NotFoundError, ConflictError } from '../../common/errors/app-error';

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

  async createDepartment(data: { name: string; description?: string }) {
    try {
      return await this.repo.create(data);
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('A department with this name already exists');
      }
      throw err;
    }
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    await this.getDepartment(id);
    return this.repo.update(id, data);
  }
}

export const departmentsService = new DepartmentsService();
