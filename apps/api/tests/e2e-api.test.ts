import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import * as argon2Utils from '../src/common/utils/argon2';
import * as tokenUtils from '../src/common/utils/tokens';

// Mock database layer
vi.mock('../src/config/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn()
    },
    organizationMembership: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn()
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn()
    },
    leaveRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    leaveType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    announcement: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({})
    }
  },
  checkDatabaseHealth: vi.fn().mockResolvedValue({ status: 'healthy', latencyMs: 2 })
}));

vi.mock('../src/common/services/email.service', () => ({
  emailService: {
    sendMail: vi.fn().mockResolvedValue(true),
    sendLeaveRequestAlert: vi.fn().mockResolvedValue(true),
    sendLeaveStatusAlert: vi.fn().mockResolvedValue(true),
    sendAnnouncementAlert: vi.fn().mockResolvedValue(true),
    sendInvitationEmail: vi.fn().mockResolvedValue(true)
  }
}));

describe('End-to-End API Integration & Full User Lifecycle Tests', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. System Health & Readiness Endpoints
  // =========================================================================
  describe('System Health & Observability', () => {
    it('GET /health - should return 200 with liveness timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /health/ready - should return deep diagnostics with database status and memory', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database.status).toBe('healthy');
      expect(res.body.system.heapUsedMb).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. Authentication & User Registration Lifecycle
  // =========================================================================
  describe('Auth & User Registration Flow', () => {
    it('POST /api/v1/auth/register - should validate input and reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Weak password (< 8 chars, no upper/lower/symbols)
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('POST /api/v1/auth/register - should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongPassword123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/auth/login - should reject non-existent user credentials with 401', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'StrongPassword123!'
        });

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/auth/login - should reject locked account when lockedUntil is in the future', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-locked',
        email: 'locked@example.com',
        lockedUntil: new Date(Date.now() + 600000), // Locked for 10 minutes
        failedLoginAttempts: 5,
        isActive: true
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'locked@example.com',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(423); // Locked
    });
  });

  // =========================================================================
  // 3. Authenticated Context & Protected Endpoints
  // =========================================================================
  describe('Protected Routes & JWT Authentication', () => {
    it('GET /api/v1/notifications - should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/leaves - should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/leaves');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/users - should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 4. Rate Limiting & Non-Existent Routes
  // =========================================================================
  describe('Security & 404 Routing', () => {
    it('GET /api/v1/non-existent-endpoint - should return 404 with structured error', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('Route GET');
    });
  });
});
