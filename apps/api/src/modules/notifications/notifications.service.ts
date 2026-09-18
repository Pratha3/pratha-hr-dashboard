import { notificationsRepository, NotificationsRepository } from './notifications.repository';
import { notificationEmitter } from './notification.emitter';
import { emailService } from '../../common/services/email.service';
import { prisma } from '../../config/database';
import { Permissions } from '@ems/shared-types';
import { logger } from '../../common/utils/logger';

export interface DispatchNotificationInput {
  userId: string;
  organizationId?: string | null;
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: any;
}

export class NotificationsService {
  constructor(private repo: NotificationsRepository = notificationsRepository) {}

  async createAndDispatch(input: DispatchNotificationInput) {
    try {
      const notification = await this.repo.createNotification(input);

      // Emit real-time event over SSE
      notificationEmitter.emitToUser(input.userId, {
        id: notification.id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        actor: notification.actor
      });

      return notification;
    } catch (err) {
      logger.error('Failed to create and dispatch notification', { error: err, input });
      return null;
    }
  }

  /**
   * High-performance batch dispatch for bulk announcements and multi-recipient events.
   * Inserts records in a single database roundtrip and broadcasts real-time SSE events.
   */
  async createAndDispatchMany(inputs: DispatchNotificationInput[]): Promise<void> {
    if (!inputs.length) return;
    try {
      await this.repo.createManyNotifications(inputs);

      // Broadcast real-time SSE events to all connected recipient sockets
      for (const input of inputs) {
        notificationEmitter.emitToUser(input.userId, {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          organizationId: input.organizationId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link,
          isRead: false,
          createdAt: new Date()
        });
      }
    } catch (err) {
      logger.error('Failed to create and dispatch bulk notifications', { error: err, count: inputs.length });
    }
  }

  async getUserNotifications(
    userId: string,
    organizationId?: string | null,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ) {
    return this.repo.findUserNotifications(userId, organizationId, options);
  }

  async getUnreadCount(userId: string, organizationId?: string | null) {
    return this.repo.getUnreadCount(userId, organizationId);
  }

  async markAsRead(id: string, userId: string) {
    return this.repo.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string, organizationId?: string | null) {
    return this.repo.markAllAsRead(userId, organizationId);
  }

  // =========================================================================
  // Role-Targeted Dispatches
  // =========================================================================

  /**
   * 1. Triggered when an Employee applies for leave.
   * Target: All users in the organization with LEAVE_MANAGE permission or Admin/Owner roles.
   */
  async notifyLeaveRequestCreated(data: {
    leaveId: string;
    organizationId?: string | null;
    employee: { id: string; firstName: string; lastName: string; email: string };
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    try {
      const { organizationId, employee, leaveType, startDate, endDate, reason } = data;
      const employeeFullName = `${employee.firstName} ${employee.lastName}`.trim();

      // Find all managers / HR / Admins who have permission to manage leaves or admin roles
      let candidateUsers: { id: string; email: string; firstName: string; lastName: string; isActive?: boolean }[] = [];

      if (organizationId) {
        const members = await prisma.organizationMembership.findMany({
          where: {
            organizationId,
            isActive: true,
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: {
                        name: Permissions.LEAVE_MANAGE
                      }
                    }
                  }
                }
              },
              {
                role: {
                  name: { in: ['OWNER', 'ADMIN', 'HR', 'HR_MANAGER'] }
                }
              }
            ]
          },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
            }
          }
        });

        candidateUsers = members.map((m) => m.user);
      } else {
        const users = await prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: {
                        name: Permissions.LEAVE_MANAGE
                      }
                    }
                  }
                }
              },
              {
                role: {
                  name: { in: ['OWNER', 'ADMIN', 'HR', 'HR_MANAGER'] }
                }
              }
            ]
          },
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
        });
        candidateUsers = users;
      }

      // Deduplicate recipients and exclude the applicant
      const uniqueManagersMap = new Map<string, { id: string; email: string; firstName: string; lastName: string }>();
      for (const u of candidateUsers) {
        if (u && u.id && u.id !== employee.id && u.isActive !== false) {
          uniqueManagersMap.set(u.id, {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName
          });
        }
      }

      const managerUsers = Array.from(uniqueManagersMap.values());
      const title = `New Leave Request: ${employeeFullName}`;
      const message = `${employeeFullName} has applied for ${leaveType} leave from ${startDate} to ${endDate}.`;
      const link = '/leaves';

      // 1. In-App Notifications (Batch DB Insert + Real-time SSE)
      const notificationInputs: DispatchNotificationInput[] = managerUsers.map((manager) => ({
        userId: manager.id,
        organizationId,
        actorId: employee.id,
        type: 'LEAVE_REQUEST',
        title,
        message,
        link,
        metadata: { leaveId: data.leaveId, startDate, endDate, leaveType }
      }));

      await this.createAndDispatchMany(notificationInputs);

      // 2. Transactional Email Notifications (Parallel non-blocking dispatches)
      const emailPromises = managerUsers
        .filter((manager) => Boolean(manager.email))
        .map((manager) =>
          emailService
            .sendLeaveRequestAlert(manager.email, {
              employeeName: employeeFullName,
              employeeEmail: employee.email,
              leaveType,
              startDate,
              endDate,
              reason
            })
            .catch((e) => logger.warn(`Could not send leave request alert to ${manager.email}`, { e }))
        );

      await Promise.allSettled(emailPromises);
    } catch (error) {
      logger.error('Error in notifyLeaveRequestCreated', { error });
    }
  }

  /**
   * 2. Triggered when Leave status is updated (Approved / Rejected / Cancelled).
   * Target: The applicant Employee.
   */
  async notifyLeaveStatusChanged(data: {
    leaveId: string;
    organizationId?: string | null;
    applicantUserId: string;
    actionByUserId?: string | null;
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
    leaveType: string;
    startDate: string;
    endDate: string;
    actionNote?: string | null;
  }) {
    try {
      const applicant = await prisma.user.findUnique({
        where: { id: data.applicantUserId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!applicant) return;

      let actionByName: string | undefined;
      if (data.actionByUserId) {
        const actor = await prisma.user.findUnique({
          where: { id: data.actionByUserId },
          select: { firstName: true, lastName: true }
        });
        if (actor) {
          actionByName = `${actor.firstName} ${actor.lastName}`.trim();
        }
      }

      const title = `Leave Request ${data.status}`;
      const message = `Your leave request for ${data.leaveType} (${data.startDate} - ${data.endDate}) has been ${data.status.toLowerCase()}${actionByName ? ` by ${actionByName}` : ''}.`;
      const link = '/leaves';

      // In-app notification
      await this.createAndDispatch({
        userId: applicant.id,
        organizationId: data.organizationId,
        actorId: data.actionByUserId || null,
        type: 'LEAVE_STATUS',
        title,
        message,
        link,
        metadata: {
          leaveId: data.leaveId,
          status: data.status,
          actionNote: data.actionNote
        }
      });

      // Email
      if (applicant.email) {
        emailService
          .sendLeaveStatusAlert(applicant.email, {
            employeeName: `${applicant.firstName} ${applicant.lastName}`.trim(),
            leaveType: data.leaveType,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            actionByName,
            actionNote: data.actionNote || undefined
          })
          .catch((e) => logger.warn(`Could not send leave status alert to ${applicant.email}`, { e }));
      }
    } catch (error) {
      logger.error('Error in notifyLeaveStatusChanged', { error });
    }
  }

  /**
   * 3. Triggered when an Announcement is published.
   * Target: All active members in the Organization.
   */
  async notifyAnnouncementPublished(data: {
    announcementId: string;
    organizationId?: string | null;
    authorId: string;
    title: string;
    content: string;
  }) {
    try {
      const author = await prisma.user.findUnique({
        where: { id: data.authorId },
        select: { firstName: true, lastName: true }
      });
      const authorName = author ? `${author.firstName} ${author.lastName}`.trim() : 'HR Team';

      let candidateMembers: { id: string; email: string; firstName: string; lastName: string; isActive?: boolean }[] = [];

      if (data.organizationId) {
        const orgMembers = await prisma.organizationMembership.findMany({
          where: {
            organizationId: data.organizationId,
            isActive: true
          },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
            }
          }
        });

        candidateMembers = orgMembers.map((m) => m.user);
      } else {
        candidateMembers = await prisma.user.findMany({
          where: {
            isActive: true
          },
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
        });
      }

      // Deduplicate recipients and exclude the author
      const uniqueMembersMap = new Map<string, { id: string; email: string; firstName: string; lastName: string }>();
      for (const m of candidateMembers) {
        if (m && m.id && m.id !== data.authorId && m.isActive !== false) {
          uniqueMembersMap.set(m.id, {
            id: m.id,
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName
          });
        }
      }

      const members = Array.from(uniqueMembersMap.values());
      const notifTitle = `📢 Announcement: ${data.title}`;
      const notifMessage = data.content.length > 120 ? `${data.content.substring(0, 117)}...` : data.content;
      const link = '/announcements';

      // 1. In-App Notifications (Batch DB Insert + Parallel SSE)
      const notificationInputs: DispatchNotificationInput[] = members.map((member) => ({
        userId: member.id,
        organizationId: data.organizationId,
        actorId: data.authorId,
        type: 'ANNOUNCEMENT',
        title: notifTitle,
        message: notifMessage,
        link,
        metadata: { announcementId: data.announcementId }
      }));

      await this.createAndDispatchMany(notificationInputs);

      // 2. Transactional Email Notifications (Parallel non-blocking dispatches)
      const emailPromises = members
        .filter((member) => Boolean(member.email))
        .map((member) =>
          emailService
            .sendAnnouncementAlert(member.email, {
              recipientName: `${member.firstName} ${member.lastName}`.trim(),
              title: data.title,
              content: data.content,
              authorName
            })
            .catch((e) => logger.warn(`Could not send announcement email to ${member.email}`, { e }))
        );

      await Promise.allSettled(emailPromises);
    } catch (error) {
      logger.error('Error in notifyAnnouncementPublished', { error });
    }
  }

  /**
   * 4. Triggered when an Employee is assigned to a Project.
   * Target: The assigned Employee.
   */
  async notifyProjectAssigned(data: {
    projectId: string;
    projectName: string;
    clientName?: string | null;
    userId: string;
    role: string;
    allocation: number;
    actorId?: string | null;
    organizationId?: string | null;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
      });

      if (!user || !user.isActive) return;

      const title = `Assigned to Project: ${data.projectName}`;
      const message = `You have been assigned to project "${data.projectName}" as ${data.role} (${data.allocation}% allocation).`;
      const link = '/projects';

      await this.createAndDispatch({
        userId: user.id,
        organizationId: data.organizationId,
        actorId: data.actorId,
        type: 'PROJECT_ASSIGNED',
        title,
        message,
        link,
        metadata: {
          projectId: data.projectId,
          role: data.role,
          allocation: data.allocation
        }
      });

      if (user.email) {
        emailService
          .sendProjectAssignedAlert(user.email, {
            employeeName: `${user.firstName} ${user.lastName}`.trim(),
            projectName: data.projectName,
            clientName: data.clientName,
            role: data.role,
            allocation: data.allocation
          })
          .catch((e) => logger.warn(`Could not send project assigned email to ${user.email}`, { e }));
      }
    } catch (error) {
      logger.error('Error in notifyProjectAssigned', { error });
    }
  }

  /**
   * 5. Triggered when an IT Hardware Asset is assigned to an Employee.
   * Target: The assigned Employee.
   */
  async notifyAssetAssigned(data: {
    assetId: string;
    assetName: string;
    serialNumber: string;
    assetType: string;
    userId: string;
    notes?: string | null;
    actorId?: string | null;
    organizationId?: string | null;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
      });

      if (!user || !user.isActive) return;

      const title = `IT Asset Assigned: ${data.assetName}`;
      const message = `Asset ${data.assetName} (Serial: ${data.serialNumber}) has been assigned to you.`;
      const link = '/assets';

      await this.createAndDispatch({
        userId: user.id,
        organizationId: data.organizationId,
        actorId: data.actorId,
        type: 'ASSET_ASSIGNED',
        title,
        message,
        link,
        metadata: {
          assetId: data.assetId,
          serialNumber: data.serialNumber
        }
      });

      if (user.email) {
        emailService
          .sendAssetAssignedAlert(user.email, {
            employeeName: `${user.firstName} ${user.lastName}`.trim(),
            assetName: data.assetName,
            serialNumber: data.serialNumber,
            assetType: data.assetType,
            notes: data.notes
          })
          .catch((e) => logger.warn(`Could not send asset assigned email to ${user.email}`, { e }));
      }
    } catch (error) {
      logger.error('Error in notifyAssetAssigned', { error });
    }
  }

  /**
   * 6. Triggered when an IT Hardware Asset is reclaimed / unassigned.
   * Target: The previous Employee.
   */
  async notifyAssetReclaimed(data: {
    assetId: string;
    assetName: string;
    serialNumber: string;
    userId: string;
    actorId?: string | null;
    organizationId?: string | null;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      });

      if (!user) return;

      const title = `IT Asset Returned: ${data.assetName}`;
      const message = `Asset ${data.assetName} (Serial: ${data.serialNumber}) has been unassigned and returned to inventory.`;
      const link = '/assets';

      await this.createAndDispatch({
        userId: user.id,
        organizationId: data.organizationId,
        actorId: data.actorId,
        type: 'ASSET_ASSIGNED',
        title,
        message,
        link,
        metadata: {
          assetId: data.assetId,
          serialNumber: data.serialNumber,
          isReclaim: true
        }
      });
    } catch (error) {
      logger.error('Error in notifyAssetReclaimed', { error });
    }
  }

  /**
   * 7. Triggered when a new Member joins an Organization via invitation.
   * Target: Organization Owner & Admins.
   */
  async notifyMemberJoined(data: {
    organizationId: string;
    organizationName: string;
    newMember: { id: string; firstName: string; lastName: string; email: string };
    roleName: string;
  }) {
    try {
      const members = await prisma.organizationMembership.findMany({
        where: {
          organizationId: data.organizationId,
          isActive: true,
          role: {
            name: { in: ['OWNER', 'ADMIN'] }
          }
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
          }
        }
      });

      const memberFullName = `${data.newMember.firstName} ${data.newMember.lastName}`.trim();
      const title = `New Team Member Joined`;
      const message = `${memberFullName} (${data.newMember.email}) has joined ${data.organizationName} as ${data.roleName}.`;
      const link = '/employees';

      const eligibleAdmins = members.filter(
        (m) => m.user && m.user.id !== data.newMember.id && m.user.isActive
      );

      const notificationInputs: DispatchNotificationInput[] = eligibleAdmins.map((m) => ({
        userId: m.user.id,
        organizationId: data.organizationId,
        actorId: data.newMember.id,
        type: 'SYSTEM',
        title,
        message,
        link,
        metadata: {
          newMemberId: data.newMember.id,
          roleName: data.roleName
        }
      }));

      await this.createAndDispatchMany(notificationInputs);
    } catch (error) {
      logger.error('Error in notifyMemberJoined', { error });
    }
  }
}

export const notificationsService = new NotificationsService();
