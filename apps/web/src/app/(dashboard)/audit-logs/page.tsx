'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { History, ShieldAlert, Search, ShieldCheck, Eye, ChevronLeft, ChevronRight, FileCode } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, AuditLogDto } from '@ems/shared-types';

export default function AuditLogsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(Permissions.AUDIT_READ);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [inspectingLog, setInspectingLog] = useState<AuditLogDto | null>(null);

  // Fetch Audit Logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);

      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return {
        logs: (res.data?.data || []) as AuditLogDto[],
        meta: res.data?.meta
      };
    },
    enabled: canRead
  });

  if (!canRead) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Unauthorized Access"
        description="You do not have the required permission (AUDIT_READ) to inspect the system audit trail."
      />
    );
  }

  const logs = data?.logs || [];
  const meta = data?.meta;

  const getActionBadge = (action: string) => {
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) {
      return <Badge variant="destructive" className="font-mono text-[10px]">{action}</Badge>;
    }
    if (action.includes('CREATE') || action.includes('LOGIN')) {
      return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-mono text-[10px]">{action}</Badge>;
    }
    return <Badge variant="secondary" className="font-mono text-[10px]">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail"
        description="Immutable, append-only records of critical administrative actions, mutations, and session authentications."
      />

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search audit records by action (e.g. AUTH_LOGIN, USER_CREATE) or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-background/50 h-9 text-xs"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <LoadingState type="table" rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Audit Records Found"
          description={
            search
              ? 'No audit log entries match your active search query.'
              : 'Audit trail records will automatically appear here as administrative actions occur.'
          }
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] font-mono text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {log.entity} {log.entityId ? <span className="font-mono text-[10px] text-muted-foreground">({log.entityId.slice(0, 8)})</span> : null}
                    </td>
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-foreground">{log.user.firstName} {log.user.lastName}</div>
                          <div className="text-[10px] text-muted-foreground">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[11px]">System / Anonymous</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {log.ipAddress || '::1'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.metadata ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectingLog(log)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <div>
                Page <span className="font-semibold text-foreground">{meta.page}</span> of{' '}
                <span className="font-semibold text-foreground">{meta.totalPages}</span> ({meta.total} records)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 px-2"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata Inspector Dialog */}
      {inspectingLog && (
        <Dialog open={Boolean(inspectingLog)} onOpenChange={() => setInspectingLog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">Audit Payload Inspector</DialogTitle>
              <DialogDescription>
                Event: {inspectingLog.action} on {inspectingLog.entity}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/80 border font-mono text-[11px] overflow-x-auto max-h-64">
                <pre>{JSON.stringify(inspectingLog.metadata, null, 2)}</pre>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button size="sm" variant="outline" onClick={() => setInspectingLog(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
