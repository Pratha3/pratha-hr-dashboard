'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { ShieldCheck, Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Permissions } from '@ems/shared-types';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission(Permissions.USER_READ);
  const canCreate = hasPermission(Permissions.USER_CREATE);

  if (!canRead) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Unauthorized Access"
        description="You do not have the required permission (USER_READ) to view system user management."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access & Roles"
        description="Manage system administrative accounts, role assignments, and last-admin protection."
      >
        {canCreate && (
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </PageHeader>

      <EmptyState
        icon={ShieldCheck}
        title="User Access Control Module Ready"
        description="System user management, role modification, and last-admin protection will be wired in Phase 8."
      />
    </div>
  );
}
