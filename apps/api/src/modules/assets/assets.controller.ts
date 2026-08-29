import { Request, Response, NextFunction } from 'express';
import { assetsService, AssetsService } from './assets.service';
import { sendSuccess } from '../../common/utils/response';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssignAssetInput,
  AssetQueryInput
} from '@ems/validation';

export class AssetsController {
  constructor(private service: AssetsService = assetsService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { assets, page, limit, total, totalPages } = await this.service.listAssets(
        req.query as unknown as AssetQueryInput
      );
      sendSuccess(res, assets, 200, {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getAssetById(req.params.id);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createAsset(
        req.body as CreateAssetInput,
        req.user?.id
      );
      sendSuccess(res, data, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.updateAsset(
        req.params.id,
        req.body as UpdateAssetInput,
        req.user?.id
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.deleteAsset(req.params.id, req.user?.id);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.assignAsset(
        req.params.id,
        req.body as AssignAssetInput,
        req.user?.id
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  getByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getAssetsByUserId(req.params.userId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };
}

export const assetsController = new AssetsController();
