import { prisma } from '../../config/database';

export class NotificationsRepository {
  async createNotification(data: {
    userId: string;
    organizationId?: string | null;
    actorId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    metadata?: any;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId || null,
        actorId: data.actorId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || null
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async findUserNotifications(
    userId: string,
    organizationId?: string | null,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;

    const where = {
      userId,
      ...(organizationId ? { organizationId } : {}),
      ...(unreadOnly ? { isRead: false } : {})
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          ...(organizationId ? { organizationId } : {}),
          isRead: false
        }
      })
    ]);

    return {
      items,
      total,
      unreadCount
    };
  }

  async getUnreadCount(userId: string, organizationId?: string | null) {
    return prisma.notification.count({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        isRead: false
      }
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async markAllAsRead(userId: string, organizationId?: string | null) {
    return prisma.notification.updateMany({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
