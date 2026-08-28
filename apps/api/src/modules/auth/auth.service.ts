import crypto from 'crypto';
import { authRepository, AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from '../../common/utils/argon2';
import {
  generateAccessToken,
  generateRandomToken,
  hashToken
} from '../../common/utils/tokens';
import {
  AuthenticationError,
  AccountLockedError,
  ValidationError
} from '../../common/errors/app-error';
import { sanitizeUser } from '../../common/utils/response';
import {
  LoginInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from '@ems/validation';
import { PermissionName, UserSummary } from '@ems/shared-types';
import { logger } from '../../common/utils/logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export class AuthService {
  constructor(private repo: AuthRepository = authRepository) {}

  private formatUser(user: any): UserSummary & { permissions: PermissionName[] } {
    const permissions: PermissionName[] = (user.role?.rolePermissions || []).map(
      (rp: any) => rp.permission.name as PermissionName
    );

    return sanitizeUser({
      ...user,
      salary: user.salary ? Number(user.salary) : null,
      permissions
    }) as unknown as UserSummary & { permissions: PermissionName[] };
  }

  async login(input: LoginInput): Promise<{
    user: UserSummary & { permissions: PermissionName[] };
    accessToken: string;
    refreshToken: string;
  }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repo.findUserByEmail(email);

    // Generic error for nonexistent user or invalid password
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      throw new AccountLockedError(
        `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`
      );
    }

    // Verify Argon2 password
    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      const isPostLockout = Boolean(user.lockedUntil && user.lockedUntil <= new Date());
      const attempts = isPostLockout ? 1 : user.failedLoginAttempts + 1;
      const isLocked = attempts >= MAX_FAILED_ATTEMPTS;

      await this.repo.updateUser(user.id, {
        failedLoginAttempts: attempts,
        lockedUntil: isLocked ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
      });

      if (isLocked) {
        throw new AccountLockedError(
          'Account is temporarily locked for 15 minutes due to multiple failed login attempts.'
        );
      }

      throw new AuthenticationError('Invalid email or password');
    }

    // User is active check
    if (!user.isActive) {
      throw new AuthenticationError('User account has been deactivated');
    }

    // Reset failed login attempts and record last login
    await this.repo.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    });

    // Generate JWT access token ({ userId } only)
    const accessToken = generateAccessToken(user.id);

    // Generate rotating refresh token & family
    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const family = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash,
      family,
      expiresAt
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  async refresh(rawRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!rawRefreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Reuse Detection: If the token was already revoked, token theft has occurred!
    if (storedToken.revokedAt !== null) {
      // Immediately revoke entire token family
      await this.repo.revokeTokenFamily(storedToken.family);
      logger.warn('Refresh token reuse detected! Revoked token family.', {
        userId: storedToken.userId,
        family: storedToken.family
      });
      throw new AuthenticationError(
        'Security violation: Refresh token reuse detected. All active sessions terminated.'
      );
    }

    // Expiration check
    if (storedToken.expiresAt < new Date()) {
      await this.repo.revokeRefreshToken(storedToken.id);
      throw new AuthenticationError('Refresh token has expired. Please log in again.');
    }

    // Verify user is still active
    const user = await this.repo.findUserById(storedToken.userId);
    if (!user || !user.isActive) {
      await this.repo.revokeRefreshToken(storedToken.id);
      throw new AuthenticationError('User account not found or deactivated');
    }

    // Rotate: Revoke the used refresh token
    await this.repo.revokeRefreshToken(storedToken.id);

    // Issue new refresh token in the same token family
    const newRawRefreshToken = generateRandomToken(40);
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: newTokenHash,
      family: storedToken.family,
      expiresAt
    });

    // Issue new access token
    const newAccessToken = generateAccessToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);
      if (storedToken && !storedToken.revokedAt) {
        await this.repo.revokeRefreshToken(storedToken.id);
      }
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserRefreshTokens(userId);
  }

  async me(userId: string): Promise<UserSummary & { permissions: PermissionName[] }> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or deactivated');
    }

    return this.formatUser(user);
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<UserSummary & { permissions: PermissionName[] }> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or deactivated');
    }

    const updated = await this.repo.updateUser(userId, {
      ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {})
    });

    return this.formatUser(updated);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or deactivated');
    }

    const isCurrentValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    if (input.currentPassword === input.newPassword) {
      throw new ValidationError('New password cannot be the same as current password');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await this.repo.updateUser(userId, {
      passwordHash: newPasswordHash
    });

    // Revoke all other refresh tokens for this user
    await this.repo.revokeAllUserRefreshTokens(userId);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repo.findUserByEmail(email);

    // Return generic message regardless to prevent user enumeration
    const genericResponse = {
      message: 'If an account with that email exists, password reset instructions have been sent.'
    };

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const rawResetToken = generateRandomToken(32);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.repo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    // In dev / if no mail provider, log the reset token to console
    logger.info(`🔑 [DEV/STAGING] Password reset requested for ${user.email}`);
    console.log('\n===============================================================');
    console.log(`🔑 PASSWORD RESET TOKEN FOR [${user.email}]`);
    console.log(`Token: ${rawResetToken}`);
    console.log(`Expires in: 1 hour`);
    console.log('===============================================================\n');

    return genericResponse;
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = hashToken(input.token.trim());
    const resetTokenRecord = await this.repo.findPasswordResetTokenByHash(tokenHash);

    if (
      !resetTokenRecord ||
      resetTokenRecord.usedAt !== null ||
      resetTokenRecord.expiresAt < new Date()
    ) {
      throw new AuthenticationError('Password reset token is invalid or has expired');
    }

    const user = await this.repo.findUserById(resetTokenRecord.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User account not found or deactivated');
    }

    const newPasswordHash = await hashPassword(input.password);

    // Update password, reset lockout, mark token used, and revoke all active refresh tokens
    await this.repo.updateUser(user.id, {
      passwordHash: newPasswordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    });

    await this.repo.markPasswordResetTokenUsed(resetTokenRecord.id);
    await this.repo.revokeAllUserRefreshTokens(user.id);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}

export const authService = new AuthService();
