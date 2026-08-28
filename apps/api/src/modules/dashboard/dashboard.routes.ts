import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { Permissions } from '@ems/shared-types';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get(
  '/stats',
  requirePermission(Permissions.DASHBOARD_READ),
  dashboardController.stats
);
