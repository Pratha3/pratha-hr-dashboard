'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CalendarX,
  Megaphone,
  FolderKanban,
  Laptop,
  CheckCheck,
  Circle,
  Inbox
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDto } from '@ems/shared-types';
import { cn } from '@/lib/utils';

// Helper to format relative time
function formatRelativeTime(dateInput?: Date | string | null): string {
  if (!dateInput) return 'Just now';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';
  
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [open, setOpen] = useState(false);

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const handleNotificationClick = (notif: NotificationDto) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const renderIcon = (notif: NotificationDto) => {
    switch (notif.type) {
      case 'LEAVE_REQUEST':
        return (
          <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <CalendarCheck className="h-4 w-4" />
          </div>
        );
      case 'LEAVE_STATUS':
        if (notif.title.toLowerCase().includes('approved')) {
          return (
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          );
        }
        return (
          <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
            <CalendarX className="h-4 w-4" />
          </div>
        );
      case 'ANNOUNCEMENT':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
            <Megaphone className="h-4 w-4" />
          </div>
        );
      case 'PROJECT_ASSIGNED':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
            <FolderKanban className="h-4 w-4" />
          </div>
        );
      case 'ASSET_ASSIGNED':
        return (
          <div className="h-8 w-8 rounded-full bg-teal-500/10 text-teal-500 dark:bg-teal-500/20 flex items-center justify-center shrink-0">
            <Laptop className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-1"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-xs animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-0 shadow-2xl rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md overflow-hidden z-50"
      >
        {/* Header */}
        <div className="p-3.5 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pt-2 pb-1.5 border-b flex gap-1.5 bg-background/50 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
              filter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
              filter === 'UNREAD'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading updates...
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">All caught up</p>
              <p className="text-[11px] text-muted-foreground max-w-[220px]">
                {filter === 'UNREAD'
                  ? 'No unread notifications right now.'
                  : 'You will receive real-time updates for leave requests, announcements, and project allocations here.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  'p-3.5 flex gap-3 items-start transition-all cursor-pointer group text-left relative',
                  !notif.isRead
                    ? 'bg-primary/[0.03] hover:bg-primary/[0.07]'
                    : 'hover:bg-muted/50 opacity-90'
                )}
              >
                {/* Icon */}
                {renderIcon(notif)}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        'text-xs leading-tight truncate',
                        !notif.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/85'
                      )}
                    >
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <span className="inline-block text-[10px] font-medium text-primary hover:underline pt-0.5">
                      View details &rarr;
                    </span>
                  )}
                </div>

                {/* Unread indicator dot */}
                {!notif.isRead && (
                  <Circle className="h-2 w-2 fill-primary text-primary shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
