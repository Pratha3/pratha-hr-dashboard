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
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Mobile Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-gradient-to-tr from-primary to-brass-500 flex items-center justify-center text-white font-bold font-display shadow-sm">
            P
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Pratha EMS</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-col border-r bg-card/60 backdrop-blur-md transition-all duration-300 relative z-30',
            sidebarCollapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Logo & Brand */}
          <div className="h-16 flex items-center justify-between px-5 border-b">
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary via-blue-600 to-brass-500 flex items-center justify-center text-white font-bold font-display shadow-md shadow-primary/20">
                P
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-display font-bold text-base leading-tight tracking-tight">
                    Pratha EMS
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Enterprise
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Nav Items */}
          <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
            {!sidebarCollapsed && (
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Main Navigation
              </div>
            )}
            {filteredNavItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform group-hover:scale-105',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {isActive && !sidebarCollapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brass-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Profile Card & Collapse Toggle */}
          <div className="p-3 border-t bg-muted/20 space-y-2">
            {!sidebarCollapsed && user && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-card border shadow-xs">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                  {user.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant={user.role?.name === 'ADMIN' ? 'brass' : 'secondary'}
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
                  'text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title="Sign out"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="text-xs">Sign Out</span>}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 shrink-0 text-muted-foreground"
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

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex flex-col w-72 bg-card border-r p-4 shadow-xl z-10">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold font-display">
                    P
                  </div>
                  <span className="font-display font-bold">Pratha EMS</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="py-4 space-y-1 flex-1">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar for Desktop */}
          <div className="h-16 hidden lg:flex items-center justify-between px-8 border-b bg-card/40 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Workspace</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs font-semibold text-foreground capitalize">
                {pathname.split('/')[1] || 'Dashboard'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>API: Live (port 5001)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
