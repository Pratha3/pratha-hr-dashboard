'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { History, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { Permissions } from '@ems/shared-types';

export default function AuditLogsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(Permissions.AUDIT_READ);

  if (!canRead) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Unauthorized Access"
        description="You do not have the required permission (AUDIT_READ) to inspect the system audit trail."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail"
        description="Immutable, append-only records of critical administrative actions and mutations."
      />

      <EmptyState
        icon={History}
        title="Audit Trail Module Ready"
        description="Append-only audit log reader with filtering by user, action, and date range will be wired in Phase 9."
      />
    </div>
  );
}
