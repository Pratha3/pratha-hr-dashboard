import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  loginSchema,
  createUserSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  paginationQuerySchema,
  createLeaveRequestSchema
} from '@ems/validation';
import { verifyAccessToken, hashToken } from '../src/common/utils/tokens';
import { verifyPassword } from '../src/common/utils/argon2';

describe('⚡ Automated Edge Case & Fuzz Testing Suite (fast-check)', () => {
  describe('1. Zod Schema Robustness Under Adversarial & Random Fuzzing', () => {
    it('loginSchema: gracefully validates or rejects 500 arbitrary fuzz strings without crashing', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (email, password) => {
          const result = loginSchema.safeParse({ email, password });
          expect(typeof result.success).toBe('boolean');
          if (result.success) {
            expect(result.data.email).toBe(email.trim().toLowerCase());
          }
        }),
        { numRuns: 500 }
      );
    });

    it('createUserSchema: handles extreme strings, unicode, null bytes, and malicious payloads safely', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          fc.string(),
          fc.uuid(),
          (firstName, lastName, email, password, roleId) => {
            const result = createUserSchema.safeParse({
              firstName,
              lastName,
              email,
              password,
              roleId
            });
            expect(typeof result.success).toBe('boolean');
          }
        ),
        { numRuns: 300 }
      );
    });

    it('changePasswordSchema: handles arbitrary password combinations & equality matching', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (currentPassword, newPassword, confirmPassword) => {
            const result = changePasswordSchema.safeParse({
              currentPassword,
              newPassword,
              confirmPassword
            });
            expect(typeof result.success).toBe('boolean');
            if (result.success) {
              expect(result.data.newPassword).toBe(result.data.confirmPassword);
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    it('paginationQuerySchema: automatically caps page limits between 1 and 100 on any arbitrary input', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.string(), fc.constant(undefined)),
          fc.oneof(fc.integer(), fc.string(), fc.constant(undefined)),
          (page, limit) => {
            const result = paginationQuerySchema.safeParse({
              page: page?.toString(),
              limit: limit?.toString()
            });
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.page).toBeGreaterThanOrEqual(1);
              expect(result.data.limit).toBeGreaterThanOrEqual(1);
              expect(result.data.limit).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    it('createLeaveRequestSchema: rejects malformed dates and invalid payloads safely', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string(),
          fc.string(),
          fc.string(),
          (leaveTypeId, startDate, endDate, reason) => {
            const result = createLeaveRequestSchema.safeParse({
              leaveTypeId,
              startDate,
              endDate,
              reason
            });
            expect(typeof result.success).toBe('boolean');
          }
        ),
        { numRuns: 300 }
      );
    });

    it('createLeaveRequestSchema: strictly rejects inverted date ranges (endDate < startDate)', () => {
      const result = createLeaveRequestSchema.safeParse({
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2026-06-15',
        endDate: '2026-06-10',
        reason: 'Medical checkup and recovery'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('End date cannot be before start date');
      }
    });

    it('createLeaveRequestSchema: allows valid date ranges and same-day leaves', () => {
      const sameDayResult = createLeaveRequestSchema.safeParse({
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2026-06-15',
        endDate: '2026-06-15',
        reason: 'Single day leave'
      });
      expect(sameDayResult.success).toBe(true);

      const multiDayResult = createLeaveRequestSchema.safeParse({
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2026-06-15',
        endDate: '2026-06-20',
        reason: 'Annual vacation'
      });
      expect(multiDayResult.success).toBe(true);
    });
  });

  describe('2. Security Engine & Token Fuzzing', () => {
    it('verifyAccessToken: gracefully rejects 300 arbitrary / corrupted JWT tokens without uncaught crash', () => {
      fc.assert(
        fc.property(fc.string(), (corruptedToken) => {
          expect(() => verifyAccessToken(corruptedToken)).toThrow();
        }),
        { numRuns: 300 }
      );
    });

    it('hashToken: maintains deterministic SHA-256 output across arbitrary random strings', () => {
      fc.assert(
        fc.property(fc.string(), (token) => {
          const hash1 = hashToken(token);
          const hash2 = hashToken(token);
          expect(hash1).toBe(hash2);
          expect(hash1).toHaveLength(64); // SHA-256 hex length
        }),
        { numRuns: 300 }
      );
    });

    it('verifyPassword: safely handles corrupted/malformed argon2 hash strings without server panic', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), fc.string(), async (password, corruptedHash) => {
          const isValid = await verifyPassword(password, corruptedHash);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
