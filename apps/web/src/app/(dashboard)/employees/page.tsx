'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Permissions } from '@ems/shared-types';

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(Permissions.USER_CREATE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce & Directory"
        description="Unified employee profiles, department assignments, and job titles."
      >
        {canCreate && (
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </PageHeader>

      <EmptyState
        icon={Users}
        title="Workforce Directory Module"
        description="Employee management and data-table with server-side pagination, search, and department filtering."
      />
    </div>
  );
}
