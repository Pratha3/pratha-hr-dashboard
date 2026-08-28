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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Tabs,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { FormField } from '@/components/form/form-field';
import {
  CalendarCheck,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, LeaveRequestDto, LeaveTypeDto, LeaveStatus } from '@ems/shared-types';
import { toast } from 'sonner';

const applyLeaveSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(5, 'Please provide a reason (minimum 5 characters)')
});

type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canApply = hasPermission(Permissions.LEAVE_APPLY);
  const canManage = hasPermission(Permissions.LEAVE_MANAGE);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [actioningLeave, setActioningLeave] = useState<{ id: string; status: LeaveStatus } | null>(null);
  const [actionNote, setActionNote] = useState('');

  // 1. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery<LeaveTypeDto[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await apiClient.get('/leaves/types');
      return res.data?.data || [];
    }
  });

  // 2. Fetch Leave Requests
  const { data: leaves = [], isLoading } = useQuery<LeaveRequestDto[]>({
    queryKey: ['leaves'],
    queryFn: async () => {
      const res = await apiClient.get('/leaves');
      return res.data?.data || [];
    }
  });

  // 3. Status Action Mutation
  const actionMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: LeaveStatus; note?: string }) => {
      await apiClient.patch(`/leaves/${id}/status`, { status, actionNote: note });
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'APPROVED' ? 'Leave request approved!' : 'Leave request rejected');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setActioningLeave(null);
      setActionNote('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update leave status');
    }
  });

  const filteredLeaves = leaves.filter((l) =>
    statusFilter === 'ALL' ? true : l.status === statusFilter
  );

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-[10px]">Cancelled</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="warning" className="text-[10px]">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaves & Time Off"
        description="Submit time off applications, track leave balances, and review departmental requests."
      >
        {canApply && (
          <Button
            size="sm"
            onClick={() => setIsApplyOpen(true)}
            className="gap-1.5 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Apply for Leave</span>
          </Button>
        )}
      </PageHeader>

      {/* Leave Balance Policy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {leaveTypes.map((type) => (
          <Card key={type.id} className="border bg-card shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                {type.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-foreground">
                {type.daysAllowed} <span className="text-xs font-normal text-muted-foreground">days/year</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Standard organizational allotment
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="ALL">All ({leaves.length})</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Leave Requests Table */}
      {isLoading ? (
        <LoadingState type="table" rows={4} />
      ) : filteredLeaves.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No Leave Requests Found"
          description={
            statusFilter !== 'ALL'
              ? `There are currently no leave requests with status "${statusFilter}".`
              : 'You have not submitted any leave requests yet.'
          }
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] font-mono text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                          {leave.user?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <div>{leave.user?.firstName} {leave.user?.lastName}</div>
                          <div className="text-[10px] text-muted-foreground">{leave.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {leave.leaveType?.name || 'General Leave'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-muted-foreground" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(leave.status)}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActioningLeave({ id: leave.id, status: 'APPROVED' })}
                              className="h-7 px-2 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActioningLeave({ id: leave.id, status: 'REJECTED' })}
                              className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        leaveTypes={leaveTypes}
      />

      {/* Action Leave Modal (Approve / Reject confirmation) */}
      {actioningLeave && (
        <Dialog open={Boolean(actioningLeave)} onOpenChange={() => setActioningLeave(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {actioningLeave.status === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </DialogTitle>
              <DialogDescription>
                {actioningLeave.status === 'APPROVED'
                  ? 'Confirm approval of this employee time off application.'
                  : 'Specify an optional note explaining the rejection.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <FormField label="Decision Note (Optional)">
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g. Approved. Enjoy your time off!"
                  rows={3}
                />
              </FormField>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActioningLeave(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={actioningLeave.status === 'APPROVED' ? 'default' : 'destructive'}
                isLoading={actionMutation.isPending}
                onClick={() =>
                  actionMutation.mutate({
                    id: actioningLeave.id,
                    status: actioningLeave.status,
                    note: actionNote
                  })
                }
              >
                Confirm {actioningLeave.status === 'APPROVED' ? 'Approval' : 'Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ApplyLeaveModal({
  isOpen,
  onClose,
  leaveTypes
}: {
  isOpen: boolean;
  onClose: () => void;
  leaveTypes: LeaveTypeDto[];
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ApplyLeaveInput>({
    resolver: zodResolver(applyLeaveSchema)
  });

  const onSubmit = async (data: ApplyLeaveInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/leaves', data);
      toast.success('Leave application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Submit a time off request for managerial review and approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <FormField label="Leave Category" error={errors.leaveTypeId?.message} required>
            <select
              {...register('leaveTypeId')}
              className="w-full h-9 px-3 text-xs rounded-md border bg-background text-foreground"
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.daysAllowed} days/yr)
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date" error={errors.startDate?.message} required>
              <Input {...register('startDate')} type="date" />
            </FormField>
            <FormField label="End Date" error={errors.endDate?.message} required>
              <Input {...register('endDate')} type="date" />
            </FormField>
          </div>

          <FormField label="Reason for Leave" error={errors.reason?.message} required>
            <Textarea
              {...register('reason')}
              placeholder="Provide reason for time off request..."
              rows={3}
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
