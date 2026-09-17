import { invitationsRepository, InvitationsRepository } from './invitations.repository';
import { generateRandomToken, hashToken, generateAccessToken } from '../../common/utils/tokens';
import { hashPassword } from '../../common/utils/argon2';
import { ConflictError, NotFoundError, ValidationError, AuthenticationError } from '../../common/errors/app-error';
import { InviteMemberInput, AcceptInvitationInput } from '@ems/validation';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { emailService } from '../../common/services/email.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class InvitationsService {
  constructor(private repo: InvitationsRepository = invitationsRepository) {}

  async inviteMember(
    organizationId: string,
    input: InviteMemberInput,
    actorId?: string
  ) {
    const email = input.email.trim().toLowerCase();

    // Check if user is already an active member of this organization
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      const existingMembership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id
          }
        }
      });

      if (existingMembership && existingMembership.isActive) {
        throw new ConflictError('User is already an active member of this organization');
      }
    }

    // Check if active pending invite already exists
    const existingInvite = await this.repo.findPendingByOrgAndEmail(organizationId, email);
    if (existingInvite) {
      throw new ConflictError('A pending invitation has already been sent to this email');
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invite = await this.repo.createInvitation({
      organizationId,
      email,
      roleId: input.roleId,
      tokenHash,
      expiresAt,
      invitedById: actorId
    });

    logger.info(`✉️ [INVITATION GENERATED] For ${email} to join organization ${organizationId}`);
    
    // Fetch organization and role names for email template
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true }
    });
    const role = await prisma.role.findUnique({
      where: { id: input.roleId },
      select: { name: true }
    });
    let invitedByName: string | undefined;
    if (actorId) {
      const inviter = await prisma.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true }
      });
      if (inviter) {
        invitedByName = `${inviter.firstName} ${inviter.lastName}`;
      }
    }

    // Send transactional invitation email with clickable invite link
    emailService.sendInvitationEmail(email, {
      organizationName: org?.name || 'Nexus HRMS Workspace',
      invitedByName,
      roleName: role?.name || 'Member',
      inviteToken: rawToken
    }).catch((err) => {
      logger.warn(`Could not dispatch invitation email to ${email}`, { err });
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId || null,
        action: 'MEMBER_INVITED',
        entity: 'OrganizationInvitation',
        entityId: invite.id,
        metadata: {
          email,
          roleId: input.roleId
        }
      }
    });

    return {
      invitation: invite,
      inviteToken: rawToken
    };
  }

  async getInvitationByToken(rawToken: string) {
    const tokenHash = hashToken(rawToken.trim());
    const invite = await this.repo.findInvitationByHash(tokenHash);

    if (!invite) {
      throw new NotFoundError('Invitation not found or invalid');
    }

    if (invite.status !== 'PENDING') {
      throw new ConflictError(`Invitation is no longer valid (Status: ${invite.status})`);
    }

    if (invite.expiresAt < new Date()) {
      await this.repo.updateStatus(invite.id, 'EXPIRED');
      throw new ConflictError('Invitation has expired');
    }

    return {
      id: invite.id,
      email: invite.email,
      organizationName: invite.organization.name,
      organizationSlug: invite.organization.slug,
      roleName: invite.role.name,
      invitedBy: invite.invitedBy
        ? `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`
        : null
    };
  }

  async acceptInvitation(
    input: AcceptInvitationInput,
    authenticatedUserId?: string
  ) {
    const tokenHash = hashToken(input.token.trim());
    const invite = await this.repo.findInvitationByHash(tokenHash);

    if (!invite) {
      throw new NotFoundError('Invitation not found or invalid');
    }

    if (invite.status !== 'PENDING') {
      throw new ConflictError(`Invitation is no longer valid (Status: ${invite.status})`);
    }

    if (invite.expiresAt < new Date()) {
      await this.repo.updateStatus(invite.id, 'EXPIRED');
      throw new ConflictError('Invitation has expired');
    }

    let userId = authenticatedUserId;

    if (!userId) {
      // If user is not authenticated, check if user account with this email exists
      let user = await prisma.user.findUnique({
        where: { email: invite.email.toLowerCase() }
      });

      if (!user) {
        if (!input.password) {
          throw new ValidationError('Password is required to create your account');
        }

        const passwordHash = await hashPassword(input.password);
        user = await prisma.user.create({
          data: {
            email: invite.email.toLowerCase(),
            passwordHash,
            firstName: input.firstName?.trim() || 'Team',
            lastName: input.lastName?.trim() || 'Member',
            roleId: invite.roleId,
            isActive: true,
            isEmailVerified: true
          }
        });
      }

      userId = user.id;
    }

    // Attach user to organization
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId
        }
      },
      update: {
        roleId: invite.roleId,
        isActive: true,
        status: 'ACTIVE'
      },
      create: {
        organizationId: invite.organizationId,
        userId,
        roleId: invite.roleId,
        status: 'ACTIVE',
        isActive: true
      }
    });

    // Mark invitation as accepted
    await this.repo.updateStatus(invite.id, 'ACCEPTED');

    await prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        action: 'MEMBER_JOINED',
        entity: 'OrganizationMembership',
        entityId: membership.id,
        metadata: {
          email: invite.email,
          roleId: invite.roleId
        }
      }
    });

    const accessToken = generateAccessToken(userId);

    return {
      message: `Successfully joined ${invite.organization.name}`,
      organization: invite.organization,
      accessToken
    };
  }

  async listPendingInvitations(organizationId: string) {
    return this.repo.findPendingInvitationsByOrg(organizationId);
  }

  async revokeInvitation(
    organizationId: string,
    invitationId: string,
    actorId?: string
  ) {
    const invite = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId
      }
    });

    if (!invite) {
      throw new NotFoundError('Invitation not found');
    }

    await this.repo.updateStatus(invitationId, 'REVOKED');

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId || null,
        action: 'INVITATION_REVOKED',
        entity: 'OrganizationInvitation',
        entityId: invitationId,
        metadata: { email: invite.email }
      }
    });

    return { message: 'Invitation revoked successfully' };
  }
}

export const invitationsService = new InvitationsService();
