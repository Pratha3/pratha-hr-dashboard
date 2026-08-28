'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  Plus,
  Search,
  Building2,
  MoreVertical,
  Edit2,
  UserCheck,
  UserX,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/form/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import {
  UserSummary,
  Permissions,
  EmployeeStatus
} from '@ems/shared-types';
import {
  createUserSchema,
  CreateUserInput,
  updateUserSchema,
  UpdateUserInput
} from '@ems/validation';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(Permissions.USER_CREATE);
  const canUpdate = hasPermission(Permissions.USER_UPDATE);
  const canDeactivate = hasPermission(Permissions.USER_DEACTIVATE);
  const canReadSalary = hasPermission(Permissions.USER_READ_SALARY);

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [showSalaries, setShowSalaries] = useState(false);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);

  // 1. Fetch Metadata (Departments & Roles)
  const { data: metadata } = useQuery({
    queryKey: ['users-metadata'],
    queryFn: async () => {
      const res = await apiClient.get('/users/metadata');
      return res.data?.data || { roles: [], departments: [] };
    }
  });

  // 2. Fetch Users List
  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, departmentId, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (departmentId) params.append('departmentId', departmentId);
      if (status) params.append('status', status);

      const res = await apiClient.get(`/users?${params.toString()}`);
      return {
        users: (res.data?.data || []) as UserSummary[],
        meta: res.data?.meta
      };
    }
  });

  // 3. Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.patch(`/users/${id}/status`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'Member activated successfully' : 'Member deactivated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update status');
    }
  });

  const users = data?.users || [];
  const meta = data?.meta;

  const getStatusBadge = (userStatus: EmployeeStatus, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    switch (userStatus) {
      case 'ACTIVE':
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">Active</Badge>;
      case 'PROBATION':
        return <Badge variant="warning">Probation</Badge>;
      case 'NOTICE_PERIOD':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">Notice Period</Badge>;
      default:
        return <Badge variant="secondary">{userStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce & Directory"
        description="Manage organizational workforce, employee profiles, department assignments, and job roles."
      >
        <div className="flex items-center gap-2">
          {canReadSalary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSalaries(!showSalaries)}
              className="gap-1.5 text-xs"
            >
              {showSalaries ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showSalaries ? 'Hide Salaries' : 'Reveal Salaries'}</span>
            </Button>
          )}
          {canCreate && (
            <Button
              size="sm"
              className="gap-1.5 font-medium shadow-sm shadow-primary/20"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, employee code, or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-background/50 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Departments</option>
            {metadata?.departments?.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="NOTICE_PERIOD">Notice Period</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <LoadingState type="table" rows={6} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Workforce Members Found"
          description={
            search || departmentId || status
              ? 'No records match your active search or filter criteria.'
              : 'Start by adding your organization members and assigning them to departments.'
          }
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] font-mono text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Status</th>
                  {canReadSalary && <th className="py-3 px-4">Salary</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Member Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.firstName?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span>
                              {user.firstName} {user.lastName}
                            </span>
                            {user.role?.name === 'ADMIN' && (
                              <Shield className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Employee Code */}
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                      {user.employeeCode || '—'}
                    </td>

                    {/* Department & Role */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{user.department?.name || 'Unassigned'}</span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          Role: {user.role?.name}
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {user.position || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(user.status, user.isActive)}
                    </td>

                    {/* Salary */}
                    {canReadSalary && (
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {showSalaries && user.salary
                          ? `$${user.salary.toLocaleString()}`
                          : '••••••••'}
                      </td>
                    )}

                    {/* Actions Menu */}
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit Details</span>
                            </DropdownMenuItem>
                          )}
                          {canDeactivate && (
                            <>
                              <DropdownMenuSeparator />
                              {user.isActive ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    statusMutation.mutate({ id: user.id, isActive: false })
                                  }
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Deactivate Member</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-emerald-600 dark:text-emerald-400"
                                  onClick={() =>
                                    statusMutation.mutate({ id: user.id, isActive: true })
                                  }
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span>Reactivate Member</span>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                Showing page <span className="font-semibold text-foreground">{meta.page}</span> of{' '}
                <span className="font-semibold text-foreground">{meta.totalPages}</span> ({meta.total} total members)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPreviousPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNextPage}
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

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        departments={metadata?.departments || []}
        roles={metadata?.roles || []}
      />

      {/* Edit Member Modal */}
      {editingUser && (
        <EditMemberModal
          user={editingUser}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          departments={metadata?.departments || []}
          roles={metadata?.roles || []}
        />
      )}
    </div>
  );
}

// ==========================================
// ADD MEMBER MODAL
// ==========================================
function AddMemberModal({
  isOpen,
  onClose,
  departments,
  roles
}: {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
  roles: any[];
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      status: 'ACTIVE'
    }
  });

  const onSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', data);
      toast.success('Workforce member added successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Workforce Member</DialogTitle>
          <DialogDescription>
            Create an employee profile, credentials, and organizational department link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" error={errors.firstName?.message} required>
              <Input {...register('firstName')} placeholder="Jane" />
            </FormField>
            <FormField label="Last Name" error={errors.lastName?.message} required>
              <Input {...register('lastName')} placeholder="Doe" />
            </FormField>
          </div>

          <FormField label="Work Email" error={errors.email?.message} required>
            <Input {...register('email')} type="email" placeholder="jane.doe@pratha.com" />
          </FormField>

          <FormField label="Initial Password" error={errors.password?.message} required>
            <Input {...register('password')} type="password" placeholder="••••••••••••" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee Code" error={errors.employeeCode?.message}>
              <Input {...register('employeeCode')} placeholder="EMP-010" />
            </FormField>
            <FormField label="Job Position" error={errors.position?.message}>
              <Input {...register('position')} placeholder="Product Designer" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department" error={errors.departmentId?.message}>
              <select
                {...register('departmentId')}
                className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="System Role" error={errors.roleId?.message} required>
              <select
                {...register('roleId')}
                className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
              >
                <option value="">Select Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status" error={errors.status?.message}>
              <select
                {...register('status')}
                className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="NOTICE_PERIOD">Notice Period</option>
              </select>
            </FormField>

            <FormField label="Annual Salary ($)" error={errors.salary?.message}>
              <Input
                {...register('salary', { valueAsNumber: true })}
                type="number"
                placeholder="85000"
              />
            </FormField>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// EDIT MEMBER MODAL
// ==========================================
function EditMemberModal({
  user,
  isOpen,
  onClose,
  departments,
  roles
}: {
  user: UserSummary;
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
  roles: any[];
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      employeeCode: user.employeeCode || '',
      position: user.position || '',
      departmentId: user.departmentId || '',
      salary: user.salary || undefined,
      status: user.status
    }
  });

  const onSubmit = async (data: UpdateUserInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.put(`/users/${user.id}`, data);
      toast.success('Member updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Workforce Member</DialogTitle>
          <DialogDescription>
            Update details for {user.firstName} {user.lastName} ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" error={errors.firstName?.message}>
              <Input {...register('firstName')} />
            </FormField>
            <FormField label="Last Name" error={errors.lastName?.message}>
              <Input {...register('lastName')} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee Code" error={errors.employeeCode?.message}>
              <Input {...register('employeeCode')} />
            </FormField>
            <FormField label="Job Position" error={errors.position?.message}>
              <Input {...register('position')} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department" error={errors.departmentId?.message}>
              <select
                {...register('departmentId')}
                className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" error={errors.status?.message}>
              <select
                {...register('status')}
                className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="NOTICE_PERIOD">Notice Period</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </FormField>
          </div>

          <FormField label="Annual Salary ($)" error={errors.salary?.message}>
            <Input
              {...register('salary', { valueAsNumber: true })}
              type="number"
              placeholder="85000"
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
