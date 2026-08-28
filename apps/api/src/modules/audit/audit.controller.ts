import { Request, Response, NextFunction } from 'express';
import { auditService, AuditService } from './audit.service';
import { sendSuccess } from '../../common/utils/response';

export class AuditController {
  constructor(private service: AuditService = auditService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const search = req.query.search as string | undefined;

      const result = await this.service.listLogs(page, limit, search);
      sendSuccess(res, result.logs, 200, result.meta);
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();
