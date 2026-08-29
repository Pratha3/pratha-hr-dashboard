import { prisma } from '../../config/database';
import { AssetType, AssetStatus, Prisma } from '@prisma/client';
import { AssetQueryInput } from '@ems/validation';

export class AssetsRepository {
  async findAssets(query: AssetQueryInput) {
    const { page, limit, search, type, status, assignedToId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      ...(type ? { type: type as AssetType } : {}),
      ...(status ? { status: status as AssetStatus } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              {
                assignedTo: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { employeeCode: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          }
        : {})
    };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeCode: true,
              position: true,
              department: {
                select: { id: true, name: true }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' }
      }),
      prisma.asset.count({ where })
    ]);

    return {
      assets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
  }

  async findBySerialNumber(serialNumber: string) {
    return prisma.asset.findUnique({
      where: { serialNumber }
    });
  }

  async create(data: {
    name: string;
    serialNumber: string;
    type?: AssetType;
    status?: AssetStatus;
    assignedToId?: string | null;
    notes?: string | null;
  }) {
    return prisma.asset.create({
      data: {
        name: data.name,
        serialNumber: data.serialNumber,
        type: data.type ?? 'LAPTOP',
        status: data.assignedToId ? 'ASSIGNED' : data.status ?? 'AVAILABLE',
        assignedToId: data.assignedToId ?? null,
        assignedDate: data.assignedToId ? new Date() : null,
        notes: data.notes ?? null
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      serialNumber?: string;
      type?: AssetType;
      status?: AssetStatus;
      assignedToId?: string | null;
      assignedDate?: Date | null;
      notes?: string | null;
    }
  ) {
    return prisma.asset.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
  }

  async delete(id: string) {
    return prisma.asset.delete({
      where: { id }
    });
  }

  async findByUserId(userId: string) {
    return prisma.asset.findMany({
      where: { assignedToId: userId },
      orderBy: { assignedDate: 'desc' }
    });
  }
}

export const assetsRepository = new AssetsRepository();
