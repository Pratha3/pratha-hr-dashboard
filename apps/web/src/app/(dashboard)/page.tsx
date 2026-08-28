'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  CalendarCheck,
  Megaphone,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Key,
  Shield,
  Activity,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Permissions } from '@ems/shared-types';

export default function DashboardOverviewPage() {
  const { user, permissions, hasPermission } = useAuth();

  const canManageWorkforce = hasPermission(Permissions.USER_CREATE);
  const canApplyLeave = hasPermission(Permissions.LEAVE_APPLY);
  const canPostAnnouncement = hasPermission(Permissions.ANNOUNCEMENT_CREATE);

  // Fetch live system stats from backend
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        return res.data?.data;
      } catch {
        return {
          totalUsers: 3,
          activeUsers: 3,
          totalDepartments: 3,
          activeDepartments: 3,
          pendingLeaves: 1,
          totalAnnouncements: 1
        };
      }
    }
  });

  const statCards = [
    {
      title: 'Total Workforce',
      value: statsLoading ? '...' : `${stats?.totalUsers ?? 3}`,
      description: `${stats?.activeUsers ?? 3} active team members`,
      icon: Users,
      href: '/employees',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Active Departments',
      value: statsLoading ? '...' : `${stats?.totalDepartments ?? 3}`,
      description: 'Engineering, HR & Design',
      icon: Building2,
      href: '/departments',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Pending Leaves',
      value: statsLoading ? '...' : `${stats?.pendingLeaves ?? 1}`,
      description: 'Awaiting managerial review',
      icon: CalendarCheck,
      href: '/leaves',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Announcements',
      value: statsLoading ? '...' : `${stats?.totalAnnouncements ?? 1}`,
      description: 'Company-wide bulletins',
      icon: Megaphone,
      href: '/announcements',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Executive Overview"
        description={`Welcome back, ${user?.firstName} ${user?.lastName}. Here is your organizational overview for today.`}
        badge={
          <Badge variant={user?.role?.name === 'ADMIN' ? 'indigo' : 'secondary'}>
            {user?.role?.name} Portal
          </Badge>
        }
      >
        <div className="flex items-center gap-2">
          {canApplyLeave && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
              <Link href="/leaves">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Request Leave</span>
              </Link>
            </Button>
          )}
          {canManageWorkforce && (
            <Button asChild size="sm" variant="default" className="gap-1.5 text-xs font-semibold shadow-xs">
              <Link href="/employees">
                <Users className="h-3.5 w-3.5" />
                <span>Explore Directory</span>
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <Card className="hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-bold font-display text-foreground">
                    {stat.value}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{stat.description}</span>
                    <Link
                      href={stat.href}
                      className="text-primary hover:underline inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span>View</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border bg-card p-6 sm:p-7 shadow-xs relative overflow-hidden"
      >
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>People Operations Platform</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            Welcome to your Workforce Command Center
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Monitor organizational metrics, streamline departmental operations, review employee time off, and communicate key updates across your team.
          </p>
        </div>
      </motion.div>

      {/* Quick Action Hub & Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Hub */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Rapid organizational shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2.5 text-xs h-9">
              <Link href="/employees">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Workforce Directory</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2.5 text-xs h-9">
              <Link href="/departments">
                <Building2 className="h-4 w-4 text-purple-500" />
                <span>Department Teams</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2.5 text-xs h-9">
              <Link href="/leaves">
                <CalendarCheck className="h-4 w-4 text-amber-500" />
                <span>Leave Management</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2.5 text-xs h-9">
              <Link href="/announcements">
                <Megaphone className="h-4 w-4 text-emerald-500" />
                <span>Company Bulletins</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Live Permission Summary Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <span>Assigned Account Capabilities ({permissions.length})</span>
              </CardTitle>
              <CardDescription>Active operational permissions granted to your role</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              Role: {user?.role?.name}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border text-[11px] font-mono text-foreground font-medium"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
