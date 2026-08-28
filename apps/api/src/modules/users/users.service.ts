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

  private formatUser(user: any, canReadSalary: boolean): UserSummary {
    return {
      id: user.id,
      employeeCode: user.employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      position: user.position,
      departmentId: user.departmentId,
      department: user.department || null,
      joiningDate: user.joiningDate,
      salary: canReadSalary && user.salary ? Number(user.salary) : null,
      status: user.status,
      roleId: user.roleId,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async listUsers(
    query: UserQueryInput,
    callerPermissions: PermissionName[]
  ): Promise<{ users: UserSummary[]; meta: ApiResponseMeta }> {
    const canReadSalary = callerPermissions.includes(Permissions.USER_READ_SALARY);
    const { users, total, page, limit, totalPages } = await this.repo.findUsers(query);

    return {
      users: users.map((u) => this.formatUser(u, canReadSalary)),
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

  async getUserById(id: string, callerPermissions: PermissionName[]): Promise<UserSummary> {
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    const canReadSalary = callerPermissions.includes(Permissions.USER_READ_SALARY);
    return this.formatUser(user, canReadSalary);
  }

  async createUser(input: CreateUserInput, actorId?: string): Promise<UserSummary> {
    const email = input.email.trim().toLowerCase();

    // Check email collision
    const existingUser = await this.repo.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Check employee code collision if provided
    if (input.employeeCode) {
      const existingCode = await this.repo.findUserByEmployeeCode(input.employeeCode);
      if (existingCode) {
        throw new ConflictError('A member with this employee code already exists');
      }
    }

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

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          roleId: user.roleId,
          departmentId: user.departmentId
        }
      }
    });

    const fullUser = await this.repo.findUserById(user.id);
    return this.formatUser(fullUser!, true);
  }

  async updateUser(
    id: string,
    input: UpdateUserInput,
    actorId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    if (input.employeeCode && input.employeeCode !== user.employeeCode) {
      const existingCode = await this.repo.findUserByEmployeeCode(input.employeeCode);
      if (existingCode) {
        throw new ConflictError('A member with this employee code already exists');
      }
    }

    const updated = await this.repo.updateUser(id, {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.joiningDate !== undefined
        ? { joiningDate: input.joiningDate ? new Date(input.joiningDate) : null }
        : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.profileImageUrl !== undefined
        ? { profileImageUrl: input.profileImageUrl }
        : {})
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        metadata: input as any
      }
    });

    return this.formatUser(updated, true);
  }

  async updateUserStatus(
    id: string,
    input: UpdateUserStatusInput,
    actorId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    const updated = await this.repo.updateUser(id, {
      isActive: input.isActive,
      status: input.isActive ? 'ACTIVE' : 'INACTIVE'
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: input.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'User',
        entityId: id,
        metadata: { isActive: input.isActive }
      }
    });

    return this.formatUser(updated, true);
  }

  async updateUserRole(
    id: string,
    input: UpdateUserRoleInput,
    actorId?: string
  ): Promise<UserSummary> {
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    const updated = await this.repo.updateUser(id, {
      roleId: input.roleId
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'USER_ROLE_CHANGED',
        entity: 'User',
        entityId: id,
        metadata: { newRoleId: input.roleId, oldRoleId: user.roleId }
      }
    });

    return this.formatUser(updated, true);
  }

  async getMetadata() {
    const [roles, departments] = await Promise.all([
      this.repo.getAllRoles(),
      this.repo.getAllDepartments()
    ]);

    return {
      roles,
      departments
    };
  }
}

export const usersService = new UsersService();
