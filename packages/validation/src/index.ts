import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your new password' })
      .min(1, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((val) => val.trim().toLowerCase())
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'Reset token is required' })
      .min(1, 'Reset token is required'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ==================== PAGINATION & QUERY SCHEMAS ====================

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10) || 10;
      return Math.min(100, Math.max(1, parsed));
    }),
  search: z.string().optional().transform((val) => val?.trim() || undefined),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export const userQuerySchema = paginationQuerySchema.extend({
  role: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'INACTIVE']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true'))
});

export type UserQueryInput = z.infer<typeof userQuerySchema>;

export const auditLogQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().optional()
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// ==================== USER / EMPLOYEE UNIFIED SCHEMAS ====================

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().max(20).optional().nullable(),
  roleId: z.string().uuid('Valid role ID is required'),
  employeeCode: z.string().max(50).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  joiningDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .nullable(),
  salary: z.number().positive('Salary must be positive').optional().nullable(),
  status: z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'INACTIVE']).default('ACTIVE'),
  profileImageUrl: z.string().url().optional().nullable()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  employeeCode: z.string().max(50).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  joiningDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .nullable(),
  salary: z.number().positive('Salary must be positive').optional().nullable(),
  status: z.enum(['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'INACTIVE']).optional(),
  profileImageUrl: z.string().url().optional().nullable()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserRoleSchema = z.object({
  roleId: z.string().uuid('Valid role ID is required')
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

// ==================== DEPARTMENT SCHEMAS ====================

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100),
  description: z.string().trim().max(500).optional().nullable()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const updateDepartmentStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});

export type UpdateDepartmentStatusInput = z.infer<typeof updateDepartmentStatusSchema>;

// ==================== LEAVE SCHEMAS ====================

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid('Valid leave type ID is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters long').max(500)
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
    },
    {
      message: 'End date cannot be before start date',
      path: ['endDate']
    }
  );

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  actionNote: z.string().trim().max(500).optional().nullable()
});

export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;

// ==================== ANNOUNCEMENT SCHEMAS ====================

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().trim().min(10, 'Content must be at least 10 characters')
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

// ==================== PROJECT & STAFFING SCHEMAS ====================

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(150),
  clientName: z.string().trim().max(150).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional().default('ACTIVE'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD').optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional().nullable()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const assignProjectMemberSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  role: z.string().trim().min(2, 'Role must be at least 2 characters').max(50).default('Contributor'),
  allocation: z.number().int().min(1, 'Allocation must be at least 1%').max(100, 'Allocation cannot exceed 100%').default(100)
});

export type AssignProjectMemberInput = z.infer<typeof assignProjectMemberSchema>;

// ==================== HARDWARE & IT ASSET SCHEMAS ====================

export const createAssetSchema = z.object({
  name: z.string().trim().min(2, 'Asset name is required').max(100),
  serialNumber: z.string().trim().min(2, 'Serial number is required').max(100),
  type: z.enum(['LAPTOP', 'MONITOR', 'MOBILE_DEVICE', 'SECURITY_KEY', 'PERIPHERAL', 'OTHER']).default('LAPTOP'),
  status: z.enum(['ASSIGNED', 'AVAILABLE', 'IN_REPAIR', 'RETIRED']).optional().default('AVAILABLE'),
  assignedToId: z.string().uuid('Valid user ID is required').optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial();

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assignAssetSchema = z.object({
  assignedToId: z.string().uuid('Valid user ID is required').nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export type AssignAssetInput = z.infer<typeof assignAssetSchema>;

export const assetQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['LAPTOP', 'MONITOR', 'MOBILE_DEVICE', 'SECURITY_KEY', 'PERIPHERAL', 'OTHER']).optional(),
  status: z.enum(['ASSIGNED', 'AVAILABLE', 'IN_REPAIR', 'RETIRED']).optional(),
  assignedToId: z.string().uuid().optional()
});

export type AssetQueryInput = z.infer<typeof assetQuerySchema>;


