import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import {
  clockInSchema,
  clockOutSchema,
  attendanceQuerySchema,
  manualAttendanceSchema
} from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);
attendanceRouter.use(tenantMiddleware);

// Get current user's today attendance status
attendanceRouter.get(
  '/today',
  requirePermission(Permissions.ATTENDANCE_READ),
  attendanceController.getTodayStatus
);

// Clock in for current user
attendanceRouter.post(
  '/clock-in',
  requirePermission(Permissions.ATTENDANCE_RECORD),
  validateBody(clockInSchema),
  attendanceController.clockIn
);

// Clock out for current user
attendanceRouter.post(
  '/clock-out',
  requirePermission(Permissions.ATTENDANCE_RECORD),
  validateBody(clockOutSchema),
  attendanceController.clockOut
);

// List attendance records (filterable)
attendanceRouter.get(
  '/',
  requirePermission(Permissions.ATTENDANCE_READ),
  validateQuery(attendanceQuerySchema),
  attendanceController.list
);

// Admin / HR manual entry or adjustment
attendanceRouter.post(
  '/manual',
  requirePermission(Permissions.ATTENDANCE_MANAGE),
  validateBody(manualAttendanceSchema),
  attendanceController.logManual
);

// Delete record
attendanceRouter.delete(
  '/:id',
  requirePermission(Permissions.ATTENDANCE_MANAGE),
  attendanceController.delete
);
