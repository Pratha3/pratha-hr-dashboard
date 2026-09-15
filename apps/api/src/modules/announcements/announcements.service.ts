import { announcementsRepository, AnnouncementsRepository } from './announcements.repository';
import { NotFoundError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';

export class AnnouncementsService {
  constructor(private repo: AnnouncementsRepository = announcementsRepository) {}

  async listAnnouncements(organizationId?: string) {
    return this.repo.findAll(organizationId);
  }

  async createAnnouncement(
    data: { title: string; content: string; authorId: string },
    organizationId?: string
  ) {
    const announcement = await this.repo.create({
      title: data.title.trim(),
      content: data.content.trim(),
      authorId: data.authorId,
      organizationId
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: data.authorId,
        action: 'ANNOUNCEMENT_CREATED',
        entity: 'Announcement',
        entityId: announcement.id,
        metadata: { title: announcement.title, organizationId }
      }
    });

    return announcement;
  }

  async deleteAnnouncement(id: string, actorId?: string, organizationId?: string) {
    const existing = await prisma.announcement.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {})
      }
    });

    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    const result = await this.repo.delete(id);

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actorId || null,
        action: 'ANNOUNCEMENT_DELETED',
        entity: 'Announcement',
        entityId: id,
        metadata: { title: existing.title, organizationId }
      }
    });

    return result;
  }
}

export const announcementsService = new AnnouncementsService();

