import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  userQuerySchema
} from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const usersRouter = Router();

// All user routes require authentication
usersRouter.use(authMiddleware);

usersRouter.get(
  '/',
  requirePermission(Permissions.USER_READ),
  validateQuery(userQuerySchema),
  usersController.list
);

usersRouter.get('/metadata', usersController.getMetadata);

usersRouter.get(
  '/:id',
  requirePermission(Permissions.USER_READ),
  usersController.getById
);

usersRouter.post(
  '/',
  requirePermission(Permissions.USER_CREATE),
  validateBody(createUserSchema),
  usersController.create
);

usersRouter.put(
  '/:id',
  requirePermission(Permissions.USER_UPDATE),
  validateBody(updateUserSchema),
  usersController.update
);

usersRouter.patch(
  '/:id/status',
  requirePermission(Permissions.USER_DEACTIVATE),
  validateBody(updateUserStatusSchema),
  usersController.updateStatus
);

usersRouter.patch(
  '/:id/role',
  requirePermission(Permissions.USER_UPDATE),
  validateBody(updateUserRoleSchema),
  usersController.updateRole
);
