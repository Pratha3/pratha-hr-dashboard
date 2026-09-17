import { EventEmitter } from 'events';

export interface RealtimeNotificationPayload {
  id: string;
  organizationId?: string | null;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: Date | string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

class NotificationEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow large number of concurrent listeners across active user SSE connections
    this.setMaxListeners(1000);
  }

  emitToUser(userId: string, notification: RealtimeNotificationPayload) {
    this.emit(`user:${userId}`, notification);
  }

  emitToOrganization(organizationId: string, notification: RealtimeNotificationPayload) {
    this.emit(`org:${organizationId}`, notification);
  }

  subscribeUser(userId: string, listener: (notification: RealtimeNotificationPayload) => void) {
    const eventName = `user:${userId}`;
    this.on(eventName, listener);
    return () => this.off(eventName, listener);
  }

  subscribeOrganization(organizationId: string, listener: (notification: RealtimeNotificationPayload) => void) {
    const eventName = `org:${organizationId}`;
    this.on(eventName, listener);
    return () => this.off(eventName, listener);
  }
}

export const notificationEmitter = new NotificationEmitter();
