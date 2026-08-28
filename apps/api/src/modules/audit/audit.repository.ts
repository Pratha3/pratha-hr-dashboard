import { prisma } from '../../config/database';

export class AuditRepository {
  async findAll(page = 1, limit = 15, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' as const } },
            { entity: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {};

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export const auditRepository = new AuditRepository();
