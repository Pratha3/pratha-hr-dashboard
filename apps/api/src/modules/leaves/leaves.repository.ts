import { prisma } from '../../config/database';
import { LeaveStatus } from '@prisma/client';

export class LeavesRepository {
  async findTypes(organizationId?: string) {
    return prisma.leaveType.findMany({
      where: organizationId
        ? {
            OR: [
              { organizationId },
              { organizationId: null }
            ]
          }
        : undefined,
      orderBy: { name: 'asc' }
    });
  }

  async findLeaves(userId?: string, canManage: boolean = false, organizationId?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(canManage ? {} : { userId })
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            department: { select: { name: true } }
          }
        },
        leaveType: true,
        actionBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLeave(data: {
    userId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    organizationId?: string;
  }) {
    return prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        organizationId: data.organizationId || null,
        status: LeaveStatus.PENDING
      },
      include: {
        leaveType: true,
        user: {
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

  async updateStatus(
    id: string,
    status: LeaveStatus,
    actionById: string,
    actionNote?: string
  ) {
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        actionById,
        actionNote
      },
      include: {
        leaveType: true,
        user: {
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
}

export const leavesRepository = new LeavesRepository();
