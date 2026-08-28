'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Permissions } from '@ems/shared-types';

export default function DepartmentsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(Permissions.DEPARTMENT_CREATE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Organize business units, divisions, and operational teams."
      >
        {canCreate && (
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="h-4 w-4" />
            New Department
          </Button>
        )}
      </PageHeader>

      <EmptyState
        icon={Building2}
        title="Department Management Module Ready"
        description="Department CRUD, active employee assignment check, and status toggles will be wired in Phase 6."
      />
    </div>
  );
}
