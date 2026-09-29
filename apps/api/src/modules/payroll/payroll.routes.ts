import { Router } from 'express';
import { payrollController } from './payroll.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import {
  generatePayrollSchema,
  updatePayrollStatusSchema,
  updatePayslipSchema,
  payrollQuerySchema,
  payslipQuerySchema
} from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const payrollRouter = Router();

payrollRouter.use(authMiddleware);
payrollRouter.use(tenantMiddleware);

// Get Payroll Overview Summary (KPIs)
payrollRouter.get(
  '/summary',
  requirePermission(Permissions.PAYROLL_READ),
  payrollController.getSummary
);

// Generate / Run Monthly Payroll Batch
payrollRouter.post(
  '/generate',
  requirePermission(Permissions.PAYROLL_GENERATE),
  validateBody(generatePayrollSchema),
  payrollController.generate
);

// List Payroll Runs (Batches)
payrollRouter.get(
  '/runs',
  requirePermission(Permissions.PAYROLL_READ),
  validateQuery(payrollQuerySchema),
  payrollController.listRuns
);

// Get Single Payroll Run by ID
payrollRouter.get(
  '/runs/:id',
  requirePermission(Permissions.PAYROLL_READ),
  payrollController.getRunById
);

// Update Payroll Run Status (e.g. APPROVED, PAID)
payrollRouter.patch(
  '/runs/:id/status',
  requirePermission(Permissions.PAYROLL_MANAGE),
  validateBody(updatePayrollStatusSchema),
  payrollController.updateRunStatus
);

// Delete Payroll Run (if not PAID)
payrollRouter.delete(
  '/runs/:id',
  requirePermission(Permissions.PAYROLL_MANAGE),
  payrollController.deleteRun
);

// List Payslips (Accessible by Employee for self or HR for all)
payrollRouter.get(
  '/payslips',
  requirePermission(Permissions.PAYSLIP_READ_SELF),
  validateQuery(payslipQuerySchema),
  payrollController.listPayslips
);

// Get Single Payslip by ID
payrollRouter.get(
  '/payslips/:id',
  requirePermission(Permissions.PAYSLIP_READ_SELF),
  payrollController.getPayslipById
);

// Adjust / Update Individual Payslip
payrollRouter.patch(
  '/payslips/:id',
  requirePermission(Permissions.PAYROLL_MANAGE),
  validateBody(updatePayslipSchema),
  payrollController.updatePayslip
);
