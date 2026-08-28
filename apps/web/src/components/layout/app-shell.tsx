'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Megaphone,
  ShieldCheck,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Permissions, PermissionName } from '@ems/shared-types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionName;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: Permissions.DASHBOARD_READ
  },
  {
    label: 'Workforce',
    href: '/employees',
    icon: Users,
    permission: Permissions.USER_READ
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    permission: Permissions.DEPARTMENT_READ
  },
  {
    label: 'Leaves & Time Off',
    href: '/leaves',
    icon: CalendarCheck,
    permission: Permissions.LEAVE_READ
  },
  {
    label: 'Announcements',
    href: '/announcements',
    icon: Megaphone,
    permission: Permissions.ANNOUNCEMENT_READ
  },
  {
    label: 'User Access',
    href: '/users',
    icon: ShieldCheck,
    permission: Permissions.USER_READ
  },
  {
    label: 'Audit Trail',
    href: '/audit-logs',
    icon: History,
    permission: Permissions.AUDIT_READ
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const renderNavLinks = (isMobile = false) => (
    <div className="space-y-1.5 py-2">
      {filteredNavItems.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => isMobile && setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
            {isActive && (!sidebarCollapsed || isMobile) && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );

        if (sidebarCollapsed && !isMobile) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }

        return linkContent;
      })}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b bg-card/95 backdrop-blur-md sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-display shadow-xs">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-tight tracking-tight">
                Nexus HRMS
              </span>
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                Enterprise People OS
              </span>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Mobile Navigation Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
            <SheetHeader className="p-5 border-b text-left">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-display shadow-xs">
                  N
                </div>
                <div>
                  <SheetTitle className="text-base font-bold">Nexus HRMS</SheetTitle>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Enterprise Portal
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Mobile Nav Links */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Menu
              </div>
              {renderNavLinks(true)}
            </div>

            {/* Mobile User Profile & Logout */}
            {user && (
              <div className="p-4 border-t bg-muted/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{user.firstName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <Badge
                      variant={user.role?.name === 'ADMIN' ? 'indigo' : 'secondary'}
                      className="text-[9px] px-1.5 py-0 h-4 mt-0.5"
                    >
                      {user.role?.name || 'USER'}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex">
          {/* Desktop Sidebar */}
          <aside
            className={cn(
              'hidden lg:flex flex-col border-r bg-card/60 backdrop-blur-md transition-all duration-300 relative z-30',
              sidebarCollapsed ? 'w-20' : 'w-64'
            )}
          >
            {/* Logo & Brand */}
            <div className="h-16 flex items-center justify-between px-5 border-b">
              <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-display shadow-xs">
                  N
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-base leading-tight tracking-tight">
                      Nexus HRMS
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Enterprise OS
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* Desktop Nav Items */}
            <div className="flex-1 py-6 px-3 overflow-y-auto">
              {!sidebarCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Main Navigation
                </div>
              )}
              {renderNavLinks(false)}
            </div>

            {/* User Profile Card & Collapse Toggle */}
            <div className="p-3 border-t bg-muted/20 space-y-2">
              {!sidebarCollapsed && user && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-card border shadow-xs">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{user.firstName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant={user.role?.name === 'ADMIN' ? 'indigo' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {user.role?.name || 'USER'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size={sidebarCollapsed ? 'icon' : 'sm'}
                  onClick={() => logout()}
                  className={cn(
                    'text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium',
                    sidebarCollapsed ? 'h-9 w-full justify-center' : 'flex-1 justify-start gap-2'
                  )}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  title={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content Viewport */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Top Workspace status bar */}
            <div className="h-10 border-b bg-card/40 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-[11px]">
                  Organization / <strong className="text-foreground capitalize">{pathname.split('/')[1] || 'Dashboard'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground font-medium">All Systems Operational</span>
                </div>
              </div>
            </div>

            {/* Page Content Body */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
