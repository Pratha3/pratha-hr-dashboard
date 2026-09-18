'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteMemberSchema, InviteMemberInput } from '@ems/validation';
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
import { Mail, Shield, Send, Copy, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleOption {
  id: string;
  name: string;
  description?: string | null;
}

export function InviteMemberModal({ open, onOpenChange }: InviteMemberModalProps) {
  const { currentOrganization } = useAuth();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      roleId: ''
    }
  });

  useEffect(() => {
    if (open) {
      setGeneratedInviteLink(null);
      setCopied(false);
      reset();

      const fetchRoles = async () => {
        setIsLoadingRoles(true);
        try {
          const res = await apiClient.get('/users/metadata');
          if (res.data?.success && res.data?.data?.roles) {
            const rawRoles: RoleOption[] = res.data.data.roles;
            const uniqueRoles = rawRoles.filter((r, idx, arr) => arr.findIndex((x) => x.name === r.name) === idx);
            setRoles(uniqueRoles);
            // Default select EMPLOYEE or first role
            const defaultRole =
              uniqueRoles.find((r: RoleOption) => r.name === 'EMPLOYEE') || uniqueRoles[0];
            if (defaultRole) {
              setValue('roleId', defaultRole.id);
            }
          }
        } catch {
          toast.error('Failed to load organization roles');
        } finally {
          setIsLoadingRoles(false);
        }
      };

      fetchRoles();
    }
  }, [open, reset, setValue]);

  const onSubmit = async (data: InviteMemberInput) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/invitations', {
        email: data.email.trim().toLowerCase(),
        roleId: data.roleId
      });

      if (res.data?.success && res.data?.data) {
        const token = res.data.data.inviteToken || res.data.data.token;
        const link = `${window.location.origin}/invite/${token}`;
        setGeneratedInviteLink(link);
        toast.success(`Invitation generated for ${data.email}!`);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ||
          'Failed to send invitation. Please check the email and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedInviteLink) return;
    try {
      await navigator.clipboard.writeText(generatedInviteLink);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
            <UserPlus className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold font-display">
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Invite a teammate to join{' '}
            <span className="font-semibold text-foreground">
              {currentOrganization?.name || 'your organization'}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {generatedInviteLink ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <Check className="h-4 w-4" />
                <span>Invitation link active for 7 days</span>
              </div>
              <p className="text-xs text-muted-foreground break-all font-mono select-all bg-background p-2.5 rounded border">
                {generatedInviteLink}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={copyToClipboard}
                className="flex-1 gap-2 h-10 font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setGeneratedInviteLink(null);
                  reset();
                }}
                className="h-10"
              >
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Colleague Email
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="colleague@company.com"
                className="h-10 bg-background"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Assign Role
              </label>
              {isLoadingRoles ? (
                <div className="h-10 rounded-md border bg-muted/40 animate-pulse" />
              ) : (
                <select
                  {...register('roleId')}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-input transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.description ? `— ${role.description}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.roleId && (
                <p className="text-xs text-destructive mt-1">{errors.roleId.message}</p>
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
                    <span>Generating...</span>
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Generate Invitation</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
