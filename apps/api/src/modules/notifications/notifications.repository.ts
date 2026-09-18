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

  async createManyNotifications(
    data: Array<{
      userId: string;
      organizationId?: string | null;
      actorId?: string | null;
      type: string;
      title: string;
      message: string;
      link?: string | null;
      metadata?: any;
    }>
  ) {
    if (!data.length) return { count: 0 };
    return prisma.notification.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        organizationId: item.organizationId || null,
        actorId: item.actorId || null,
        type: item.type,
        title: item.title,
        message: item.message,
        link: item.link || null,
        metadata: item.metadata || null
      }))
    });
  }

  private buildWhereClause(userId: string, organizationId?: string | null, unreadOnly?: boolean) {
    const where: any = {
      userId
    };

    if (organizationId) {
      where.OR = [
        { organizationId },
        { organizationId: null }
      ];
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    return where;
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
    const where = this.buildWhereClause(userId, organizationId, unreadOnly);
    const unreadWhere = this.buildWhereClause(userId, organizationId, true);

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
      prisma.notification.count({ where: unreadWhere })
    ]);

    return {
      items,
      total,
      unreadCount
    };
  }

  async getUnreadCount(userId: string, organizationId?: string | null) {
    const where = this.buildWhereClause(userId, organizationId, true);
    return prisma.notification.count({ where });
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
    const where = this.buildWhereClause(userId, organizationId, true);
    return prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
