'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Lock
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, UserSummary } from '@ems/shared-types';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(Permissions.USER_READ);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Fetch Users
  const { data, isLoading } = useQuery({
    queryKey: ['system-users', { search, role: roleFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const res = await apiClient.get(`/users?${params.toString()}`);
      return (res.data?.data || []) as UserSummary[];
    },
    enabled: canRead
  });

  if (!canRead) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Unauthorized Access"
        description="You do not have the required permission (USER_READ) to view system user access."
      />
    );
  }

  const users = data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access & Roles"
        description="Manage system administrative accounts, role assignments, and security governance."
      />

      {/* Security Governance Notice */}
      <Card className="border-brass-500/30 bg-brass-500/5">
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brass-500/10 text-brass-500 border border-brass-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm">Last-Admin Governance Protection</CardTitle>
              <CardDescription>
                System automatically enforces safety bounds to prevent deactivating or deleting the last active Administrator account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Role Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search accounts by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 h-9 text-xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 text-xs rounded-md border bg-background text-foreground w-full sm:w-auto"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="HR">HR</option>
          <option value="EMPLOYEE">EMPLOYEE</option>
        </select>
      </div>

      {/* Users Access Table */}
      {isLoading ? (
        <LoadingState type="table" rows={4} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Accounts Found"
          description="No user accounts match your filter criteria."
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] font-mono text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Security Status</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{account.firstName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{account.firstName} {account.lastName}</span>
                            {account.role?.name === 'ADMIN' && (
                              <Shield className="h-3 w-3 text-brass-500" />
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{account.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <Badge
                        variant={account.role?.name === 'ADMIN' ? 'brass' : account.role?.name === 'HR' ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {account.role?.name}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {account.department?.name || 'Unassigned'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive font-medium text-[11px]">
                            <UserX className="h-3.5 w-3.5" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
