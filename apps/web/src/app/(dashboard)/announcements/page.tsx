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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Megaphone, Plus, Trash2, Calendar, Search, Pin } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Permissions, AnnouncementDto } from '@ems/shared-types';
import { toast } from 'sonner';

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters')
});

type AnnouncementInput = z.infer<typeof announcementSchema>;

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  const canCreate = hasPermission(Permissions.ANNOUNCEMENT_CREATE);
  const canDelete = hasPermission(Permissions.ANNOUNCEMENT_DELETE);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // 1. Fetch Announcements
  const { data: announcements = [], isLoading } = useQuery<AnnouncementDto[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/announcements');
      return res.data?.data || [];
    }
  });

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success('Announcement deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete announcement');
    }
  });

  const filteredAnnouncements = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Bulletins & Announcements"
        description="Broadcast organizational news, HR policies, and executive updates to all employees."
      >
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </Button>
        )}
      </PageHeader>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search bulletins by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 h-9 text-xs"
          />
        </div>
      </div>

      {/* Announcements Feed */}
      {isLoading ? (
        <LoadingState type="cards" />
      ) : filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Announcements Published"
          description={
            search
              ? 'No announcements match your search term.'
              : 'Keep the workforce informed by broadcasting the first company bulletin.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item, idx) => (
            <Card key={item.id} className="border bg-card hover:border-primary/40 transition-all shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                      <Pin className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        </span>
                        <span>•</span>
                        <span>By {item.author?.firstName} {item.author?.lastName} (Leadership)</span>
                      </div>
                    </div>
                  </div>

                  {(canDelete || item.authorId === user?.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {item.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}

function CreateAnnouncementModal({
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
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema)
  });

  const onSubmit = async (data: AnnouncementInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/announcements', data);
      toast.success('Announcement broadcasted successfully!');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Broadcast Company Bulletin</DialogTitle>
          <DialogDescription>
            Publish news, policy revisions, or leadership notes to all organization members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <FormField label="Headline / Title" error={errors.title?.message} required>
            <Input {...register('title')} placeholder="e.g. Q4 All-Hands Meeting & Roadmap Presentation" />
          </FormField>

          <FormField label="Bulletin Content" error={errors.content?.message} required>
            <Textarea
              {...register('content')}
              placeholder="Write the full announcement details, links, or instructions..."
              rows={6}
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Broadcast Announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
