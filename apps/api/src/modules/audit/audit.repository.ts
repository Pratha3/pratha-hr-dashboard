import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { AuditLogQueryInput } from '@ems/validation';

export class AuditRepository {
  async findAll(params: AuditLogQueryInput & { organizationId?: string }) {
    const {
      page = 1,
      limit = 15,
      search,
      userId,
      action,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      organizationId
    } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 15));
    const skip = (safePage - 1) * safeLimit;

    const cleanSearch = search?.trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(userId ? { userId } : {}),
      ...(action ? { action: { equals: action, mode: 'insensitive' } } : {}),
      ...(cleanSearch
        ? {
            OR: [
              { action: { contains: cleanSearch, mode: 'insensitive' as const } },
              { entity: { contains: cleanSearch, mode: 'insensitive' as const } },
              { entityId: { contains: cleanSearch, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
    ]);

    return {
      logs,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNextPage: safePage < Math.ceil(total / safeLimit),
        hasPreviousPage: safePage > 1
      }
    };
  }
}

export const auditRepository = new AuditRepository();

