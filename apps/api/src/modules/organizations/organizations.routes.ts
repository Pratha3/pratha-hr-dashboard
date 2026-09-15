import { Router } from 'express';
import { organizationsController } from './organizations.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createOrganizationSchema, updateOrganizationSchema } from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const organizationsRouter = Router();

// All organization routes require authentication
organizationsRouter.use(authMiddleware);

// Create organization & list current user's organizations
organizationsRouter.post(
  '/',
  validateBody(createOrganizationSchema),
  organizationsController.create
);

organizationsRouter.get('/', organizationsController.listMine);

// Organization management routes require active tenant context and permissions
organizationsRouter.get(
  '/:id',
  tenantMiddleware,
  requirePermission(Permissions.ORG_READ),
  organizationsController.getById
);

organizationsRouter.patch(
  '/:id',
  tenantMiddleware,
  requirePermission(Permissions.ORG_UPDATE),
  validateBody(updateOrganizationSchema),
  organizationsController.update
);
