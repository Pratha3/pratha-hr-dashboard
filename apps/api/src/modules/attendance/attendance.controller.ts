import { Request, Response, NextFunction } from 'express';
import { attendanceService, AttendanceService } from './attendance.service';
import { sendSuccess } from '../../common/utils/response';

export class AttendanceController {
  constructor(private service: AttendanceService = attendanceService) {}

  getTodayStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await this.service.getTodayStatus(req.user!.id, req.organizationId);
      sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  };

  clockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.service.clockIn(
        req.user!.id,
        req.organizationId!,
        req.body,
        req.ip
      );
      sendSuccess(res, record, 201);
    } catch (err) {
      next(err);
    }
  };

  clockOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.service.clockOut(
        req.user!.id,
        req.organizationId!,
        req.body
      );
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.listAttendance(
        req.organizationId!,
        req.query as any,
        req.user!.id,
        req.user!.permissions
      );
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  };

  logManual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await this.service.logManualAttendance(
        req.organizationId!,
        req.body,
        req.user!.id
      );
      sendSuccess(res, record, 201);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteAttendance(req.params.id, req.organizationId!);
      sendSuccess(res, { message: 'Attendance record deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceController = new AttendanceController();
