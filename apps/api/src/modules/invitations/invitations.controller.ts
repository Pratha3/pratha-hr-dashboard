import { Request, Response, NextFunction } from 'express';
import { invitationsService, InvitationsService } from './invitations.service';
import { sendSuccess } from '../../common/utils/response';

export class InvitationsController {
  constructor(private service: InvitationsService = invitationsService) {}

  invite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.inviteMember(
        req.organizationId!,
        req.body,
        req.user?.id
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  listPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invites = await this.service.listPendingInvitations(req.organizationId!);
      sendSuccess(res, invites);
    } catch (err) {
      next(err);
    }
  };

  getByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invite = await this.service.getInvitationByToken(req.params.token);
      sendSuccess(res, invite);
    } catch (err) {
      next(err);
    }
  };

  accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.acceptInvitation(req.body, req.user?.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.revokeInvitation(
        req.organizationId!,
        req.params.id,
        req.user?.id
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

export const invitationsController = new InvitationsController();
