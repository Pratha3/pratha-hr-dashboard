import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  assignProjectMemberSchema
} from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get(
  '/',
  requirePermission(Permissions.PROJECT_READ),
  projectsController.list
);

projectsRouter.get(
  '/user/:userId',
  requirePermission(Permissions.PROJECT_READ),
  projectsController.getByUserId
);

projectsRouter.get(
  '/:id',
  requirePermission(Permissions.PROJECT_READ),
  projectsController.getById
);

projectsRouter.post(
  '/',
  requirePermission(Permissions.PROJECT_CREATE),
  validateBody(createProjectSchema),
  projectsController.create
);

projectsRouter.put(
  '/:id',
  requirePermission(Permissions.PROJECT_UPDATE),
  validateBody(updateProjectSchema),
  projectsController.update
);

projectsRouter.delete(
  '/:id',
  requirePermission(Permissions.PROJECT_DELETE),
  projectsController.delete
);

projectsRouter.post(
  '/:id/members',
  requirePermission(Permissions.PROJECT_UPDATE),
  validateBody(assignProjectMemberSchema),
  projectsController.assignMember
);

projectsRouter.delete(
  '/:id/members/:userId',
  requirePermission(Permissions.PROJECT_UPDATE),
  projectsController.removeMember
);
