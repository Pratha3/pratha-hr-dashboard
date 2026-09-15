import { projectsRepository, ProjectsRepository } from './projects.repository';
import {
  NotFoundError,
  ConflictError,
  ValidationError
} from '../../common/errors/app-error';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AssignProjectMemberInput
} from '@ems/validation';
import { prisma } from '../../config/database';

export class ProjectsService {
  constructor(private repo: ProjectsRepository = projectsRepository) {}

  async listProjects(organizationId?: string) {
    return this.repo.findAll(organizationId);
  }

  async getProjectById(id: string, organizationId?: string) {
    const project = await this.repo.findById(id, organizationId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }
    return project;
  }

  async createProject(input: CreateProjectInput, actorId?: string, organizationId?: string) {
    const existing = await this.repo.findByName(input.name.trim(), organizationId);
    if (existing) {
      throw new ConflictError('A project with this name already exists');
    }

    const startDate = input.startDate ? new Date(input.startDate) : null;
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('End date cannot be before start date');
    }

    const project = await this.repo.create({
      name: input.name.trim(),
      clientName: input.clientName?.trim() || null,
      description: input.description?.trim() || null,
      status: input.status,
      startDate,
      endDate,
      organizationId
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'PROJECT_CREATED',
        entity: 'Project',
        entityId: project.id,
        metadata: { name: project.name, clientName: project.clientName, organizationId }
      }
    });

    return project;
  }

  async updateProject(id: string, input: UpdateProjectInput, actorId?: string, organizationId?: string) {
    const project = await this.repo.findById(id, organizationId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    if (input.name && input.name.trim().toLowerCase() !== project.name.toLowerCase()) {
      const duplicate = await this.repo.findByName(input.name.trim(), organizationId);
      if (duplicate) {
        throw new ConflictError('A project with this name already exists');
      }
    }

    const startDate = input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : project.startDate;
    const endDate = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : project.endDate;

    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('End date cannot be before start date');
    }

    const updated = await this.repo.update(id, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.clientName !== undefined ? { clientName: input.clientName ? input.clientName.trim() : null } : {}),
      ...(input.description !== undefined ? { description: input.description ? input.description.trim() : null } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {})
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'PROJECT_UPDATED',
        entity: 'Project',
        entityId: id,
        metadata: { ...input, organizationId } as any
      }
    });

    return updated;
  }

  async deleteProject(id: string, actorId?: string, organizationId?: string) {
    const project = await this.repo.findById(id, organizationId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    await this.repo.delete(id);

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'PROJECT_DELETED',
        entity: 'Project',
        entityId: id,
        metadata: { name: project.name, organizationId }
      }
    });

    return { message: 'Project deleted successfully' };
  }

  async assignMember(projectId: string, input: AssignProjectMemberInput, actorId?: string, organizationId?: string) {
    const project = await this.repo.findById(projectId, organizationId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: input.userId,
        ...(organizationId
          ? {
              memberships: {
                some: { organizationId, isActive: true }
              }
            }
          : { isActive: true })
      }
    });
    if (!user || !user.isActive) {
      throw new NotFoundError('Active employee not found in this organization');
    }

    const member = await this.repo.addOrUpdateMember({
      projectId,
      userId: input.userId,
      role: input.role.trim(),
      allocation: input.allocation
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'PROJECT_MEMBER_ASSIGNED',
        entity: 'ProjectMember',
        entityId: member.id,
        metadata: {
          projectId,
          projectName: project.name,
          userId: input.userId,
          role: input.role,
          allocation: input.allocation,
          organizationId
        }
      }
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, actorId?: string, organizationId?: string) {
    const project = await this.repo.findById(projectId, organizationId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    await this.repo.removeMember(projectId, userId);

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'PROJECT_MEMBER_REMOVED',
        entity: 'ProjectMember',
        entityId: `${projectId}_${userId}`,
        metadata: { projectId, userId, organizationId }
      }
    });

    return { message: 'Employee removed from project successfully' };
  }

  async getProjectsByUserId(userId: string, organizationId?: string) {
    return this.repo.findByUserId(userId, organizationId);
  }
}

export const projectsService = new ProjectsService();
