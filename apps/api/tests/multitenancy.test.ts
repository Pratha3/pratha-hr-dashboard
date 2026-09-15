import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantMiddleware, requireTenant } from '../src/middleware/tenant.middleware';
import { prisma } from '../src/config/database';
import { AuthorizationError, AuthenticationError, NotFoundError } from '../src/common/errors/app-error';
import { UsersService } from '../src/modules/users/users.service';
import { LeavesService } from '../src/modules/leaves/leaves.service';
import { AnnouncementsService } from '../src/modules/announcements/announcements.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { ALL_PERMISSIONS, Permissions } from '@ems/shared-types';

vi.mock('../src/config/database', () => ({
  prisma: {
    organizationMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    organizationInvitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    leaveType: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    leaveRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    announcement: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    asset: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

describe('Multi-Tenancy & Tenant Isolation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tenantMiddleware', () => {
    it('should proceed if req.user is not set', async () => {
      const req: any = { headers: {} };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.organizationId).toBeUndefined();
    });

    it('should select default organization when no x-organization-id header is provided', async () => {
      const mockMemberships = [
        {
          id: 'mem-1',
          organizationId: 'org-alpha',
          roleId: 'role-admin',
          departmentId: 'dept-eng',
          organization: { id: 'org-alpha', name: 'Alpha Corp', slug: 'alpha-corp' },
          role: {
            id: 'role-admin',
            name: 'ADMIN',
            rolePermissions: [{ permission: { name: 'USER_READ' } }]
          }
        },
        {
          id: 'mem-2',
          organizationId: 'org-beta',
          roleId: 'role-emp',
          departmentId: null,
          organization: { id: 'org-beta', name: 'Beta Inc', slug: 'beta-inc' },
          role: {
            id: 'role-emp',
            name: 'EMPLOYEE',
            rolePermissions: [{ permission: { name: 'LEAVE_REQUEST' } }]
          }
        }
      ];

      vi.mocked(prisma.organizationMembership.findMany).mockResolvedValue(mockMemberships as any);

      const req: any = {
        headers: {},
        user: { id: 'user-1', email: 'test@example.com', permissions: [] }
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.organizationId).toBe('org-alpha');
      expect(req.membershipId).toBe('mem-1');
      expect(req.user.permissions).toContain('USER_READ');
      expect(req.user.organizations).toHaveLength(2);
    });

    it('should switch tenant when valid x-organization-id header is provided', async () => {
      const mockMemberships = [
        {
          id: 'mem-1',
          organizationId: 'org-alpha',
          roleId: 'role-admin',
          departmentId: null,
          organization: { id: 'org-alpha', name: 'Alpha Corp', slug: 'alpha-corp' },
          role: {
            id: 'role-admin',
            name: 'ADMIN',
            rolePermissions: [{ permission: { name: 'USER_READ' } }]
          }
        },
        {
          id: 'mem-2',
          organizationId: 'org-beta',
          roleId: 'role-emp',
          departmentId: null,
          organization: { id: 'org-beta', name: 'Beta Inc', slug: 'beta-inc' },
          role: {
            id: 'role-emp',
            name: 'EMPLOYEE',
            rolePermissions: [{ permission: { name: 'LEAVE_REQUEST' } }]
          }
        }
      ];

      vi.mocked(prisma.organizationMembership.findMany).mockResolvedValue(mockMemberships as any);

      const req: any = {
        headers: { 'x-organization-id': 'org-beta' },
        user: { id: 'user-1', email: 'test@example.com', permissions: [] }
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.organizationId).toBe('org-beta');
      expect(req.membershipId).toBe('mem-2');
      expect(req.user.permissions).toContain('LEAVE_REQUEST');
      expect(req.user.permissions).not.toContain('USER_READ');
    });

    it('should reject request with AuthorizationError if user does not belong to requested organization', async () => {
      const mockMemberships = [
        {
          id: 'mem-1',
          organizationId: 'org-alpha',
          roleId: 'role-admin',
          departmentId: null,
          organization: { id: 'org-alpha', name: 'Alpha Corp', slug: 'alpha-corp' },
          role: {
            id: 'role-admin',
            name: 'ADMIN',
            rolePermissions: []
          }
        }
      ];

      vi.mocked(prisma.organizationMembership.findMany).mockResolvedValue(mockMemberships as any);

      const req: any = {
        headers: { 'x-organization-id': 'org-unauthorized' },
        user: { id: 'user-1', email: 'test@example.com', permissions: [] }
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.message).toBe('You do not belong to the requested organization');
    });
  });

  describe('requireTenant', () => {
    it('should throw AuthenticationError if req.user is missing', () => {
      const req: any = {};
      const next = vi.fn();

      requireTenant(req, {} as any, next);
      expect(next).toHaveBeenCalledOnce();
      expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
    });

    it('should throw AuthorizationError if req.organizationId is missing', () => {
      const req: any = { user: { id: 'user-1' } };
      const next = vi.fn();

      requireTenant(req, {} as any, next);
      expect(next).toHaveBeenCalledOnce();
      expect(next.mock.calls[0][0]).toBeInstanceOf(AuthorizationError);
    });

    it('should call next() if req.organizationId is present', () => {
      const req: any = { user: { id: 'user-1' }, organizationId: 'org-alpha' };
      const next = vi.fn();

      requireTenant(req, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('UsersService Tenant Scoping', () => {
    let usersService: UsersService;
    let mockRepo: any;

    beforeEach(() => {
      mockRepo = {
        findUsers: vi.fn(),
        findUserById: vi.fn(),
        findUserByEmail: vi.fn(),
        findUserByEmployeeCode: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        getAllRoles: vi.fn(),
        getAllDepartments: vi.fn()
      };
      usersService = new UsersService(mockRepo);
    });

    it('should pass organizationId to findUsers repo call', async () => {
      mockRepo.findUsers.mockResolvedValue({
        users: [
          {
            id: 'user-1',
            firstName: 'OrgA',
            lastName: 'User',
            email: 'orga@test.com',
            role: { name: 'EMPLOYEE' },
            memberships: [
              {
                organizationId: 'org-alpha',
                role: { id: 'r1', name: 'MEMBER' },
                department: { id: 'd1', name: 'Engineering' }
              }
            ]
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      const result = await usersService.listUsers(
        { page: 1, limit: 10 },
        ALL_PERMISSIONS,
        'org-alpha'
      );

      expect(mockRepo.findUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        organizationId: 'org-alpha'
      });
      expect(result.users).toHaveLength(1);
      expect(result.users[0].department?.name).toBe('Engineering');
    });

    it('should create user and attach OrganizationMembership when organizationId is provided', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.findUserByEmployeeCode.mockResolvedValue(null);
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'newbie@example.com'
      });
      vi.mocked(prisma.organizationMembership.create).mockResolvedValue({} as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      mockRepo.findUserById.mockResolvedValue({
        id: 'new-user-id',
        firstName: 'New',
        lastName: 'Member',
        email: 'newbie@example.com',
        role: { id: 'role-1', name: 'EMPLOYEE' },
        memberships: [
          {
            organizationId: 'org-alpha',
            role: { id: 'role-1', name: 'EMPLOYEE' }
          }
        ]
      });

      const newUser = await usersService.createUser(
        {
          firstName: 'New',
          lastName: 'Member',
          email: 'newbie@example.com',
          password: 'Password123!',
          roleId: '123e4567-e89b-12d3-a456-426614174000'
        },
        'admin-id',
        'org-alpha'
      );

      expect(mockRepo.createUser).toHaveBeenCalled();
      expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-alpha',
          userId: 'new-user-id',
          roleId: '123e4567-e89b-12d3-a456-426614174000',
          isActive: true
        })
      });
      expect(newUser.id).toBe('new-user-id');
    });
  });

  describe('LeavesService Tenant Scoping', () => {
    let leavesService: LeavesService;
    let mockRepo: any;

    beforeEach(() => {
      mockRepo = {
        findTypes: vi.fn(),
        findLeaves: vi.fn(),
        createLeave: vi.fn(),
        updateStatus: vi.fn(),
        findById: vi.fn(),
        createType: vi.fn()
      };
      leavesService = new LeavesService(mockRepo);
    });

    it('should scope leave requests to organization', async () => {
      mockRepo.findLeaves.mockResolvedValue([]);
      await leavesService.listLeaves('user-1', [Permissions.LEAVE_MANAGE], 'org-alpha');
      expect(mockRepo.findLeaves).toHaveBeenCalledWith('user-1', true, 'org-alpha');
    });

    it('should reject approving leave request belonging to different organization', async () => {
      vi.mocked(prisma.leaveRequest.findFirst).mockResolvedValue(null);

      await expect(
        leavesService.actionLeave('leave-1', 'APPROVED' as any, 'admin-1', undefined, 'org-alpha')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('AnnouncementsService Tenant Scoping', () => {
    let announcementsService: AnnouncementsService;
    let mockRepo: any;

    beforeEach(() => {
      mockRepo = {
        findAll: vi.fn(),
        create: vi.fn(),
        delete: vi.fn()
      };
      announcementsService = new AnnouncementsService(mockRepo);
    });

    it('should scope announcements list by organizationId', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      await announcementsService.listAnnouncements('org-alpha');
      expect(mockRepo.findAll).toHaveBeenCalledWith('org-alpha');
    });

    it('should prevent deleting an announcement from another tenant', async () => {
      vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);

      await expect(
        announcementsService.deleteAnnouncement('ann-foreign', 'org-alpha')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('AssetsService Tenant Scoping', () => {
    let assetsService: AssetsService;
    let mockRepo: any;

    beforeEach(() => {
      mockRepo = {
        findAll: vi.fn(),
        findById: vi.fn(),
        findBySerialNumber: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getStats: vi.fn()
      };
      assetsService = new AssetsService(mockRepo);
    });

    it('should scope serial number check to current organization', async () => {
      mockRepo.findBySerialNumber.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'asset-1', name: 'MacBook Pro' });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await assetsService.createAsset(
        {
          name: 'MacBook Pro',
          type: 'LAPTOP',
          serialNumber: 'SN12345'
        },
        'admin-1',
        'org-alpha'
      );

      expect(mockRepo.findBySerialNumber).toHaveBeenCalledWith('SN12345', 'org-alpha');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-alpha' })
      );
    });
  });
});
