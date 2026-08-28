'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { FormField } from '@/components/form/form-field';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Plus, Users, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, DepartmentDto } from '@ems/shared-types';
import { createDepartmentSchema, CreateDepartmentInput } from '@ems/validation';
import { toast } from 'sonner';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(Permissions.DEPARTMENT_CREATE);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery<DepartmentDto[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiClient.get('/departments');
      return res.data?.data || [];
    }
  });

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Organize business units, divisions, and operational teams."
      >
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Department</span>
          </Button>
        )}
      </PageHeader>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search departments by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 h-9 text-xs"
          />
        </div>
      </div>

      {/* Department Cards Grid */}
      {isLoading ? (
        <LoadingState type="cards" />
      ) : filteredDepts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Departments Found"
          description={
            search
              ? 'No departments match your active search criteria.'
              : 'Create your first organizational department to begin assigning workforce members.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepts.map((dept) => (
            <Card
              key={dept.id}
              className="hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-md bg-secondary text-foreground border">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <Badge variant={dept.isActive ? 'outline' : 'secondary'} className={dept.isActive ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]' : 'text-[10px]'}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardTitle className="text-base pt-2">{dept.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[36px]">
                  {dept.description || 'No description provided for this business unit.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 border-t bg-muted/10 p-4 rounded-b-xl flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {dept._count?.users ?? 0}
                  </span>
                  <span>{dept._count?.users === 1 ? 'member' : 'members'}</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {dept.isActive ? 'Active Team' : 'Inactive'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      <AddDepartmentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}

function AddDepartmentModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema)
  });

  const onSubmit = async (data: CreateDepartmentInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/departments', data);
      toast.success('Department created successfully!');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>
            Add a new business unit or operational division.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <FormField label="Department Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="e.g. Platform Engineering" />
          </FormField>

          <FormField label="Description (Optional)" error={errors.description?.message}>
            <Textarea
              {...register('description')}
              placeholder="Responsibilities, team scope, and operational functions..."
              rows={3}
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
