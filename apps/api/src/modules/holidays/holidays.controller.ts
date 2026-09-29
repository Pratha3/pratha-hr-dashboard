import { Request, Response, NextFunction } from 'express';
import { holidaysService, HolidaysService } from './holidays.service';
import { sendSuccess } from '../../common/utils/response';

export class HolidaysController {
  constructor(private service: HolidaysService = holidaysService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const holidays = await this.service.listHolidays(req.organizationId!, year);
      sendSuccess(res, holidays);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const holiday = await this.service.createHoliday(req.organizationId!, req.body);
      sendSuccess(res, holiday, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const holiday = await this.service.updateHoliday(
        req.params.id,
        req.organizationId!,
        req.body
      );
      sendSuccess(res, holiday);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteHoliday(req.params.id, req.organizationId!);
      sendSuccess(res, { message: 'Holiday deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const holidaysController = new HolidaysController();
