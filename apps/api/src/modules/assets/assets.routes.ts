import { Router } from 'express';
import { assetsController } from './assets.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/authorization.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  assetQuerySchema
} from '@ems/validation';
import { Permissions } from '@ems/shared-types';

export const assetsRouter = Router();

assetsRouter.use(authMiddleware);

assetsRouter.get(
  '/',
  requirePermission(Permissions.ASSET_READ),
  validateQuery(assetQuerySchema),
  assetsController.list
);

assetsRouter.get(
  '/user/:userId',
  requirePermission(Permissions.ASSET_READ),
  assetsController.getByUserId
);

assetsRouter.get(
  '/:id',
  requirePermission(Permissions.ASSET_READ),
  assetsController.getById
);

assetsRouter.post(
  '/',
  requirePermission(Permissions.ASSET_CREATE),
  validateBody(createAssetSchema),
  assetsController.create
);

assetsRouter.put(
  '/:id',
  requirePermission(Permissions.ASSET_UPDATE),
  validateBody(updateAssetSchema),
  assetsController.update
);

assetsRouter.delete(
  '/:id',
  requirePermission(Permissions.ASSET_DELETE),
  assetsController.delete
);

assetsRouter.post(
  '/:id/assign',
  requirePermission(Permissions.ASSET_ASSIGN),
  validateBody(assignAssetSchema),
  assetsController.assign
);
