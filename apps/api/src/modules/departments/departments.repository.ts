import { prisma } from '../../config/database';

export class DepartmentsRepository {
  async findAll() {
    return prisma.department.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            profileImageUrl: true,
            role: { select: { name: true } }
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });
  }

  async create(data: { name: string; description?: string }) {
    return prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: true
      }
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return prisma.department.update({
      where: { id },
      data
    });
  }
}

export const departmentsRepository = new DepartmentsRepository();
