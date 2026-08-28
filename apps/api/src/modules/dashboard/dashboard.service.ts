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
      totalAnnouncements
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.department.count(),
      prisma.department.count({ where: { isActive: true } }),
      prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      prisma.announcement.count()
    ]);

    return {
      totalUsers,
      activeUsers,
      totalDepartments,
      activeDepartments,
      pendingLeaves,
      totalAnnouncements
    };
  }
}

export const dashboardService = new DashboardService();
