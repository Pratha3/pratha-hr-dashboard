import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../src/modules/users/users.service';
import { ALL_PERMISSIONS } from '@ems/shared-types';

describe('UsersService Unit Tests', () => {
  let service: UsersService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findUsers: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      updateRole: vi.fn(),
      getMetadata: vi.fn()
    };
    service = new UsersService(mockRepo);
  });

  it('should list users with pagination meta', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        salary: 85000,
        role: { name: 'EMPLOYEE' }
      }
    ];

    mockRepo.findUsers.mockResolvedValue({
      users: mockUsers,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    });

    const result = await service.listUsers({ page: 1, limit: 10 }, ALL_PERMISSIONS);
    expect(result.users).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.users[0].salary).toBe(85000);
  });

  it('should strip salary (set to null) if user lacks USER_READ_SALARY permission', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        salary: 85000,
        role: { name: 'EMPLOYEE' }
      }
    ];

    mockRepo.findUsers.mockResolvedValue({
      users: mockUsers,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    });

    // Permission set without USER_READ_SALARY
    const permissionsWithoutSalary = ALL_PERMISSIONS.filter(
      (p) => p !== 'USER_READ_SALARY'
    );

    const result = await service.listUsers({ page: 1, limit: 10 }, permissionsWithoutSalary);
    expect(result.users[0].salary).toBeNull();
  });
});
