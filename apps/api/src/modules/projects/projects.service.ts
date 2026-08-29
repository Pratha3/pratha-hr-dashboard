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

  async listProjects() {
    return this.repo.findAll();
  }

  async getProjectById(id: string) {
    const project = await this.repo.findById(id);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }
    return project;
  }

  async createProject(input: CreateProjectInput, actorId?: string) {
    const existing = await this.repo.findByName(input.name.trim());
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
      endDate
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'PROJECT_CREATED',
        entity: 'Project',
        entityId: project.id,
        metadata: { name: project.name, clientName: project.clientName }
      }
    });

    return project;
  }

  async updateProject(id: string, input: UpdateProjectInput, actorId?: string) {
    const project = await this.repo.findById(id);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    if (input.name && input.name.trim().toLowerCase() !== project.name.toLowerCase()) {
      const duplicate = await this.repo.findByName(input.name.trim());
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
        userId: actorId || null,
        action: 'PROJECT_UPDATED',
        entity: 'Project',
        entityId: id,
        metadata: input as any
      }
    });

    return updated;
  }

  async deleteProject(id: string, actorId?: string) {
    const project = await this.repo.findById(id);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    await this.repo.delete(id);

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'PROJECT_DELETED',
        entity: 'Project',
        entityId: id,
        metadata: { name: project.name }
      }
    });

    return { message: 'Project deleted successfully' };
  }

  async assignMember(projectId: string, input: AssignProjectMemberInput, actorId?: string) {
    const project = await this.repo.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || !user.isActive) {
      throw new NotFoundError('Active employee not found');
    }

    const member = await this.repo.addOrUpdateMember({
      projectId,
      userId: input.userId,
      role: input.role.trim(),
      allocation: input.allocation
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'PROJECT_MEMBER_ASSIGNED',
        entity: 'ProjectMember',
        entityId: member.id,
        metadata: {
          projectId,
          projectName: project.name,
          userId: input.userId,
          role: input.role,
          allocation: input.allocation
        }
      }
    });

    return member;
  }

  async removeMember(projectId: string, userId: string, actorId?: string) {
    const project = await this.repo.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project record not found');
    }

    await this.repo.removeMember(projectId, userId);

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'PROJECT_MEMBER_REMOVED',
        entity: 'ProjectMember',
        entityId: `${projectId}_${userId}`,
        metadata: { projectId, userId }
      }
    });

    return { message: 'Employee removed from project successfully' };
  }

  async getProjectsByUserId(userId: string) {
    return this.repo.findByUserId(userId);
  }
}

export const projectsService = new ProjectsService();
