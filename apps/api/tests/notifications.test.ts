import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { notificationEmitter } from '../src/modules/notifications/notification.emitter';
import { emailService } from '../src/common/services/email.service';
import { prisma } from '../src/config/database';

vi.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    organizationMembership: {
      findMany: vi.fn()
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

vi.mock('../src/common/services/email.service', () => ({
  emailService: {
    sendLeaveRequestAlert: vi.fn().mockResolvedValue(true),
    sendLeaveStatusAlert: vi.fn().mockResolvedValue(true),
    sendAnnouncementAlert: vi.fn().mockResolvedValue(true),
    sendProjectAssignedAlert: vi.fn().mockResolvedValue(true),
    sendAssetAssignedAlert: vi.fn().mockResolvedValue(true)
  }
}));

describe('NotificationsService Unit Tests', () => {
  let service: NotificationsService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      createNotification: vi.fn(),
      findUserNotifications: vi.fn(),
      getUnreadCount: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn()
    };
    service = new NotificationsService(mockRepo);
  });

  it('should list user notifications and unread count', async () => {
    const mockResult = {
      items: [
        { id: 'notif-1', title: 'Test Notif', isRead: false, createdAt: new Date() }
      ],
      total: 1,
      unreadCount: 1
    };
    mockRepo.findUserNotifications.mockResolvedValue(mockResult);

    const result = await service.getUserNotifications('user-1', 'org-1');
    expect(result).toEqual(mockResult);
    expect(mockRepo.findUserNotifications).toHaveBeenCalledWith('user-1', 'org-1', {});
  });

  it('should create notification and emit real-time event', async () => {
    const emitSpy = vi.spyOn(notificationEmitter, 'emitToUser');
    const mockCreated = {
      id: 'notif-10',
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'LEAVE_STATUS',
      title: 'Leave Approved',
      message: 'Your leave was approved',
      link: '/leaves',
      isRead: false,
      createdAt: new Date(),
      actor: { id: 'actor-1', firstName: 'Jane', lastName: 'Admin', email: 'jane@admin.com' }
    };
    mockRepo.createNotification.mockResolvedValue(mockCreated);

    const result = await service.createAndDispatch({
      userId: 'user-1',
      organizationId: 'org-1',
      type: 'LEAVE_STATUS',
      title: 'Leave Approved',
      message: 'Your leave was approved',
      link: '/leaves'
    });

    expect(result).toEqual(mockCreated);
    expect(emitSpy).toHaveBeenCalledWith('user-1', expect.objectContaining({
      id: 'notif-10',
      title: 'Leave Approved'
    }));
  });

  it('should notify HR and Admins when an employee applies for leave', async () => {
    mockRepo.createNotification.mockResolvedValue({
      id: 'notif-leave',
      userId: 'hr-1',
      isRead: false,
      createdAt: new Date()
    });

    vi.mocked(prisma.organizationMembership.findMany).mockResolvedValue([
      {
        user: { id: 'hr-1', email: 'hr@nexus.com', firstName: 'HR', lastName: 'Manager', isActive: true }
      }
    ] as any);

    await service.notifyLeaveRequestCreated({
      leaveId: 'leave-123',
      organizationId: 'org-1',
      employee: { id: 'emp-1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@nexus.com' },
      leaveType: 'Annual Leave',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      reason: 'Vacation'
    });

    expect(mockRepo.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'hr-1',
      type: 'LEAVE_REQUEST'
    }));
    expect(emailService.sendLeaveRequestAlert).toHaveBeenCalledWith('hr@nexus.com', expect.objectContaining({
      employeeName: 'Alex Morgan',
      leaveType: 'Annual Leave'
    }));
  });

  it('should notify employee when leave is actioned (approved/rejected)', async () => {
    mockRepo.createNotification.mockResolvedValue({
      id: 'notif-status',
      userId: 'emp-1',
      isRead: false,
      createdAt: new Date()
    });

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'emp-1', email: 'alex@nexus.com', firstName: 'Alex', lastName: 'Morgan' } as any)
      .mockResolvedValueOnce({ firstName: 'HR', lastName: 'Lead' } as any);

    await service.notifyLeaveStatusChanged({
      leaveId: 'leave-123',
      organizationId: 'org-1',
      applicantUserId: 'emp-1',
      actionByUserId: 'hr-1',
      status: 'APPROVED',
      leaveType: 'Sick Leave',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
      actionNote: 'Get well soon'
    });

    expect(mockRepo.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'emp-1',
      type: 'LEAVE_STATUS'
    }));
    expect(emailService.sendLeaveStatusAlert).toHaveBeenCalledWith('alex@nexus.com', expect.objectContaining({
      status: 'APPROVED',
      leaveType: 'Sick Leave',
      actionByName: 'HR Lead'
    }));
  });

  it('should mark single and all notifications as read', async () => {
    mockRepo.markAsRead.mockResolvedValue({ count: 1 });
    mockRepo.markAllAsRead.mockResolvedValue({ count: 3 });

    await service.markAsRead('notif-1', 'user-1');
    expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');

    await service.markAllAsRead('user-1', 'org-1');
    expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1', 'org-1');
  });
});
