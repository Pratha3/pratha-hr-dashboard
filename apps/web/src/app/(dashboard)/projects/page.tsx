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
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  FolderKanban,
  Plus,
  Users,
  Search,
  Calendar,
  Building2,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import {
  Permissions,
  ProjectDto,
  ProjectStatus,
  UserSummary
} from '@ems/shared-types';
import {
  createProjectSchema,
  CreateProjectInput,
  assignProjectMemberSchema,
  AssignProjectMemberInput
} from '@ems/validation';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(Permissions.PROJECT_CREATE);
  const canUpdate = hasPermission(Permissions.PROJECT_UPDATE);
  const canDelete = hasPermission(Permissions.PROJECT_DELETE);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [staffingProject, setStaffingProject] = useState<ProjectDto | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);

  // Fetch Projects
  const { data: projects = [], isLoading } = useQuery<ProjectDto[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data?.data || [];
    }
  });

  // Fetch Workforce for member dropdown
  const { data: usersData } = useQuery<{ users: UserSummary[] }>({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const res = await apiClient.get('/users?limit=100');
      return res.data?.data || { users: [] };
    },
    enabled: Boolean(staffingProject)
  });

  const availableEmployees = usersData?.users || [];

  // Create Project Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      status: 'ACTIVE'
    }
  });

  // Assign Member Form
  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    reset: resetMember,
    formState: { errors: memberErrors, isSubmitting: isSubmittingMember }
  } = useForm<AssignProjectMemberInput>({
    resolver: zodResolver(assignProjectMemberSchema),
    defaultValues: {
      role: 'Contributor',
      allocation: 100
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await apiClient.post('/projects', data);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Project created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsAddOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create project');
    }
  });

  // Assign Member Mutation
  const assignMemberMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: AssignProjectMemberInput }) => {
      const res = await apiClient.post(`/projects/${projectId}/members`, data);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Team member assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetMember({ role: 'Contributor', allocation: 100 });
      // Update local modal state
      if (staffingProject) {
        apiClient.get(`/projects/${staffingProject.id}`).then((res) => {
          setStaffingProject(res.data?.data);
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to assign member');
    }
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const res = await apiClient.delete(`/projects/${projectId}/members/${userId}`);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Team member removed from project');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (staffingProject) {
        apiClient.get(`/projects/${staffingProject.id}`).then((res) => {
          setStaffingProject(res.data?.data);
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to remove member');
    }
  });

  // Delete Project Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/projects/${id}`);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete project');
    }
  });

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const planningCount = projects.filter((p) => p.status === 'PLANNING').length;
  const totalStaffed = projects.reduce((acc, p) => acc + (p.members?.length || 0), 0);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30">Active</Badge>;
      case 'PLANNING':
        return <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30">Planning</Badge>;
      case 'ON_HOLD':
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30">On Hold</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Completed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Staffing"
        description="Track client initiatives, development pipelines, and cross-functional team staffing."
      >
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        )}
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Projects</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{projects.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Sprints</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{activeCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Planning</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{planningCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Staff Allocations</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalStaffed}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'].map((status) => (
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

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingState type="cards" />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Get started by creating your first client or internal project initiative."
          actionLabel={canCreate ? 'Create Project' : undefined}
          onAction={canCreate ? () => setIsAddOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="group hover:border-primary/40 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    {project.clientName && (
                      <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                        <span>{project.clientName}</span>
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(project.status)}
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => setStaffingProject(project)}
                              className="text-xs gap-2"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Manage Staffing</span>
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate(project.id)}
                                className="text-xs text-destructive gap-2 focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Project</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Timeline info */}
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span>
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'TBD'}{' '}
                      —{' '}
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Ongoing'}
                    </span>
                  </div>
                )}

                {/* Team Members List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Assigned Team</span>
                    <span className="text-[11px] text-muted-foreground">
                      {project.members?.length || 0} members
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {project.members && project.members.length > 0 ? (
                      project.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 bg-background border border-border/80 px-2 py-1 rounded-md text-[11px] shadow-2xs"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={m.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[9px]">
                              {m.user?.firstName[0]}
                              {m.user?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[90px]">
                            {m.user?.firstName}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            ({m.allocation}%)
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        No team members staffed yet
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>

              {canUpdate && (
                <CardFooter className="p-4 pt-0 border-t border-border/40 mt-auto bg-muted/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStaffingProject(project)}
                    className="w-full text-xs font-medium h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Manage Staff & Allocations</span>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new client or internal engineering project.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <FormField label="Project Name" error={errors.name?.message} required>
              <Input placeholder="e.g. NextGen Mobile Banking" {...register('name')} />
            </FormField>

            <FormField label="Client / Business Unit" error={errors.clientName?.message}>
              <Input placeholder="e.g. Apex Financial Corp" {...register('clientName')} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date" error={errors.startDate?.message}>
                <Input type="date" {...register('startDate')} />
              </FormField>

              <FormField label="Target End Date" error={errors.endDate?.message}>
                <Input type="date" {...register('endDate')} />
              </FormField>
            </div>

            <FormField label="Description" error={errors.description?.message}>
              <Textarea
                placeholder="Overview of project objectives, scope, and deliverable timeline..."
                className="resize-none h-20"
                {...register('description')}
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
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Staffing / Assign Members Modal */}
      {staffingProject && (
        <Dialog open={Boolean(staffingProject)} onOpenChange={(open) => !open && setStaffingProject(null)}>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Staffing: {staffingProject.name}</span>
              </DialogTitle>
              <DialogDescription>
                Assign employees, set project roles, and manage time allocation percentage.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Add Member Form */}
              <form
                onSubmit={handleMemberSubmit((data) =>
                  assignMemberMutation.mutate({ projectId: staffingProject.id, data })
                )}
                className="p-3.5 bg-muted/40 rounded-lg border border-border/70 space-y-3"
              >
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span>Assign Employee to Project</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Employee *
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                      {...registerMember('userId')}
                    >
                      <option value="">Select Employee...</option>
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || 'Staff'})
                        </option>
                      ))}
                    </select>
                    {memberErrors.userId && (
                      <p className="text-[10px] text-destructive">{memberErrors.userId.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Project Role *
                    </label>
                    <Input
                      placeholder="e.g. Frontend Lead"
                      className="h-9 text-xs"
                      {...registerMember('role')}
                    />
                    {memberErrors.role && (
                      <p className="text-[10px] text-destructive">{memberErrors.role.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Allocation (%) *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      className="h-9 text-xs"
                      {...registerMember('allocation', { valueAsNumber: true })}
                    />
                    {memberErrors.allocation && (
                      <p className="text-[10px] text-destructive">{memberErrors.allocation.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    disabled={isSubmittingMember}
                  >
                    {isSubmittingMember ? 'Assigning...' : 'Assign to Team'}
                  </Button>
                </div>
              </form>

              {/* Current Members Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">
                  Current Staff ({staffingProject.members?.length || 0})
                </h4>

                <div className="border border-border/80 rounded-lg overflow-hidden divide-y divide-border/60">
                  {staffingProject.members && staffingProject.members.length > 0 ? (
                    staffingProject.members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 flex items-center justify-between gap-3 bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={member.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.user?.firstName[0]}
                              {member.user?.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {member.user?.firstName} {member.user?.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs font-normal">
                            {member.role}
                          </Badge>
                          <span className="text-xs font-semibold text-primary">
                            {member.allocation}% time
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeMemberMutation.mutate({
                                projectId: staffingProject.id,
                                userId: member.userId
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No team members assigned to this project yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStaffingProject(null)}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
