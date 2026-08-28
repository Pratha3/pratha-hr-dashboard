import { Request, Response, NextFunction } from 'express';
import { usersService, UsersService } from './users.service';
import { sendSuccess } from '../../common/utils/response';

export class UsersController {
  constructor(private service: UsersService = usersService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listUsers(req.query as any, req.user!.permissions);
      sendSuccess(res, result.users, 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getUserById(req.params.id, req.user!.permissions);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.createUser(req.body, req.user?.id);
      sendSuccess(res, user, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateUser(req.params.id, req.body, req.user?.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateUserStatus(req.params.id, req.body, req.user?.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateUserRole(req.params.id, req.body, req.user?.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  getMetadata = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metadata = await this.service.getMetadata();
      sendSuccess(res, metadata);
    } catch (err) {
      next(err);
    }
  };
}

export const usersController = new UsersController();
