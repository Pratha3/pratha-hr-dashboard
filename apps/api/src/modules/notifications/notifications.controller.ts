import { Request, Response, NextFunction } from 'express';
import { notificationsService, NotificationsService } from './notifications.service';
import { notificationEmitter, RealtimeNotificationPayload } from './notification.emitter';
import { AuthenticationError } from '../../common/errors/app-error';

export class NotificationsController {
  constructor(private service: NotificationsService = notificationsService) {}

  listNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 20;
      const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset as string, 10)) : 0;

      const result = await this.service.getUserNotifications(req.user.id, req.organizationId, {
        unreadOnly,
        limit,
        offset
      });

      res.status(200).json({
        data: result.items,
        total: result.total,
        unreadCount: result.unreadCount
      });
    } catch (err) {
      next(err);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const count = await this.service.getUnreadCount(req.user.id, req.organizationId);

      res.status(200).json({
        data: { unreadCount: count }
      });
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      await this.service.markAsRead(req.params.id, req.user.id);

      res.status(200).json({
        data: { success: true, message: 'Notification marked as read' }
      });
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      await this.service.markAllAsRead(req.user.id, req.organizationId);

      res.status(200).json({
        data: { success: true, message: 'All notifications marked as read' }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Real-time Server-Sent Events (SSE) Stream
   * Clients connect to receive live push notifications instantly.
   */
  streamNotifications = async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;
    const organizationId = req.organizationId;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial handshake with current unread count
    const initialUnreadCount = await this.service.getUnreadCount(userId, organizationId);
    res.write(`data: ${JSON.stringify({ type: 'INIT', unreadCount: initialUnreadCount })}\n\n`);

    // Listener for real-time user-targeted notifications
    const unsubscribeUser = notificationEmitter.subscribeUser(userId, (payload: RealtimeNotificationPayload) => {
      res.write(`data: ${JSON.stringify({ type: 'NOTIFICATION', data: payload })}\n\n`);
    });

    // Keep connection alive with ping heartbeat every 25 seconds
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribeUser();
      res.end();
    });
  };
}

export const notificationsController = new NotificationsController();
