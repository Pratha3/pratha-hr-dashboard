import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword } from '../src/common/utils/argon2';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRandomToken,
  hashToken,
  generateCsrfToken
} from '../src/common/utils/tokens';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import {
  AuthenticationError,
  AccountLockedError,
  ValidationError
} from '../src/common/errors/app-error';

describe('Auth Security & Unit Tests', () => {
  describe('Argon2 Password Hashing', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'StrongPassword@2026!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Token Utilities', () => {
    it('should sign and verify JWT access tokens with userId payload only', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const token = generateAccessToken(userId);

      expect(token).toBeDefined();
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(userId);
      // Ensure no roles or permissions in JWT payload
      expect((decoded as any).roles).toBeUndefined();
      expect((decoded as any).permissions).toBeUndefined();
    });

    it('should throw AuthenticationError on tampered JWT', () => {
      const token = generateAccessToken('user-123');
      const tampered = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(tampered)).toThrow(AuthenticationError);
    });

    it('should generate crypto-random tokens and correct SHA256 hashes', () => {
      const rawToken1 = generateRandomToken(32);
      const rawToken2 = generateRandomToken(32);
      expect(rawToken1).not.toBe(rawToken2);

      const hash1 = hashToken(rawToken1);
      const hash1Repeat = hashToken(rawToken1);
      expect(hash1).toBe(hash1Repeat);
      expect(hash1.length).toBe(64); // SHA-256 hex string

      const csrf = generateCsrfToken();
      expect(csrf).toBeDefined();
      expect(csrf.length).toBe(48);
    });
  });

  describe('AuthService Logic', () => {
    let mockRepo: AuthRepository;
    let authService: AuthService;

    beforeEach(() => {
      mockRepo = {
        findUserByEmail: vi.fn(),
        findUserById: vi.fn(),
        updateUser: vi.fn(),
        createRefreshToken: vi.fn(),
        findRefreshTokenByHash: vi.fn(),
        revokeRefreshToken: vi.fn(),
        revokeTokenFamily: vi.fn(),
        revokeAllUserRefreshTokens: vi.fn(),
        createPasswordResetToken: vi.fn(),
        findPasswordResetTokenByHash: vi.fn(),
        markPasswordResetTokenUsed: vi.fn()
      } as unknown as AuthRepository;

      authService = new AuthService(mockRepo);
    });

    it('should throw generic AuthenticationError if user is not found', async () => {
      (mockRepo.findUserByEmail as any).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@pratha.com', password: 'Password@123' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should lock account after 5 failed login attempts', async () => {
      const passwordHash = await hashPassword('Correct@123');
      (mockRepo.findUserByEmail as any).mockResolvedValue({
        id: 'user-1',
        email: 'locked@pratha.com',
        passwordHash,
        failedLoginAttempts: 4,
        lockedUntil: null,
        isActive: true,
        role: { name: 'ADMIN', rolePermissions: [] }
      } as any);

      await expect(
        authService.login({ email: 'locked@pratha.com', password: 'WrongPassword!' })
      ).rejects.toThrow(AccountLockedError);

      expect(mockRepo.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date)
        })
      );
    });

    it('should reset failed login count to 1 on first failed attempt after lockout expires', async () => {
      const passwordHash = await hashPassword('Correct@123');
      (mockRepo.findUserByEmail as any).mockResolvedValue({
        id: 'user-1',
        email: 'expired-lock@pratha.com',
        passwordHash,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() - 60000), // Lockout expired 1 min ago
        isActive: true,
        role: { name: 'ADMIN', rolePermissions: [] }
      } as any);

      await expect(
        authService.login({ email: 'expired-lock@pratha.com', password: 'WrongPasswordAgain!' })
      ).rejects.toThrow('Invalid email or password');

      expect(mockRepo.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          failedLoginAttempts: 1,
          lockedUntil: null
        })
      );
    });

    it('should detect refresh token reuse and revoke the entire token family', async () => {
      const tokenHash = hashToken('already-used-refresh-token');

      (mockRepo.findRefreshTokenByHash as any).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        family: 'family-uuid-1',
        revokedAt: new Date(Date.now() - 10000), // Already revoked!
        expiresAt: new Date(Date.now() + 100000),
        createdAt: new Date()
      });

      await expect(
        authService.refresh('already-used-refresh-token')
      ).rejects.toThrow('Refresh token reuse detected');

      expect(mockRepo.revokeTokenFamily).toHaveBeenCalledWith('family-uuid-1');
    });

    it('should change password and revoke all active refresh tokens', async () => {
      const oldHash = await hashPassword('OldPassword@123');
      (mockRepo.findUserById as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@pratha.com',
        passwordHash: oldHash,
        isActive: true,
        role: { name: 'ADMIN', rolePermissions: [] }
      } as any);

      await authService.changePassword('user-1', {
        currentPassword: 'OldPassword@123',
        newPassword: 'NewPassword@456',
        confirmPassword: 'NewPassword@456'
      });

      expect(mockRepo.updateUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$argon2id\$/)
        })
      );
      expect(mockRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-1');
    });
  });
});

