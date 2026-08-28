import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { Permissions } from '@ems/shared-types';

export const auditRouter = Router();

auditRouter.use(authMiddleware);

auditRouter.get(
  '/',
  requirePermission(Permissions.AUDIT_READ),
  auditController.list
);
