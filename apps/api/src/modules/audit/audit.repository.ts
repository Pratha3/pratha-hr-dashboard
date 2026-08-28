import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { AuditLogQueryInput } from '@ems/validation';

export class AuditRepository {
  async findAll(params: AuditLogQueryInput) {
    const {
      page = 1,
      limit = 15,
      search,
      userId,
      action,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const skip = (page - 1) * limit;

    const cleanSearch = search?.trim();

    const where: Prisma.AuditLogWhereInput = {
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
        take: limit,
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  }
}

export const auditRepository = new AuditRepository();

