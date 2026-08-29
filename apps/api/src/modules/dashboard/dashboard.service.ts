import { prisma } from '../../config/database';
import { LeaveStatus } from '@prisma/client';

export class DashboardService {
  async getStats() {
    const [
      totalUsers,
      activeUsers,
      totalDepartments,
      activeDepartments,
      pendingLeaves,
      totalAnnouncements,
      activeProjects,
      totalAssets,
      assignedAssets
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.department.count(),
      prisma.department.count({ where: { isActive: true } }),
      prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      prisma.announcement.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'ASSIGNED' } })
    ]);

    return {
      totalUsers,
      activeUsers,
      totalDepartments,
      activeDepartments,
      pendingLeaves,
      totalAnnouncements,
      activeProjects,
      totalAssets,
      assignedAssets
    };
  }
}

export const dashboardService = new DashboardService();
