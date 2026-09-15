import { prisma } from '../../config/database';
import { Prisma, Organization, OrganizationMembership } from '@prisma/client';

export class OrganizationsRepository {
  async createOrganization(data: {
    name: string;
    slug: string;
    domain?: string | null;
    createdById?: string;
  }): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain || null,
        createdById: data.createdById || null
      }
    });
  }

  async findOrganizationById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            memberships: true,
            departments: true,
            projects: true
          }
        }
      }
    });
  }

  async findOrganizationBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug }
    });
  }

  async findUserOrganizations(userId: string) {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId,
        isActive: true,
        organization: { isActive: true }
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                memberships: true,
                departments: true,
                projects: true
              }
            }
          }
        },
        role: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return memberships.map((m) => ({
      ...m.organization,
      userRole: m.role.name,
      membershipId: m.id
    }));
  }

  async updateOrganization(
    id: string,
    data: Prisma.OrganizationUpdateInput
  ): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data
    });
  }

  async createMembership(data: {
    organizationId: string;
    userId: string;
    roleId: string;
    position?: string | null;
    employeeCode?: string | null;
  }): Promise<OrganizationMembership> {
    return prisma.organizationMembership.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        roleId: data.roleId,
        position: data.position || null,
        employeeCode: data.employeeCode || null,
        status: 'ACTIVE',
        isActive: true
      }
    });
  }

  async findMembership(organizationId: string, userId: string) {
    return prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      },
      include: {
        role: true,
        department: true
      }
    });
  }

  async findRoleByName(name: string, organizationId?: string) {
    if (organizationId) {
      const orgRole = await prisma.role.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name
          }
        }
      });
      if (orgRole) return orgRole;
    }

    // Fall back to system role
    return prisma.role.findFirst({
      where: {
        name,
        isSystem: true
      }
    });
  }

  async createDefaultDepartments(organizationId: string) {
    return prisma.department.createMany({
      data: [
        {
          organizationId,
          name: 'General',
          description: 'Company-wide and general operations',
          isActive: true
        },
        {
          organizationId,
          name: 'Engineering',
          description: 'Software development, infrastructure, and technical operations',
          isActive: true
        }
      ],
      skipDuplicates: true
    });
  }
}

export const organizationsRepository = new OrganizationsRepository();
