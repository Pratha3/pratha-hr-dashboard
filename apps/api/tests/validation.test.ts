import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  updateProjectSchema,
  assignProjectMemberSchema,
  createAssetSchema,
  assignAssetSchema
} from '@ems/validation';

describe('Validation Schemas Unit Tests', () => {
  describe('createProjectSchema', () => {
    it('should validate valid project input', () => {
      const input = {
        name: 'Mobile App Redesign',
        clientName: 'Acme Corp',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        description: 'Overhaul UI/UX'
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Mobile App Redesign');
        expect(result.data.startDate).toBe('2026-01-01');
      }
    });

    it('should transform empty date strings to null', () => {
      const input = {
        name: 'Internal Infrastructure',
        startDate: '',
        endDate: ''
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeNull();
        expect(result.data.endDate).toBeNull();
      }
    });

    it('should reject short project name', () => {
      const input = {
        name: 'A'
      };

      const result = createProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('assignProjectMemberSchema', () => {
    it('should validate valid assignment input', () => {
      const input = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'Tech Lead',
        allocation: 80
      };

      const result = assignProjectMemberSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('Tech Lead');
        expect(result.data.allocation).toBe(80);
      }
    });

    it('should set default role and allocation when omitted', () => {
      const input = {
        userId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = assignProjectMemberSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('Contributor');
        expect(result.data.allocation).toBe(100);
      }
    });

    it('should reject invalid UUID', () => {
      const input = {
        userId: 'not-a-uuid'
      };

      const result = assignProjectMemberSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject allocation over 100', () => {
      const input = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        allocation: 150
      };

      const result = assignProjectMemberSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createAssetSchema & assignAssetSchema', () => {
    it('should validate creating a laptop asset', () => {
      const input = {
        name: 'MacBook Pro 16',
        serialNumber: 'C02G1234MD6R',
        type: 'LAPTOP',
        status: 'AVAILABLE'
      };

      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate assigning asset to user', () => {
      const input = {
        assignedToId: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Assigned for remote work'
      };

      const result = assignAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
