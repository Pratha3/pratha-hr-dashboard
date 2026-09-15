import { prisma } from '../../config/database';
import { ProjectStatus } from '@prisma/client';

export class ProjectsRepository {
  async findAll(organizationId?: string) {
    return prisma.project.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                position: true,
                profileImageUrl: true,
                department: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { assignedAt: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string, organizationId?: string) {
    return prisma.project.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                position: true,
                profileImageUrl: true,
                department: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { assignedAt: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      }
    });
  }

  async findByName(name: string, organizationId?: string) {
    return prisma.project.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(organizationId ? { organizationId } : {})
      }
    });
  }

  async create(data: {
    name: string;
    clientName?: string | null;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    organizationId?: string;
  }) {
    return prisma.project.create({
      data: {
        name: data.name,
        clientName: data.clientName ?? null,
        description: data.description ?? null,
        status: data.status ?? 'ACTIVE',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        organizationId: data.organizationId || null
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                position: true,
                profileImageUrl: true
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      clientName?: string | null;
      description?: string | null;
      status?: ProjectStatus;
      startDate?: Date | null;
      endDate?: Date | null;
    }
  ) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                position: true,
                profileImageUrl: true
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });
  }

  async delete(id: string) {
    return prisma.project.delete({
      where: { id }
    });
  }

  async addOrUpdateMember(data: {
    projectId: string;
    userId: string;
    role: string;
    allocation: number;
  }) {
    return prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId
        }
      },
      update: {
        role: data.role,
        allocation: data.allocation
      },
      create: {
        projectId: data.projectId,
        userId: data.userId,
        role: data.role,
        allocation: data.allocation
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            profileImageUrl: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
  }

  async removeMember(projectId: string, userId: string) {
    return prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });
  }

  async findByUserId(userId: string, organizationId?: string) {
    return prisma.projectMember.findMany({
      where: {
        userId,
        ...(organizationId ? { project: { organizationId } } : {})
      },
      include: {
        project: true
      },
      orderBy: { assignedAt: 'desc' }
    });
  }
}

export const projectsRepository = new ProjectsRepository();
