import { prisma } from '../../config/database';

export class AnnouncementsRepository {
  async findAll() {
    return prisma.announcement.findMany({
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

  async create(data: { title: string; content: string; authorId: string }) {
    return prisma.announcement.create({
      data,
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
