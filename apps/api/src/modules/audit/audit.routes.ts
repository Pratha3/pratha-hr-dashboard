import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateQuery } from '../../middleware/validate.middleware';
import { auditLogQuerySchema } from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const auditRouter = Router();

auditRouter.use(authMiddleware);

auditRouter.get(
  '/',
  requirePermission(Permissions.AUDIT_READ),
  validateQuery(auditLogQuerySchema),
  auditController.list
);

