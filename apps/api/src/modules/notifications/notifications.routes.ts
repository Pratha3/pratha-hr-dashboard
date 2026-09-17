import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);
notificationsRouter.use(tenantMiddleware);

// Real-time SSE stream
notificationsRouter.get('/stream', notificationsController.streamNotifications);

// Fetch notifications list
notificationsRouter.get('/', notificationsController.listNotifications);

// Unread count
notificationsRouter.get('/unread-count', notificationsController.getUnreadCount);

// Mark single notification as read
notificationsRouter.patch('/:id/read', notificationsController.markAsRead);

// Mark all as read
notificationsRouter.post('/read-all', notificationsController.markAllAsRead);
