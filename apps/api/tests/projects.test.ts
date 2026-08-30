import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { prisma } from '../src/config/database';

vi.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

describe('ProjectsService Unit Tests', () => {
  let service: ProjectsService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      addOrUpdateMember: vi.fn(),
      removeMember: vi.fn(),
      findByUserId: vi.fn()
    };
    service = new ProjectsService(mockRepo);
  });

  it('should list all projects', async () => {
    const mockProjects = [
      { id: 'proj-1', name: 'HR Portal', status: 'ACTIVE', members: [] },
      { id: 'proj-2', name: 'Mobile App', status: 'PLANNING', members: [] }
    ];
    mockRepo.findAll.mockResolvedValue(mockProjects);

    const result = await service.listProjects();
    expect(result).toEqual(mockProjects);
    expect(mockRepo.findAll).toHaveBeenCalledOnce();
  });

  it('should create a new project', async () => {
    const input = {
      name: 'Cloud Migration',
      clientName: 'Enterprise Client',
      status: 'PLANNING' as const
    };
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'proj-3', ...input, members: [] });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const result = await service.createProject(input, '123e4567-e89b-12d3-a456-426614174000');
    expect(result.id).toBe('proj-3');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('should prevent duplicate project names', async () => {
    mockRepo.findByName.mockResolvedValue({ id: 'proj-1', name: 'Cloud Migration' });

    await expect(
      service.createProject({ name: 'Cloud Migration' }, '123e4567-e89b-12d3-a456-426614174000')
    ).rejects.toThrow('A project with this name already exists');
  });

  it('should assign a member to project', async () => {
    const project = { id: 'proj-1', name: 'HR Portal' };
    mockRepo.findById.mockResolvedValue(project);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', isActive: true } as any);
    mockRepo.addOrUpdateMember.mockResolvedValue({
      id: 'pm-1',
      projectId: 'proj-1',
      userId: 'user-1',
      role: 'Backend Engineer',
      allocation: 100
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    const result = await service.assignMember(
      'proj-1',
      { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'Backend Engineer', allocation: 100 },
      '123e4567-e89b-12d3-a456-426614174001'
    );

    expect(result.role).toBe('Backend Engineer');
    expect(mockRepo.addOrUpdateMember).toHaveBeenCalled();
  });

  it('should remove a member from project', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'proj-1', name: 'HR Portal' });
    mockRepo.removeMember.mockResolvedValue({ id: 'pm-1' });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await service.removeMember(
      'proj-1',
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001'
    );
    expect(mockRepo.removeMember).toHaveBeenCalledWith(
      'proj-1',
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });
});
