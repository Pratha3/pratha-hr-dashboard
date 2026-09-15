import { prisma } from '../../config/database';
import { OrganizationInvitation, InvitationStatus } from '@prisma/client';

export class InvitationsRepository {
  async createInvitation(data: {
    organizationId: string;
    email: string;
    roleId: string;
    tokenHash: string;
    expiresAt: Date;
    invitedById?: string;
  }): Promise<OrganizationInvitation> {
    return prisma.organizationInvitation.create({
      data: {
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        roleId: data.roleId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        invitedById: data.invitedById || null,
        status: 'PENDING'
      },
      include: {
        role: true,
        organization: true
      }
    });
  }

  async findInvitationByHash(tokenHash: string) {
    return prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
        role: true,
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async findPendingByOrgAndEmail(organizationId: string, email: string) {
    return prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });
  }

  async findPendingInvitationsByOrg(organizationId: string) {
    return prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateStatus(id: string, status: InvitationStatus) {
    return prisma.organizationInvitation.update({
      where: { id },
      data: { status }
    });
  }

  async deleteInvitation(id: string) {
    return prisma.organizationInvitation.delete({
      where: { id }
    });
  }
}

export const invitationsRepository = new InvitationsRepository();
