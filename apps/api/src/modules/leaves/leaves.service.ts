import { leavesRepository, LeavesRepository } from './leaves.repository';
import { LeaveStatus } from '@prisma/client';
import { PermissionName, Permissions } from '@ems/shared-types';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors/app-error';
import { prisma } from '../../config/database';
import { notificationsService } from '../notifications/notifications.service';

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

    // Asynchronously dispatch real-time in-app notification & email to HR / Admin
    prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, firstName: true, lastName: true, email: true }
    }).then((applicant) => {
      if (applicant) {
        notificationsService.notifyLeaveRequestCreated({
          leaveId: leave.id,
          organizationId,
          employee: applicant,
          leaveType: leaveType.name,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason.trim()
        });
      }
    }).catch(() => {});

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
      },
      include: {
        leaveType: true
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

    // Notify employee of approval / rejection
    notificationsService.notifyLeaveStatusChanged({
      leaveId: id,
      organizationId,
      applicantUserId: existing.userId,
      actionByUserId: actionById,
      status: status as 'APPROVED' | 'REJECTED' | 'CANCELLED',
      leaveType: existing.leaveType?.name || 'Leave',
      startDate: existing.startDate.toISOString().split('T')[0],
      endDate: existing.endDate.toISOString().split('T')[0],
      actionNote: actionNote?.trim() || null
    }).catch(() => {});

    return updated;
  }
}

export const leavesService = new LeavesService();


