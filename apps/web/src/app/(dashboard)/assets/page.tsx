'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/form/form-field';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Laptop,
  Monitor,
  Smartphone,
  KeyRound,
  HardDrive,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Wrench,
  UserCheck,
  UserX,
  MoreVertical,
  Edit2,
  Trash2,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import {
  Permissions,
  AssetDto,
  AssetType,
  AssetStatus,
  UserSummary
} from '@ems/shared-types';
import {
  createAssetSchema,
  CreateAssetInput,
  assignAssetSchema,
  AssignAssetInput
} from '@ems/validation';
import { toast } from 'sonner';

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(Permissions.ASSET_CREATE);
  const canUpdate = hasPermission(Permissions.ASSET_UPDATE);
  const canAssign = hasPermission(Permissions.ASSET_ASSIGN);
  const canDelete = hasPermission(Permissions.ASSET_DELETE);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<AssetDto | null>(null);

  // Fetch Assets
  const { data: assetsData, isLoading } = useQuery<{ assets: AssetDto[] }>({
    queryKey: ['assets', typeFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search) params.append('search', search);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await apiClient.get(`/assets?${params.toString()}`);
      return { assets: res.data?.data || [] };
    }
  });

  const assets = assetsData?.assets || [];

  // Fetch Workforce for assignment modal
  const { data: usersData } = useQuery<{ users: UserSummary[] }>({
    queryKey: ['users-for-asset-assignment'],
    queryFn: async () => {
      const res = await apiClient.get('/users?limit=100');
      return res.data?.data || { users: [] };
    },
    enabled: Boolean(assigningAsset)
  });

  const availableEmployees = usersData?.users || [];

  // Create Asset Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      type: 'LAPTOP',
      status: 'AVAILABLE'
    }
  });

  // Assign/Reclaim Asset Form
  const {
    register: registerAssign,
    handleSubmit: handleAssignSubmit,
    reset: resetAssign,
    formState: { errors: assignErrors, isSubmitting: isSubmittingAssign }
  } = useForm<AssignAssetInput>({
    resolver: zodResolver(assignAssetSchema)
  });

  // Create Asset Mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateAssetInput) => {
      const res = await apiClient.post('/assets', data);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Hardware asset registered successfully');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsAddOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to register asset');
    }
  });

  // Assign/Reclaim Mutation
  const assignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignAssetInput }) => {
      const res = await apiClient.post(`/assets/${id}/assign`, data);
      return res.data?.data;
    },
    onSuccess: (_, variables) => {
      const isReclaimed = !variables.data.assignedToId;
      toast.success(isReclaimed ? 'Asset reclaimed to inventory' : 'Asset assigned to employee');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setAssigningAsset(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update asset assignment');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/assets/${id}`);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Asset record deleted');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete asset');
    }
  });

  // KPI Calculations
  const totalLaptops = assets.filter((a) => a.type === 'LAPTOP').length;
  const assignedCount = assets.filter((a) => a.status === 'ASSIGNED').length;
  const availableCount = assets.filter((a) => a.status === 'AVAILABLE').length;
  const repairCount = assets.filter((a) => a.status === 'IN_REPAIR').length;

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'LAPTOP':
        return <Laptop className="h-4 w-4 text-blue-500" />;
      case 'MONITOR':
        return <Monitor className="h-4 w-4 text-purple-500" />;
      case 'MOBILE_DEVICE':
        return <Smartphone className="h-4 w-4 text-emerald-500" />;
      case 'SECURITY_KEY':
        return <KeyRound className="h-4 w-4 text-amber-500" />;
      default:
        return <HardDrive className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
            Assigned
          </Badge>
        );
      case 'AVAILABLE':
        return (
          <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium">
            Available In Stock
          </Badge>
        );
      case 'IN_REPAIR':
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium">
            In Repair
          </Badge>
        );
      case 'RETIRED':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">
            Retired
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hardware & IT Assets"
        description="Manage company IT inventory, laptop assignments, security keys, and hardware lifecycle."
      >
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Register Asset</span>
          </Button>
        )}
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Inventory</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{assets.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Laptop className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Deployed / Assigned</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{assignedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Available in Stock</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{availableCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Repair / Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{repairCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, serial no, or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'AVAILABLE', 'ASSIGNED', 'IN_REPAIR'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="h-8 text-xs font-medium capitalize"
              >
                {status.toLowerCase().replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Assets Inventory Table */}
      {isLoading ? (
        <LoadingState type="table" />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No hardware assets found"
          description="Register company laptops, monitors, or security devices to manage inventory."
          actionLabel={canCreate ? 'Register Asset' : undefined}
          onAction={canCreate ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <Card className="border-border/70 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/60">
                <tr>
                  <th className="py-3 px-4">Device & Specifications</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Employee</th>
                  <th className="py-3 px-4">Assignment Date</th>
                  {(canAssign || canDelete) && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/60">
                          {getTypeIcon(asset.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{asset.name}</p>
                          {asset.notes && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                              {asset.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {asset.serialNumber}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {asset.type.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(asset.status)}
                    </td>

                    <td className="py-3 px-4">
                      {asset.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {asset.assignedTo.firstName[0]}
                              {asset.assignedTo.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {asset.assignedTo.position || 'Staff'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Unassigned (In Stock)</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {asset.assignedDate
                        ? new Date(asset.assignedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : '—'}
                    </td>

                    {(canAssign || canDelete) && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canAssign && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1"
                              onClick={() => {
                                setAssigningAsset(asset);
                                resetAssign({
                                  assignedToId: asset.assignedToId || '',
                                  notes: asset.notes || ''
                                });
                              }}
                            >
                              <ArrowRightLeft className="h-3 w-3 text-primary" />
                              <span>{asset.assignedToId ? 'Reassign / Return' : 'Assign'}</span>
                            </Button>
                          )}

                          {canDelete && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(asset.id)}
                                  className="text-xs text-destructive gap-2 focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Asset</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Register Asset Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New IT Asset</DialogTitle>
            <DialogDescription>
              Add a new hardware device, laptop, or peripheral to company inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <FormField label="Device / Model Name" error={errors.name?.message} required>
              <Input placeholder='e.g. Apple MacBook Pro 16" M3 Max' {...register('name')} />
            </FormField>

            <FormField label="Serial Number / Asset Tag" error={errors.serialNumber?.message} required>
              <Input placeholder="e.g. MBP-M3-90214" {...register('serialNumber')} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Asset Type *</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                  {...register('type')}
                >
                  <option value="LAPTOP">Laptop / Computer</option>
                  <option value="MONITOR">Monitor / Display</option>
                  <option value="MOBILE_DEVICE">Mobile / Tablet</option>
                  <option value="SECURITY_KEY">Security Key / YubiKey</option>
                  <option value="PERIPHERAL">Peripheral / Dock</option>
                  <option value="OTHER">Other Equipment</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Initial Status *</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                  {...register('status')}
                >
                  <option value="AVAILABLE">Available In Stock</option>
                  <option value="IN_REPAIR">In Repair</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
            </div>

            <FormField label="Specifications & Notes" error={errors.notes?.message}>
              <Textarea
                placeholder="Hardware specs (RAM, Storage, Condition, Warranty info)..."
                className="resize-none h-20 text-xs"
                {...register('notes')}
              />
            </FormField>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign / Reclaim Asset Modal */}
      {assigningAsset && (
        <Dialog open={Boolean(assigningAsset)} onOpenChange={(open) => !open && setAssigningAsset(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span>Assign / Return Asset</span>
              </DialogTitle>
              <DialogDescription>
                Assign <strong>{assigningAsset.name}</strong> (SN: {assigningAsset.serialNumber}) to an employee or return it to stock.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleAssignSubmit((data) =>
                assignMutation.mutate({
                  id: assigningAsset.id,
                  data: {
                    assignedToId: data.assignedToId || null,
                    notes: data.notes
                  }
                })
              )}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Assign To Employee
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                  {...registerAssign('assignedToId')}
                >
                  <option value="">-- Return to Stock / Unassigned --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || 'Staff'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Select an employee to deploy this device, or choose "Return to Stock" upon employee offboarding.
                </p>
              </div>

              <FormField label="Condition / Reclaim Notes" error={assignErrors.notes?.message}>
                <Textarea
                  placeholder="Notes on condition, accessories included, handover verification..."
                  className="resize-none h-20 text-xs"
                  {...registerAssign('notes')}
                />
              </FormField>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssigningAsset(null)}
                  disabled={isSubmittingAssign}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingAssign}>
                  {isSubmittingAssign ? 'Updating...' : 'Save Assignment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
