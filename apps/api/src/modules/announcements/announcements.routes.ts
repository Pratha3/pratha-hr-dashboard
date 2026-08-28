import { Router } from 'express';
import { announcementsController } from './announcements.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { Permissions } from '@ems/shared-types';

export const announcementsRouter = Router();

announcementsRouter.use(authMiddleware);

announcementsRouter.get(
  '/',
  requirePermission(Permissions.ANNOUNCEMENT_READ),
  announcementsController.list
);

announcementsRouter.post(
  '/',
  requirePermission(Permissions.ANNOUNCEMENT_CREATE),
  announcementsController.create
);

announcementsRouter.delete(
  '/:id',
  requirePermission(Permissions.ANNOUNCEMENT_DELETE),
  announcementsController.delete
);
