import { prisma } from '../../config/database';

export class DepartmentsRepository {
  async findAll(organizationId?: string) {
    const departments = await prisma.department.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        _count: {
          select: {
            users: organizationId ? false : true,
            memberships: organizationId ? { where: { organizationId, isActive: true } } : false
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return departments.map((d: any) => ({
      ...d,
      _count: {
        users:
          organizationId && d._count?.memberships !== undefined
            ? d._count.memberships
            : d._count?.users || 0
      }
    }));
  }

  async findById(id: string, organizationId?: string) {
    const dept = await prisma.department.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        memberships: organizationId
          ? {
              where: { organizationId, isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profileImageUrl: true
                  }
                },
                role: { select: { name: true } }
              }
            }
          : false,
        users: !organizationId
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true,
                profileImageUrl: true,
                role: { select: { name: true } }
              }
            }
          : false,
        _count: {
          select: {
            users: organizationId ? false : true,
            memberships: organizationId ? { where: { organizationId, isActive: true } } : false
          }
        }
      }
    });

    if (!dept) return null;

    const users =
      organizationId && (dept as any).memberships
        ? (dept as any).memberships.map((m: any) => ({
            id: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            position: m.position,
            profileImageUrl: m.user.profileImageUrl,
            role: m.role ? { name: m.role.name } : null
          }))
        : (dept as any).users || [];

    return {
      ...dept,
      users,
      _count: {
        users:
          organizationId && (dept as any)._count?.memberships !== undefined
            ? (dept as any)._count.memberships
            : (dept as any)._count?.users || 0
      }
    };
  }

  async create(data: { name: string; description?: string | null; organizationId?: string }) {
    return prisma.department.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        organizationId: data.organizationId || null,
        isActive: true
      }
    });
  }

  async update(id: string, data: { name?: string; description?: string | null; isActive?: boolean }) {
    return prisma.department.update({
      where: { id },
      data
    });
  }
}

export const departmentsRepository = new DepartmentsRepository();
