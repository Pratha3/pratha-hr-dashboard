import { leavesRepository, LeavesRepository } from './leaves.repository';
import { LeaveStatus } from '@prisma/client';
import { PermissionName, Permissions } from '@ems/shared-types';

export class LeavesService {
  constructor(private repo: LeavesRepository = leavesRepository) {}

  async listTypes() {
    return this.repo.findTypes();
  }

  async listLeaves(userId: string, permissions: PermissionName[]) {
    const canManage = permissions.includes(Permissions.LEAVE_MANAGE);
    return this.repo.findLeaves(userId, canManage);
  }

  async applyLeave(data: {
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    return this.repo.createLeave({
      userId: data.userId,
      leaveTypeId: data.leaveTypeId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason
    });
  }

  async actionLeave(
    id: string,
    status: LeaveStatus,
    actionById: string,
    actionNote?: string
  ) {
    return this.repo.updateStatus(id, status, actionById, actionNote);
  }
}

export const leavesService = new LeavesService();
