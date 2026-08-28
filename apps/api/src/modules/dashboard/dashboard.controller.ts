import { Request, Response, NextFunction } from 'express';
import { dashboardService, DashboardService } from './dashboard.service';
import { sendSuccess } from '../../common/utils/response';

export class DashboardController {
  constructor(private service: DashboardService = dashboardService) {}

  stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.getStats();
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  };
}

export const dashboardController = new DashboardController();
