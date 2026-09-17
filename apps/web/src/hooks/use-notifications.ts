'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, getAccessToken, getActiveOrganizationId } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { NotificationDto } from '@ems/shared-types';
import { toast } from 'sonner';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const activeOrgId = getActiveOrganizationId();

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications', {
        params: { unreadOnly, limit: 30 }
      });
      if (res.data?.data) {
        setNotifications(res.data.data);
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/notifications/unread-count');
      if (res.data?.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to get unread count', err);
    }
  }, [user]);

  // Mark single as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);

      await apiClient.post('/notifications/read-all');
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Establish real-time SSE stream
  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    fetchNotifications();

    const token = getAccessToken();
    const orgId = getActiveOrganizationId();

    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    const baseUrl = rawApiUrl.endsWith('/api/v1')
      ? rawApiUrl
      : `${rawApiUrl.replace(/\/$/, '')}/api/v1`;

    const streamUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(
      token || ''
    )}${orgId ? `&orgId=${encodeURIComponent(orgId)}` : ''}`;

    let es: EventSource | null = null;

    try {
      es = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'INIT') {
            if (typeof payload.unreadCount === 'number') {
              setUnreadCount(payload.unreadCount);
            }
          } else if (payload.type === 'NOTIFICATION' && payload.data) {
            const newNotif: NotificationDto = payload.data;

            // Prepend new notification
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
            setUnreadCount((prev) => prev + 1);

            // Pop toast alert with action
            toast(newNotif.title, {
              description: newNotif.message,
              duration: 6000
            });
          }
        } catch {
          // Heartbeat or ping event
        }
      };

      es.onerror = () => {
        // SSE error or reconnecting
        if (es?.readyState === EventSource.CLOSED) {
          console.warn('Notification stream closed. Retrying in background...');
        }
      };
    } catch (e) {
      console.error('Failed to open SSE notification connection', e);
    }

    // Safety fallback: Poll unread count every 45s
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, 45000);

    return () => {
      clearInterval(pollInterval);
      if (es) {
        es.close();
      }
      eventSourceRef.current = null;
    };
  }, [user, activeOrgId, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}
