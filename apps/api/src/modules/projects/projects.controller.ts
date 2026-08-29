import { Request, Response, NextFunction } from 'express';
import { projectsService, ProjectsService } from './projects.service';
import { sendSuccess } from '../../common/utils/response';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AssignProjectMemberInput
} from '@ems/validation';

export class ProjectsController {
  constructor(private service: ProjectsService = projectsService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listProjects();
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getProjectById(req.params.id);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createProject(
        req.body as CreateProjectInput,
        req.user?.id
      );
      sendSuccess(res, data, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.updateProject(
        req.params.id,
        req.body as UpdateProjectInput,
        req.user?.id
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.deleteProject(req.params.id, req.user?.id);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  assignMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.assignMember(
        req.params.id,
        req.body as AssignProjectMemberInput,
        req.user?.id
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.removeMember(
        req.params.id,
        req.params.userId,
        req.user?.id
      );
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };

  getByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getProjectsByUserId(req.params.userId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  };
}

export const projectsController = new ProjectsController();
