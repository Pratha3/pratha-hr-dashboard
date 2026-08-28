// Permissions
export const Permissions = {
  // Auth
  AUTH_LOGIN: 'AUTH_LOGIN',

  // Users & Workforce Management (Unified)
  USER_READ: 'USER_READ',
  USER_READ_SALARY: 'USER_READ_SALARY',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_DELETE: 'USER_DELETE',

  // Departments
  DEPARTMENT_READ: 'DEPARTMENT_READ',
  DEPARTMENT_CREATE: 'DEPARTMENT_CREATE',
  DEPARTMENT_UPDATE: 'DEPARTMENT_UPDATE',
  DEPARTMENT_DEACTIVATE: 'DEPARTMENT_DEACTIVATE',

  // Leave Management
  LEAVE_READ: 'LEAVE_READ',
  LEAVE_APPLY: 'LEAVE_APPLY',
  LEAVE_MANAGE: 'LEAVE_MANAGE',

  // Announcements
  ANNOUNCEMENT_READ: 'ANNOUNCEMENT_READ',
  ANNOUNCEMENT_CREATE: 'ANNOUNCEMENT_CREATE',
  ANNOUNCEMENT_DELETE: 'ANNOUNCEMENT_DELETE',

  // Dashboard & Audit
  DASHBOARD_READ: 'DASHBOARD_READ',
  AUDIT_READ: 'AUDIT_READ'
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

export const SystemRoles = {
  ADMIN: 'ADMIN',
  HR: 'HR',
  EMPLOYEE: 'EMPLOYEE'
} as const;

export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];

export const HR_PERMISSIONS: PermissionName[] = [
  Permissions.AUTH_LOGIN,
  Permissions.USER_READ,
  Permissions.USER_READ_SALARY,
  Permissions.USER_CREATE,
  Permissions.USER_UPDATE,
  Permissions.DEPARTMENT_READ,
  Permissions.LEAVE_READ,
  Permissions.LEAVE_APPLY,
  Permissions.LEAVE_MANAGE,
  Permissions.ANNOUNCEMENT_READ,
  Permissions.ANNOUNCEMENT_CREATE,
  Permissions.DASHBOARD_READ
];

export const EMPLOYEE_PERMISSIONS: PermissionName[] = [
  Permissions.AUTH_LOGIN,
  Permissions.USER_READ,
  Permissions.DEPARTMENT_READ,
  Permissions.LEAVE_READ,
  Permissions.LEAVE_APPLY,
  Permissions.ANNOUNCEMENT_READ,
  Permissions.DASHBOARD_READ
];

export const ALL_PERMISSIONS: PermissionName[] = Object.values(Permissions);

// Enums
export type EmployeeStatus = 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'INACTIVE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Standard API Response Interfaces
export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
  };
  requestId: string;
}

// Department DTO
export interface DepartmentDto {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    users?: number;
  };
}

// Unified User & Employee Models
export interface UserSummary {
  id: string;
  employeeCode?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  position?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  joiningDate?: Date | string | null;
  salary?: number | null; // Stripped if requester lacks USER_READ_SALARY
  status: EmployeeStatus;
  roleId: string;
  role: {
    id: string;
    name: string;
    description?: string | null;
  };
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  permissions: PermissionName[];
  isActive: boolean;
  departmentId?: string | null;
}

export interface LoginResponseData {
  user: UserSummary & { permissions: PermissionName[] };
  accessToken: string;
}

export interface RefreshResponseData {
  accessToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Leave DTOs
export interface LeaveTypeDto {
  id: string;
  name: string;
  daysAllowed: number;
  createdAt: Date | string;
}

export interface LeaveRequestDto {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode?: string | null;
    position?: string | null;
  };
  leaveTypeId: string;
  leaveType?: {
    id: string;
    name: string;
  };
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  status: LeaveStatus;
  actionById?: string | null;
  actionBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  actionNote?: string | null;
  createdAt: Date | string;
}

// Announcement DTO
export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date | string;
}

// Audit Log DTO
export interface AuditLogDto {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

export interface DashboardStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  activeDepartments: number;
  pendingLeaves: number;
  totalAnnouncements: number;
}
