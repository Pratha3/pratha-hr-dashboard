import { Router } from 'express';
import { invitationsController } from './invitations.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware, requireTenant } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { inviteMemberSchema, acceptInvitationSchema } from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const invitationsRouter = Router();

// Public invitation inspection & acceptance
invitationsRouter.get('/token/:token', invitationsController.getByToken);
invitationsRouter.get('/verify/:token', invitationsController.getByToken);
invitationsRouter.post(
  '/accept',
  validateBody(acceptInvitationSchema),
  invitationsController.accept
);

// Protected routes (tenant admin / hr actions)
invitationsRouter.use(authMiddleware);
invitationsRouter.use(tenantMiddleware);
invitationsRouter.use(requireTenant);

invitationsRouter.post(
  '/',
  requirePermission(Permissions.MEMBER_INVITE),
  validateBody(inviteMemberSchema),
  invitationsController.invite
);

invitationsRouter.get(
  '/',
  requirePermission(Permissions.ORG_READ),
  invitationsController.listPending
);

invitationsRouter.delete(
  '/:id',
  requirePermission(Permissions.MEMBER_MANAGE),
  invitationsController.revoke
);
