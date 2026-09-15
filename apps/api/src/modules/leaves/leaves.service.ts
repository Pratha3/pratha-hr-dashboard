import { leavesRepository, LeavesRepository } from './leaves.repository';
import { LeaveStatus } from '@prisma/client';
import { PermissionName, Permissions } from '@ems/shared-types';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';

export class LeavesService {
  constructor(private repo: LeavesRepository = leavesRepository) {}

  async listTypes(organizationId?: string) {
    return this.repo.findTypes(organizationId);
  }

  async listLeaves(userId: string, permissions: PermissionName[], organizationId?: string) {
    const canManage = permissions.includes(Permissions.LEAVE_MANAGE);
    return this.repo.findLeaves(userId, canManage, organizationId);
  }

  async applyLeave(
    data: {
      userId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason: string;
    },
    organizationId?: string
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new ValidationError('End date cannot be before start date');
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: data.leaveTypeId,
        ...(organizationId
          ? {
              OR: [
                { organizationId },
                { organizationId: null }
              ]
            }
          : {})
      }
    });
    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }

    const leave = await this.repo.createLeave({
      userId: data.userId,
      leaveTypeId: data.leaveTypeId,
      startDate: start,
      endDate: end,
      reason: data.reason.trim(),
      organizationId
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: data.userId,
        action: 'LEAVE_APPLIED',
        entity: 'LeaveRequest',
        entityId: leave.id,
        metadata: {
          leaveTypeId: data.leaveTypeId,
          startDate: data.startDate,
          endDate: data.endDate,
          organizationId
        }
      }
    });

    return leave;
  }

  async actionLeave(
    id: string,
    status: LeaveStatus,
    actionById: string,
    actionNote?: string,
    organizationId?: string
  ) {
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {})
      }
    });

    if (!existing) {
      throw new NotFoundError('Leave request not found');
    }

    if (existing.status !== LeaveStatus.PENDING) {
      throw new ConflictError(`Leave request has already been ${existing.status.toLowerCase()}`);
    }

    const updated = await this.repo.updateStatus(id, status, actionById, actionNote?.trim());

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId || null,
        userId: actionById,
        action: `LEAVE_${status}`,
        entity: 'LeaveRequest',
        entityId: id,
        metadata: {
          previousStatus: existing.status,
          newStatus: status,
          actionNote: actionNote?.trim() || null,
          organizationId
        }
      }
    });

    return updated;
  }
}

export const leavesService = new LeavesService();

