import { Request, Response, NextFunction } from 'express';
import { organizationsService, OrganizationsService } from './organizations.service';
import { sendSuccess } from '../../common/utils/response';
import { AuthorizationError } from '../../common/errors/app-error';

export class OrganizationsController {
  constructor(private service: OrganizationsService = organizationsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createOrganization(req.user!.id, req.body);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgs = await this.service.listUserOrganizations(req.user!.id);
      sendSuccess(res, orgs);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userOrgs = req.user?.organizations || [];
      const hasAccess = userOrgs.some((o: any) => o.id === req.params.id);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this organization');
      }

      const org = await this.service.getOrganization(req.params.id);
      sendSuccess(res, org);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.organizationId && req.organizationId !== req.params.id) {
        throw new AuthorizationError('You cannot modify an organization other than your active context');
      }

      const userOrgs = req.user?.organizations || [];
      const hasAccess = userOrgs.some((o: any) => o.id === req.params.id);
      if (!hasAccess) {
        throw new AuthorizationError('You do not belong to this organization');
      }

      const org = await this.service.updateOrganization(
        req.params.id,
        req.body,
        req.user?.id
      );
      sendSuccess(res, org);
    } catch (err) {
      next(err);
    }
  };
}

export const organizationsController = new OrganizationsController();
