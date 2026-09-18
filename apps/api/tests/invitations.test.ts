import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationsService } from '../src/modules/invitations/invitations.service';
import { ConflictError, NotFoundError, ValidationError } from '../src/common/errors/app-error';
import { prisma } from '../src/config/database';
import { emailService } from '../src/common/services/email.service';
import { notificationsService } from '../src/modules/notifications/notifications.service';
import * as argon2Utils from '../src/common/utils/argon2';
import * as tokenUtils from '../src/common/utils/tokens';

vi.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    organization: {
      findUnique: vi.fn()
    },
    role: {
      findUnique: vi.fn()
    },
    organizationMembership: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    organizationInvitation: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({})
    }
  }
}));

vi.mock('../src/common/services/email.service', () => ({
  emailService: {
    sendInvitationEmail: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../src/modules/notifications/notifications.service', () => ({
  notificationsService: {
    notifyMemberJoined: vi.fn()
  }
}));

vi.mock('../src/common/utils/argon2', () => ({
  hashPassword: vi.fn().mockResolvedValue('argon2-hashed-password')
}));

vi.mock('../src/common/utils/tokens', () => ({
  generateRandomToken: vi.fn().mockReturnValue('raw-random-token-32-chars'),
  hashToken: vi.fn().mockImplementation((token: string) => `hashed-${token}`),
  generateAccessToken: vi.fn().mockReturnValue('mock-jwt-access-token')
}));

describe('InvitationsService Edge Cases & Unit Tests', () => {
  let service: InvitationsService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.organizationMembership.findUnique).mockResolvedValue(null);
    mockRepo = {
      createInvitation: vi.fn(),
      findInvitationByHash: vi.fn(),
      findPendingByOrgAndEmail: vi.fn(),
      findPendingInvitationsByOrg: vi.fn(),
      updateStatus: vi.fn(),
      deleteInvitation: vi.fn()
    };
    service = new InvitationsService(mockRepo);
  });

  // =========================================================================
  // 1. inviteMember Edge Cases
  // =========================================================================
  describe('inviteMember', () => {
    it('should successfully create an invitation, send email, and log audit event', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null); // No existing user
      mockRepo.findPendingByOrgAndEmail.mockResolvedValue(null); // No existing invite
      mockRepo.createInvitation.mockResolvedValue({
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'alice@nexus.com',
        roleId: 'role-emp',
        status: 'PENDING'
      });
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({ name: 'Acme Corp' } as any);
      vi.mocked(prisma.role.findUnique).mockResolvedValue({ name: 'Engineer' } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ firstName: 'HR', lastName: 'Manager' } as any);

      const result = await service.inviteMember('org-1', {
        email: '  Alice@Nexus.COM  ',
        roleId: 'role-emp'
      }, 'actor-admin');

      expect(result.inviteToken).toBe('raw-random-token-32-chars');
      expect(mockRepo.createInvitation).toHaveBeenCalledWith({
        organizationId: 'org-1',
        email: 'alice@nexus.com',
        roleId: 'role-emp',
        tokenHash: 'hashed-raw-random-token-32-chars',
        expiresAt: expect.any(Date),
        invitedById: 'actor-admin'
      });
      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith('alice@nexus.com', {
        organizationName: 'Acme Corp',
        invitedByName: 'HR Manager',
        roleName: 'Engineer',
        inviteToken: 'raw-random-token-32-chars'
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'actor-admin',
          action: 'MEMBER_INVITED'
        })
      });
    });

    it('should throw ConflictError if email belongs to an already active organization member', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-active', email: 'alice@nexus.com' } as any);
      vi.mocked(prisma.organizationMembership.findUnique).mockResolvedValueOnce({
        organizationId: 'org-1',
        userId: 'user-active',
        isActive: true
      } as any);

      await expect(
        service.inviteMember('org-1', { email: 'alice@nexus.com', roleId: 'role-emp' })
      ).rejects.toThrow(ConflictError);

      expect(mockRepo.createInvitation).not.toHaveBeenCalled();
    });

    it('should allow invite if user exists in database but has an inactive organization membership', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'user-inactive', email: 'former@nexus.com' } as any);
      vi.mocked(prisma.organizationMembership.findUnique).mockResolvedValueOnce({
        organizationId: 'org-1',
        userId: 'user-inactive',
        isActive: false
      } as any);
      mockRepo.findPendingByOrgAndEmail.mockResolvedValue(null);
      mockRepo.createInvitation.mockResolvedValue({ id: 'invite-2' });

      const result = await service.inviteMember('org-1', { email: 'former@nexus.com', roleId: 'role-emp' });
      expect(result.invitation).toEqual({ id: 'invite-2' });
      expect(mockRepo.createInvitation).toHaveBeenCalled();
    });

    it('should throw ConflictError if an active pending invitation already exists for this email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      mockRepo.findPendingByOrgAndEmail.mockResolvedValue({ id: 'invite-pending', status: 'PENDING' });

      await expect(
        service.inviteMember('org-1', { email: 'pending@nexus.com', roleId: 'role-emp' })
      ).rejects.toThrow(ConflictError);

      expect(mockRepo.createInvitation).not.toHaveBeenCalled();
    });

    it('should fallback gracefully to default names if org or role are not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      mockRepo.findPendingByOrgAndEmail.mockResolvedValue(null);
      mockRepo.createInvitation.mockResolvedValue({ id: 'invite-3' });
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

      await service.inviteMember('org-1', { email: 'test@nexus.com', roleId: 'role-unknown' });

      expect(emailService.sendInvitationEmail).toHaveBeenCalledWith('test@nexus.com', {
        organizationName: 'Nexus HRMS Workspace',
        invitedByName: undefined,
        roleName: 'Member',
        inviteToken: 'raw-random-token-32-chars'
      });
    });
  });

  // =========================================================================
  // 2. getInvitationByToken Edge Cases
  // =========================================================================
  describe('getInvitationByToken', () => {
    it('should return sanitized invitation metadata for a valid token', async () => {
      const futureDate = new Date(Date.now() + 100000);
      mockRepo.findInvitationByHash.mockResolvedValue({
        id: 'invite-1',
        email: 'invitee@nexus.com',
        status: 'PENDING',
        expiresAt: futureDate,
        organization: { name: 'Acme Corp', slug: 'acme' },
        role: { name: 'Software Engineer' },
        invitedBy: { firstName: 'Jane', lastName: 'Doe' }
      });

      const result = await service.getInvitationByToken('valid-token');

      expect(mockRepo.findInvitationByHash).toHaveBeenCalledWith('hashed-valid-token');
      expect(result).toEqual({
        id: 'invite-1',
        email: 'invitee@nexus.com',
        organizationName: 'Acme Corp',
        organizationSlug: 'acme',
        roleName: 'Software Engineer',
        invitedBy: 'Jane Doe'
      });
    });

    it('should throw NotFoundError if token does not exist', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(null);

      await expect(service.getInvitationByToken('invalid-token')).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if invitation status is not PENDING (e.g. ACCEPTED / REVOKED)', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue({
        id: 'invite-1',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 100000)
      });

      await expect(service.getInvitationByToken('used-token')).rejects.toThrow(ConflictError);
    });

    it('should mark as EXPIRED and throw ConflictError if token has expired', async () => {
      const pastDate = new Date(Date.now() - 50000);
      mockRepo.findInvitationByHash.mockResolvedValue({
        id: 'invite-expired',
        status: 'PENDING',
        expiresAt: pastDate
      });

      await expect(service.getInvitationByToken('expired-token')).rejects.toThrow(ConflictError);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('invite-expired', 'EXPIRED');
    });
  });

  // =========================================================================
  // 3. acceptInvitation Edge Cases
  // =========================================================================
  describe('acceptInvitation', () => {
    const validInvite = {
      id: 'invite-accept',
      organizationId: 'org-1',
      email: 'newuser@nexus.com',
      roleId: 'role-emp',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 100000),
      organization: { id: 'org-1', name: 'Acme Corp' },
      role: { name: 'Developer' }
    };

    it('should create new user account, link membership, mark accepted, and return token', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(validInvite);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // No existing user with this email
        .mockResolvedValueOnce({ id: 'new-user-id', firstName: 'John', lastName: 'Doe', email: 'newuser@nexus.com' } as any); // for notification
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@nexus.com',
        firstName: 'John',
        lastName: 'Doe'
      } as any);
      vi.mocked(prisma.organizationMembership.upsert).mockResolvedValue({ id: 'mem-1' } as any);

      const result = await service.acceptInvitation({
        token: 'valid-token',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(argon2Utils.hashPassword).toHaveBeenCalledWith('SecurePassword123!');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@nexus.com',
          passwordHash: 'argon2-hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          roleId: 'role-emp',
          isActive: true,
          isEmailVerified: true
        })
      });
      expect(prisma.organizationMembership.upsert).toHaveBeenCalledWith({
        where: { organizationId_userId: { organizationId: 'org-1', userId: 'new-user-id' } },
        update: expect.objectContaining({ roleId: 'role-emp', isActive: true, status: 'ACTIVE' }),
        create: expect.objectContaining({ organizationId: 'org-1', userId: 'new-user-id', roleId: 'role-emp' })
      });
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('invite-accept', 'ACCEPTED');
      expect(result.accessToken).toBe('mock-jwt-access-token');
      expect(result.message).toContain('Successfully joined Acme Corp');
    });

    it('should throw ValidationError if new user registers without providing a password', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(validInvite);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        service.acceptInvitation({
          token: 'valid-token',
          firstName: 'John',
          lastName: 'Doe'
          // Missing password
        })
      ).rejects.toThrow(ValidationError);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should attach existing registered user if account with invite email already exists', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(validInvite);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: 'existing-user-id', email: 'newuser@nexus.com' } as any) // User exists
        .mockResolvedValueOnce({ id: 'existing-user-id', firstName: 'Jane', lastName: 'Smith', email: 'newuser@nexus.com' } as any);
      vi.mocked(prisma.organizationMembership.upsert).mockResolvedValue({ id: 'mem-2' } as any);

      const result = await service.acceptInvitation({
        token: 'valid-token'
      });

      expect(prisma.user.create).not.toHaveBeenCalled(); // Should NOT create duplicate user
      expect(prisma.organizationMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId_userId: { organizationId: 'org-1', userId: 'existing-user-id' } }
        })
      );
      expect(result.accessToken).toBe('mock-jwt-access-token');
    });

    it('should accept invite when authenticated user ID is provided directly', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(validInvite);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'auth-user-id',
        firstName: 'Authenticated',
        lastName: 'User',
        email: 'auth@nexus.com'
      } as any);
      vi.mocked(prisma.organizationMembership.upsert).mockResolvedValue({ id: 'mem-3' } as any);

      const result = await service.acceptInvitation(
        { token: 'valid-token' },
        'auth-user-id'
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalledWith({ where: { email: 'newuser@nexus.com' } });
      expect(prisma.organizationMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId_userId: { organizationId: 'org-1', userId: 'auth-user-id' } }
        })
      );
      expect(result.accessToken).toBe('mock-jwt-access-token');
    });

    it('should fallback to default first and last names if not provided for new user', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(validInvite);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 'default-user-id' } as any);
      vi.mocked(prisma.organizationMembership.upsert).mockResolvedValue({ id: 'mem-4' } as any);

      await service.acceptInvitation({
        token: 'valid-token',
        password: 'Password123!'
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Team',
          lastName: 'Member'
        })
      });
    });

    it('should throw NotFoundError if invitation token is not found during accept', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue(null);

      await expect(service.acceptInvitation({ token: 'nonexistent-token' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if invitation was already accepted or revoked', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue({
        id: 'inv-revoked',
        status: 'REVOKED',
        expiresAt: new Date(Date.now() + 10000)
      });

      await expect(service.acceptInvitation({ token: 'revoked-token' })).rejects.toThrow(ConflictError);
    });

    it('should update status to EXPIRED and throw ConflictError if token expired at accept time', async () => {
      mockRepo.findInvitationByHash.mockResolvedValue({
        id: 'inv-expired-accept',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 10000)
      });

      await expect(service.acceptInvitation({ token: 'expired-token' })).rejects.toThrow(ConflictError);
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('inv-expired-accept', 'EXPIRED');
    });
  });

  // =========================================================================
  // 4. revokeInvitation Edge Cases
  // =========================================================================
  describe('revokeInvitation', () => {
    it('should revoke invitation and log audit event when invite exists in the org', async () => {
      vi.mocked(prisma.organizationInvitation.findFirst).mockResolvedValue({
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'revoke@nexus.com'
      } as any);

      const result = await service.revokeInvitation('org-1', 'invite-1', 'actor-1');

      expect(mockRepo.updateStatus).toHaveBeenCalledWith('invite-1', 'REVOKED');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'actor-1',
          action: 'INVITATION_REVOKED',
          entityId: 'invite-1'
        })
      });
      expect(result.message).toBe('Invitation revoked successfully');
    });

    it('should throw NotFoundError if invitation is not found in the organization', async () => {
      vi.mocked(prisma.organizationInvitation.findFirst).mockResolvedValue(null);

      await expect(service.revokeInvitation('org-1', 'nonexistent-id')).rejects.toThrow(NotFoundError);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. listPendingInvitations
  // =========================================================================
  describe('listPendingInvitations', () => {
    it('should delegate fetching pending invitations to repository', async () => {
      const mockList = [{ id: 'inv-1', email: 'test@nexus.com', status: 'PENDING' }];
      mockRepo.findPendingInvitationsByOrg.mockResolvedValue(mockList);

      const result = await service.listPendingInvitations('org-1');
      expect(result).toEqual(mockList);
      expect(mockRepo.findPendingInvitationsByOrg).toHaveBeenCalledWith('org-1');
    });
  });
});
