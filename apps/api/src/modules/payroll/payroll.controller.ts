import { Request, Response, NextFunction } from 'express';
import { payrollService, PayrollService } from './payroll.service';
import { sendSuccess } from '../../common/utils/response';

export class PayrollController {
  constructor(private service: PayrollService = payrollService) {}

  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const summary = await this.service.getPayrollSummary(req.organizationId!, year, month);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const run = await this.service.generatePayrollRun(
        req.organizationId!,
        req.body,
        req.user!.id
      );
      sendSuccess(res, run, 201);
    } catch (err) {
      next(err);
    }
  };

  listRuns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const runs = await this.service.listPayrollRuns(req.organizationId!, req.query as any);
      sendSuccess(res, runs);
    } catch (err) {
      next(err);
    }
  };

  getRunById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const run = await this.service.getPayrollRunById(req.params.id, req.organizationId!);
      sendSuccess(res, run);
    } catch (err) {
      next(err);
    }
  };

  updateRunStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const run = await this.service.updatePayrollRunStatus(
        req.params.id,
        req.organizationId!,
        req.body
      );
      sendSuccess(res, run);
    } catch (err) {
      next(err);
    }
  };

  listPayslips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payslips = await this.service.listPayslips(
        req.organizationId!,
        req.query as any,
        req.user!.id,
        req.user!.permissions
      );
      sendSuccess(res, payslips);
    } catch (err) {
      next(err);
    }
  };

  getPayslipById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payslip = await this.service.getPayslipById(
        req.params.id,
        req.organizationId!,
        req.user!.id,
        req.user!.permissions
      );
      sendSuccess(res, payslip);
    } catch (err) {
      next(err);
    }
  };

  updatePayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payslip = await this.service.updatePayslip(
        req.params.id,
        req.organizationId!,
        req.body
      );
      sendSuccess(res, payslip);
    } catch (err) {
      next(err);
    }
  };

  deleteRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deletePayrollRun(req.params.id, req.organizationId!);
      sendSuccess(res, { message: 'Payroll run deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const payrollController = new PayrollController();
