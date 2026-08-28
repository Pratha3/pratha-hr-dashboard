import { announcementsRepository, AnnouncementsRepository } from './announcements.repository';
import { NotFoundError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';

export class AnnouncementsService {
  constructor(private repo: AnnouncementsRepository = announcementsRepository) {}

  async listAnnouncements() {
    return this.repo.findAll();
  }

  async createAnnouncement(data: { title: string; content: string; authorId: string }) {
    const announcement = await this.repo.create({
      title: data.title.trim(),
      content: data.content.trim(),
      authorId: data.authorId
    });

    await prisma.auditLog.create({
      data: {
        userId: data.authorId,
        action: 'ANNOUNCEMENT_CREATED',
        entity: 'Announcement',
        entityId: announcement.id,
        metadata: { title: announcement.title }
      }
    });

    return announcement;
  }

  async deleteAnnouncement(id: string, actorId?: string) {
    const existing = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    const result = await this.repo.delete(id);

    await prisma.auditLog.create({
      data: {
        userId: actorId || null,
        action: 'ANNOUNCEMENT_DELETED',
        entity: 'Announcement',
        entityId: id,
        metadata: { title: existing.title }
      }
    });

    return result;
  }
}

export const announcementsService = new AnnouncementsService();

