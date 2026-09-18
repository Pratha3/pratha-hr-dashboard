import { EventEmitter } from 'events';
import { logger } from '../../common/utils/logger';

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

export type NotificationListener = (notification: RealtimeNotificationPayload) => void;

/**
 * Event bus interface allowing seamless plugging of Redis Pub/Sub in multi-node clusters.
 */
export interface INotificationEventBus {
  emitToUser(userId: string, notification: RealtimeNotificationPayload): void;
  emitToOrganization(organizationId: string, notification: RealtimeNotificationPayload): void;
  subscribeUser(userId: string, listener: NotificationListener): () => void;
  subscribeOrganization(organizationId: string, listener: NotificationListener): () => void;
  getActiveSubscriberCount(): number;
}

class NotificationEmitter extends EventEmitter implements INotificationEventBus {
  private activeListenersCount = 0;

  constructor() {
    super();
    // Allow up to 5,000 concurrent listeners per Node process
    this.setMaxListeners(5000);
  }

  emitToUser(userId: string, notification: RealtimeNotificationPayload): void {
    this.emit(`user:${userId}`, notification);
  }

  emitToOrganization(organizationId: string, notification: RealtimeNotificationPayload): void {
    this.emit(`org:${organizationId}`, notification);
  }

  subscribeUser(userId: string, listener: NotificationListener): () => void {
    const eventName = `user:${userId}`;
    this.on(eventName, listener);
    this.activeListenersCount++;

    return () => {
      this.off(eventName, listener);
      this.activeListenersCount = Math.max(0, this.activeListenersCount - 1);
    };
  }

  subscribeOrganization(organizationId: string, listener: NotificationListener): () => void {
    const eventName = `org:${organizationId}`;
    this.on(eventName, listener);
    this.activeListenersCount++;

    return () => {
      this.off(eventName, listener);
      this.activeListenersCount = Math.max(0, this.activeListenersCount - 1);
    };
  }

  getActiveSubscriberCount(): number {
    return this.activeListenersCount;
  }
}

export const notificationEmitter = new NotificationEmitter();
