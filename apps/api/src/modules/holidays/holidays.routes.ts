import { Router } from 'express';
import { holidaysController } from './holidays.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createHolidaySchema, updateHolidaySchema } from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const holidaysRouter = Router();

holidaysRouter.use(authMiddleware);
holidaysRouter.use(tenantMiddleware);

holidaysRouter.get(
  '/',
  requirePermission(Permissions.HOLIDAY_READ),
  holidaysController.list
);

holidaysRouter.post(
  '/',
  requirePermission(Permissions.HOLIDAY_MANAGE),
  validateBody(createHolidaySchema),
  holidaysController.create
);

holidaysRouter.patch(
  '/:id',
  requirePermission(Permissions.HOLIDAY_MANAGE),
  validateBody(updateHolidaySchema),
  holidaysController.update
);

holidaysRouter.delete(
  '/:id',
  requirePermission(Permissions.HOLIDAY_MANAGE),
  holidaysController.delete
);
