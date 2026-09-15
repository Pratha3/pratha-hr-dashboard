'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrganizationSchema, CreateOrganizationInput } from '@ems/validation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Building2, Globe, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { switchOrganization, refetchUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      domain: ''
    }
  });

  const onSubmit = async (data: CreateOrganizationInput) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/organizations', {
        name: data.name.trim(),
        domain: data.domain?.trim() || undefined
      });

      if (res.data?.success && res.data?.data) {
        const newOrg = res.data.data.organization || res.data.data;
        toast.success(`Organization "${newOrg.name}" created successfully!`);
        reset();
        onOpenChange(false);
        await refetchUser();
        await switchOrganization(newOrg.id);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ||
          'Failed to create organization. A company with this name or slug may already exist.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
            <Building2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold font-display">
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Spin up a dedicated, isolated workspace with custom roles and members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Organization Name
            </label>
            <Input
              {...register('name')}
              placeholder="e.g. Acme Corporation"
              className="h-10 bg-background"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              Company Domain (Optional)
            </label>
            <Input
              {...register('domain')}
              placeholder="e.g. acme.com"
              className="h-10 bg-background"
              disabled={isSubmitting}
            />
            {errors.domain && (
              <p className="text-xs text-destructive mt-1">{errors.domain.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Workspace</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
