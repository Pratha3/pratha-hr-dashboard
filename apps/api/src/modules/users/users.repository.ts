import { prisma } from '../../config/database';
import { Prisma, User, EmployeeStatus } from '@prisma/client';
import { UserQueryInput } from '@ems/validation';

export class UsersRepository {
  async findUsers(params: UserQueryInput & { organizationId?: string }) {
    const {
      page = 1,
      limit = 10,
      search,
      departmentId,
      status,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      organizationId
    } = params;

    const skip = (page - 1) * limit;
    const cleanSearch = search?.trim();

    let where: Prisma.UserWhereInput;

    if (organizationId) {
      where = {
        memberships: {
          some: {
            organizationId,
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
              : {})
          }
        },
        ...(cleanSearch
          ? {
              OR: [
                { firstName: { contains: cleanSearch, mode: 'insensitive' } },
                { lastName: { contains: cleanSearch, mode: 'insensitive' } },
                { email: { contains: cleanSearch, mode: 'insensitive' } },
                {
                  memberships: {
                    some: {
                      organizationId,
                      OR: [
                        { employeeCode: { contains: cleanSearch, mode: 'insensitive' } },
                        { position: { contains: cleanSearch, mode: 'insensitive' } }
                      ]
                    }
                  }
                },
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
    } else {
      where = {
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
    }

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
          },
          memberships: organizationId
            ? {
                where: {
                  organizationId,
                  ...(isActive !== undefined ? { isActive } : {})
                },
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      description: true
                    }
                  },
                  department: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            : false
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

  async findUserById(id: string, organizationId?: string) {
    return prisma.user.findFirst({
      where: {
        id,
        ...(organizationId
          ? {
              memberships: {
                some: {
                  organizationId
                }
              }
            }
          : {})
      },
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
        },
        memberships: organizationId
          ? {
              where: { organizationId },
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                },
                department: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          : false
      }
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async findUserByEmployeeCode(employeeCode: string, organizationId?: string) {
    if (organizationId) {
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          employeeCode,
          isActive: true
        },
        include: { user: true }
      });
      return membership?.user || null;
    }

    return prisma.user.findFirst({
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

  async getAllRoles(organizationId?: string) {
    return prisma.role.findMany({
      where: organizationId
        ? {
            OR: [
              { isSystem: true },
              { organizationId }
            ]
          }
        : undefined,
      orderBy: { name: 'asc' }
    });
  }

  async getAllDepartments(organizationId?: string) {
    return prisma.department.findMany({
      where: {
        isActive: true,
        ...(organizationId ? { organizationId } : {})
      },
      orderBy: { name: 'asc' }
    });
  }
}

export const usersRepository = new UsersRepository();
