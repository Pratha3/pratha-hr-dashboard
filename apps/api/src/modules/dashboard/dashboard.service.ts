import { prisma } from '../../config/database';
import { LeaveStatus } from '@prisma/client';

export class DashboardService {
  async getStats(organizationId?: string) {
    if (organizationId) {
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
        prisma.organizationMembership.count({ where: { organizationId } }),
        prisma.organizationMembership.count({ where: { organizationId, isActive: true } }),
        prisma.department.count({ where: { organizationId } }),
        prisma.department.count({ where: { organizationId, isActive: true } }),
        prisma.leaveRequest.count({ where: { organizationId, status: LeaveStatus.PENDING } }),
        prisma.announcement.count({ where: { organizationId } }),
        prisma.project.count({ where: { organizationId, status: 'ACTIVE' } }),
        prisma.asset.count({ where: { organizationId } }),
        prisma.asset.count({ where: { organizationId, status: 'ASSIGNED' } })
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
