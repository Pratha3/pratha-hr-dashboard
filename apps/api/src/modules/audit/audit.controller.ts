import { Request, Response, NextFunction } from 'express';
import { auditService, AuditService } from './audit.service';
import { sendSuccess } from '../../common/utils/response';

export class AuditController {
  constructor(private service: AuditService = auditService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listLogs(req.query as any);
      sendSuccess(res, result.logs, 200, result.meta);
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();

