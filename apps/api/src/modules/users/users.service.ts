import { usersRepository, UsersRepository } from './users.repository';
import { hashPassword } from '../../common/utils/argon2';
import {
  NotFoundError,
  ConflictError
} from '../../common/errors/app-error';
import {
  CreateUserInput,
  UpdateUserInput,
  UserQueryInput,
  UpdateUserStatusInput,
  UpdateUserRoleInput
} from '@ems/validation';
import {
  UserSummary,
  ApiResponseMeta,
  Permissions,
  PermissionName
} from '@ems/shared-types';
import { prisma } from '../../config/database';

export class UsersService {
  constructor(private repo: UsersRepository = usersRepository) {}

  private formatUser(user: any, canReadSalary: boolean, organizationId?: string): UserSummary {
    const membership =
      organizationId && user.memberships && user.memberships.length > 0
        ? user.memberships[0]
        : null;

    const role = membership?.role || user.role || {
      id: user.roleId || '',
      name: 'MEMBER',
      description: null
    };
    const department = membership?.department || user.department || null;
    const salary = membership?.salary !== undefined ? membership.salary : user.salary;

    return {
      id: user.id,
      employeeCode: membership?.employeeCode ?? user.employeeCode ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      position: membership?.position ?? user.position ?? null,
      departmentId: membership?.departmentId ?? user.departmentId ?? null,
      department: department ? { id: department.id, name: department.name } : null,
      joiningDate: membership?.joiningDate ?? user.joiningDate ?? null,
      salary: canReadSalary && salary ? Number(salary) : null,
      status: membership?.status ?? user.status,
      roleId: membership?.roleId ?? user.roleId,
      role: {
        id: role.id,
        name: role.name,
        description: role.description ?? null
      },
      isActive: membership?.isActive ?? user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async listUsers(
    query: UserQueryInput,
    callerPermissions: PermissionName[],
    organizationId?: string
  ): Promise<{ users: UserSummary[]; meta: ApiResponseMeta }> {
    const canReadSalary = callerPermissions.includes(Permissions.USER_READ_SALARY);
    const { users, total, page, limit, totalPages } = await this.repo.findUsers({
      ...query,
      organizationId
    });

    return {
      users: users.map((u: any) => this.formatUser(u, canReadSalary, organizationId)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  async getUserById(
    id: string,
    callerPermissions: PermissionName[],
    organizationId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    const canReadSalary = callerPermissions.includes(Permissions.USER_READ_SALARY);
    return this.formatUser(user, canReadSalary, organizationId);
  }

  async createUser(
    input: CreateUserInput,
    actorId?: string,
    organizationId?: string
  ): Promise<UserSummary> {
    const email = input.email.trim().toLowerCase();

    // Check employee code collision within tenant if provided
    if (input.employeeCode) {
      const existingCode = await this.repo.findUserByEmployeeCode(input.employeeCode, organizationId);
      if (existingCode) {
        throw new ConflictError('A member with this employee code already exists');
      }
    }

    // Check if user already exists
    let existingUser = await this.repo.findUserByEmail(email);

    if (existingUser && organizationId) {
      const existingMembership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id
          }
        }
      });
      if (existingMembership) {
        throw new ConflictError('A member with this email already belongs to this organization');
      }
    } else if (existingUser && !organizationId) {
      throw new ConflictError('A user with this email address already exists');
    }

    let userId: string;

    if (!existingUser) {
      const passwordHash = await hashPassword(input.password);
      const user = await this.repo.createUser({
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        passwordHash,
        phone: input.phone || null,
        roleId: input.roleId,
        employeeCode: input.employeeCode || null,
        position: input.position || null,
        departmentId: input.departmentId || null,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
        salary: input.salary || null,
        status: input.status || 'ACTIVE',
        profileImageUrl: input.profileImageUrl || null,
        isActive: true,
        isEmailVerified: true
      });
      userId = user.id;
    } else {
      userId = existingUser.id;
    }

    // If tenant context exists, attach user to organization via membership
    if (organizationId) {
      await prisma.organizationMembership.create({
        data: {
          organizationId,
          userId,
          roleId: input.roleId,
          departmentId: input.departmentId || null,
          position: input.position || null,
          employeeCode: input.employeeCode || null,
          joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
          salary: input.salary || null,
          status: input.status || 'ACTIVE',
          isActive: true
        }
      });
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: userId,
        metadata: {
          email,
          roleId: input.roleId,
          departmentId: input.departmentId,
          organizationId
        }
      }
    });

    const fullUser = await this.repo.findUserById(userId, organizationId);
    return this.formatUser(fullUser!, true, organizationId);
  }

  async updateUser(
    id: string,
    input: UpdateUserInput,
    actorId?: string,
    organizationId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    if (input.employeeCode) {
      if (organizationId) {
        const existingMembership = await prisma.organizationMembership.findFirst({
          where: {
            organizationId,
            employeeCode: input.employeeCode,
            userId: { not: id }
          }
        });
        if (existingMembership) {
          throw new ConflictError('A member with this employee code already exists');
        }
      } else if (input.employeeCode !== user.employeeCode) {
        const existingCode = await this.repo.findUserByEmployeeCode(input.employeeCode);
        if (existingCode) {
          throw new ConflictError('A member with this employee code already exists');
        }
      }
    }

    // Update base user profile
    await this.repo.updateUser(id, {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.profileImageUrl !== undefined ? { profileImageUrl: input.profileImageUrl } : {}),
      ...(!organizationId
        ? {
            ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
            ...(input.position !== undefined ? { position: input.position } : {}),
            ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
            ...(input.joiningDate !== undefined
              ? { joiningDate: input.joiningDate ? new Date(input.joiningDate) : null }
              : {}),
            ...(input.salary !== undefined ? { salary: input.salary } : {}),
            ...(input.status ? { status: input.status } : {})
          }
        : {})
    });

    // If tenant context exists, update membership attributes
    if (organizationId) {
      await prisma.organizationMembership.updateMany({
        where: {
          organizationId,
          userId: id
        },
        data: {
          ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
          ...(input.position !== undefined ? { position: input.position } : {}),
          ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
          ...(input.joiningDate !== undefined
            ? { joiningDate: input.joiningDate ? new Date(input.joiningDate) : null }
            : {}),
          ...(input.salary !== undefined ? { salary: input.salary } : {}),
          ...(input.status ? { status: input.status } : {})
        }
      });
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        metadata: input as any
      }
    });

    const updated = await this.repo.findUserById(id, organizationId);
    return this.formatUser(updated!, true, organizationId);
  }

  async updateUserStatus(
    id: string,
    input: UpdateUserStatusInput,
    actorId?: string,
    organizationId?: string
  ): Promise<UserSummary> {
    if (actorId && actorId === id && !input.isActive) {
      throw new ConflictError('You cannot deactivate your own account');
    }

    const user = await this.repo.findUserById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    if (organizationId) {
      await prisma.organizationMembership.updateMany({
        where: { organizationId, userId: id },
        data: {
          isActive: input.isActive,
          status: input.isActive ? 'ACTIVE' : 'INACTIVE'
        }
      });
    } else {
      await this.repo.updateUser(id, {
        isActive: input.isActive,
        status: input.isActive ? 'ACTIVE' : 'INACTIVE'
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: input.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'User',
        entityId: id,
        metadata: { isActive: input.isActive, organizationId }
      }
    });

    const updated = await this.repo.findUserById(id, organizationId);
    return this.formatUser(updated!, true, organizationId);
  }

  async updateUserRole(
    id: string,
    input: UpdateUserRoleInput,
    actorId?: string,
    organizationId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    const currentRoleId =
      organizationId && user.memberships && user.memberships.length > 0
        ? user.memberships[0].roleId
        : user.roleId;

    if (actorId && actorId === id && input.roleId !== currentRoleId) {
      throw new ConflictError('You cannot change your own role');
    }

    if (organizationId) {
      await prisma.organizationMembership.updateMany({
        where: { organizationId, userId: id },
        data: { roleId: input.roleId }
      });
    } else {
      await this.repo.updateUser(id, { roleId: input.roleId });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'USER_ROLE_CHANGED',
        entity: 'User',
        entityId: id,
        metadata: { newRoleId: input.roleId, oldRoleId: currentRoleId, organizationId }
      }
    });

    const updated = await this.repo.findUserById(id, organizationId);
    return this.formatUser(updated!, true, organizationId);
  }

  async getMetadata(organizationId?: string) {
    const [roles, departments] = await Promise.all([
      this.repo.getAllRoles(organizationId),
      this.repo.getAllDepartments(organizationId)
    ]);

    return {
      roles,
      departments
    };
  }
}

export const usersService = new UsersService();
