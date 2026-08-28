import { Request, Response, NextFunction } from 'express';
import { announcementsService, AnnouncementsService } from './announcements.service';
import { sendSuccess } from '../../common/utils/response';

export class AnnouncementsController {
  constructor(private service: AnnouncementsService = announcementsService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const announcements = await this.service.listAnnouncements();
      sendSuccess(res, announcements);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, content } = req.body;
      const announcement = await this.service.createAnnouncement({
        title,
        content,
        authorId: req.user!.id
      });
      sendSuccess(res, announcement, 201);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteAnnouncement(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}

export const announcementsController = new AnnouncementsController();
