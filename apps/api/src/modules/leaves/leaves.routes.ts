import { Router } from 'express';
import { leavesController } from './leaves.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { Permissions } from '@ems/shared-types';

export const leavesRouter = Router();

leavesRouter.use(authMiddleware);

leavesRouter.get(
  '/types',
  requirePermission(Permissions.LEAVE_READ),
  leavesController.listTypes
);

leavesRouter.get(
  '/',
  requirePermission(Permissions.LEAVE_READ),
  leavesController.list
);

leavesRouter.post(
  '/',
  requirePermission(Permissions.LEAVE_APPLY),
  leavesController.apply
);

leavesRouter.patch(
  '/:id/status',
  requirePermission(Permissions.LEAVE_MANAGE),
  leavesController.action
);
