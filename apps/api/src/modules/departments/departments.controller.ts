import { Request, Response, NextFunction } from 'express';
import { departmentsService, DepartmentsService } from './departments.service';
import { sendSuccess } from '../../common/utils/response';

export class DepartmentsController {
  constructor(private service: DepartmentsService = departmentsService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departments = await this.service.listDepartments();
      sendSuccess(res, departments);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const department = await this.service.getDepartment(req.params.id);
      sendSuccess(res, department);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const department = await this.service.createDepartment(req.body);
      sendSuccess(res, department, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const department = await this.service.updateDepartment(req.params.id, req.body);
      sendSuccess(res, department);
    } catch (err) {
      next(err);
    }
  };
}

export const departmentsController = new DepartmentsController();
