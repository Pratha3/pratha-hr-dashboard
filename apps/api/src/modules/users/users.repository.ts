import { prisma } from '../../config/database';
import { Prisma, User, EmployeeStatus } from '@prisma/client';
import { UserQueryInput } from '@ems/validation';

export class UsersRepository {
  async findUsers(params: UserQueryInput) {
    const {
      page = 1,
      limit = 10,
      search,
      departmentId,
      status,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const skip = (page - 1) * limit;

    const cleanSearch = search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { status: status as EmployeeStatus } : {}),
      ...(role
        ? {
            role: {
              name: {
                equals: role,
                mode: 'insensitive'
              }
            }
          }
        : {}),
      ...(cleanSearch
        ? {
            OR: [
              { firstName: { contains: cleanSearch, mode: 'insensitive' } },
              { lastName: { contains: cleanSearch, mode: 'insensitive' } },
              { email: { contains: cleanSearch, mode: 'insensitive' } },
              { employeeCode: { contains: cleanSearch, mode: 'insensitive' } },
              { position: { contains: cleanSearch, mode: 'insensitive' } },
              ...(cleanSearch.includes(' ')
                ? [
                    {
                      AND: cleanSearch.split(/\s+/).map((term) => ({
                        OR: [
                          { firstName: { contains: term, mode: 'insensitive' as const } },
                          { lastName: { contains: term, mode: 'insensitive' as const } }
                        ]
                      }))
                    }
                  ]
                : [])
            ]
          }
        : {})
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          department: {
            select: {
              id: true,
              name: true
            }
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      })
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async findUserByEmployeeCode(employeeCode: string) {
    return prisma.user.findUnique({
      where: { employeeCode }
    });
  }

  async createUser(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({
      data
    });
  }

  async updateUser(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id }
    });
  }

  async getAllRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getAllDepartments() {
    return prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }
}

export const usersRepository = new UsersRepository();
