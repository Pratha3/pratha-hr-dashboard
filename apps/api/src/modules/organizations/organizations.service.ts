import { organizationsRepository, OrganizationsRepository } from './organizations.repository';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/app-error';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@ems/validation';
import { prisma } from '../../config/database';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class OrganizationsService {
  constructor(private repo: OrganizationsRepository = organizationsRepository) {}

  async createOrganization(userId: string, input: CreateOrganizationInput) {
    let baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!baseSlug) {
      baseSlug = 'org-' + Math.random().toString(36).substring(2, 8);
    }

    // Check slug uniqueness; append random suffix if collision exists
    let uniqueSlug = baseSlug;
    let attempt = 0;
    while (await this.repo.findOrganizationBySlug(uniqueSlug)) {
      attempt++;
      uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      if (attempt > 10) {
        throw new ConflictError('Unable to generate a unique organization slug');
      }
    }

    const org = await this.repo.createOrganization({
      name: input.name.trim(),
      slug: uniqueSlug,
      domain: input.domain ? input.domain.trim().toLowerCase() : null,
      createdById: userId
    });

    // Find Owner or Admin role
    let role =
      (await this.repo.findRoleByName('OWNER', org.id)) ||
      (await this.repo.findRoleByName('ADMIN', org.id));

    if (!role) {
      // Fallback: fetch any admin/system role
      role = await prisma.role.findFirst({
        where: { isSystem: true, name: 'ADMIN' }
      });
    }

    if (!role) {
      throw new Error('System default admin role not found');
    }

    // Create owner membership
    const membership = await this.repo.createMembership({
      organizationId: org.id,
      userId,
      roleId: role.id,
      position: 'Organization Owner'
    });

    // Create default starter departments
    await this.repo.createDefaultDepartments(org.id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId,
        action: 'ORGANIZATION_CREATED',
        entity: 'Organization',
        entityId: org.id,
        metadata: {
          name: org.name,
          slug: org.slug
        }
      }
    });

    return {
      organization: org,
      membership
    };
  }

  async listUserOrganizations(userId: string) {
    return this.repo.findUserOrganizations(userId);
  }

  async getOrganization(orgId: string) {
    const org = await this.repo.findOrganizationById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  }

  async updateOrganization(
    orgId: string,
    input: UpdateOrganizationInput,
    actorId?: string
  ) {
    const existing = await this.repo.findOrganizationById(orgId);
    if (!existing) {
      throw new NotFoundError('Organization not found');
    }

    const updated = await this.repo.updateOrganization(orgId, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.domain !== undefined ? { domain: input.domain ? input.domain.trim().toLowerCase() : null } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {})
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorId || null,
        action: 'ORGANIZATION_UPDATED',
        entity: 'Organization',
        entityId: orgId,
        metadata: input as any
      }
    });

    return updated;
  }
}

export const organizationsService = new OrganizationsService();
