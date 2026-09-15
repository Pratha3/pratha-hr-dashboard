import { prisma } from '../../config/database';

export class AnnouncementsRepository {
  async findAll(organizationId?: string) {
    return prisma.announcement.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            role: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: { title: string; content: string; authorId: string; organizationId?: string }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        organizationId: data.organizationId || null
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            role: { select: { name: true } }
          }
        }
      }
    });
  }

  async delete(id: string) {
    return prisma.announcement.delete({
      where: { id }
    });
  }
}

export const announcementsRepository = new AnnouncementsRepository();
