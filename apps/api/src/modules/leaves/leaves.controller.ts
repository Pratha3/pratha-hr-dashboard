import { Request, Response, NextFunction } from 'express';
import { leavesService, LeavesService } from './leaves.service';
import { sendSuccess } from '../../common/utils/response';
import { LeaveStatus } from '@prisma/client';

export class LeavesController {
  constructor(private service: LeavesService = leavesService) {}

  listTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = await this.service.listTypes(req.organizationId);
      sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leaves = await this.service.listLeaves(
        req.user!.id,
        req.user!.permissions,
        req.organizationId
      );
      sendSuccess(res, leaves);
    } catch (err) {
      next(err);
    }
  };

  apply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leave = await this.service.applyLeave(
        {
          ...req.body,
          userId: req.user!.id
        },
        req.organizationId
      );
      sendSuccess(res, leave, 201);
    } catch (err) {
      next(err);
    }
  };

  action = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, actionNote } = req.body;
      const leave = await this.service.actionLeave(
        req.params.id,
        status as LeaveStatus,
        req.user!.id,
        actionNote,
        req.organizationId
      );
      sendSuccess(res, leave);
    } catch (err) {
      next(err);
    }
  };
}

export const leavesController = new LeavesController();
