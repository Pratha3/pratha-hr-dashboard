import { prisma } from '../../config/database';
import { LeaveStatus } from '@prisma/client';

export class LeavesRepository {
  async findTypes() {
    return prisma.leaveType.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findLeaves(userId?: string, canManage: boolean = false) {
    return prisma.leaveRequest.findMany({
      where: canManage ? {} : { userId },
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
  }) {
    return prisma.leaveRequest.create({
      data: {
        ...data,
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
