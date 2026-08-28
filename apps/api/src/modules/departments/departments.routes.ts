import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { Permissions } from '@ems/shared-types';

export const departmentsRouter = Router();

departmentsRouter.use(authMiddleware);

departmentsRouter.get(
  '/',
  requirePermission(Permissions.DEPARTMENT_READ),
  departmentsController.list
);

departmentsRouter.get(
  '/:id',
  requirePermission(Permissions.DEPARTMENT_READ),
  departmentsController.getById
);

departmentsRouter.post(
  '/',
  requirePermission(Permissions.DEPARTMENT_CREATE),
  departmentsController.create
);

departmentsRouter.put(
  '/:id',
  requirePermission(Permissions.DEPARTMENT_UPDATE),
  departmentsController.update
);

departmentsRouter.patch(
  '/:id/status',
  requirePermission(Permissions.DEPARTMENT_DEACTIVATE),
  departmentsController.update
);
