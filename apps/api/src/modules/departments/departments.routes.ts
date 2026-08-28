import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema
} from '@ems/validation';
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
  validateBody(createDepartmentSchema),
  departmentsController.create
);

departmentsRouter.put(
  '/:id',
  requirePermission(Permissions.DEPARTMENT_UPDATE),
  validateBody(updateDepartmentSchema),
  departmentsController.update
);

departmentsRouter.patch(
  '/:id/status',
  requirePermission(Permissions.DEPARTMENT_DEACTIVATE),
  validateBody(updateDepartmentStatusSchema),
  departmentsController.update
);

