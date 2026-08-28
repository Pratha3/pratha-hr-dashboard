'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, ChangePasswordInput } from '@ems/validation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormField } from '@/components/form/form-field';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Mail,
  Building2,
  Phone,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
  const { user, refetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync state with active user
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Password Change Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword }
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema)
  });

  const onUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await apiClient.patch('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null
      });
      toast.success('Profile updated successfully');
      await refetchUser();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || 'Failed to update profile details'
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    try {
      await apiClient.post('/auth/change-password', data);
      toast.success('Password changed successfully. Active sessions revoked.');
      resetPasswordForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || 'Failed to change password'
      );
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm font-bold">
                {user.firstName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-bold">Account Settings</DialogTitle>
              <DialogDescription className="text-xs">
                Manage your personal profile information and security credentials
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-5 pt-3 border-b bg-muted/10">
            <TabsList className="grid grid-cols-2 w-full h-8">
              <TabsTrigger value="profile" className="text-xs gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                <span>Profile Info</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Security & Password</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Profile Information */}
          <TabsContent value="profile" className="p-5 space-y-4 m-0">
            {/* Read-only Identity Meta */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  Assigned Role
                </span>
                <div className="mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {user.role?.name || 'USER'}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  Work Email
                </span>
                <p className="font-mono text-foreground truncate mt-0.5">{user.email}</p>
              </div>
              {user.department && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    Department
                  </span>
                  <p className="text-foreground mt-0.5">{user.department.name}</p>
                </div>
              )}
              {user.position && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">
                    Designation
                  </span>
                  <p className="text-foreground mt-0.5">{user.position}</p>
                </div>
              )}
            </div>

            {/* Editable Profile Details Form */}
            <form onSubmit={onUpdateProfile} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name" required>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-8.5 text-xs"
                    disabled={isUpdatingProfile}
                    required
                  />
                </FormField>
                <FormField label="Last Name" required>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-8.5 text-xs"
                    disabled={isUpdatingProfile}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Phone Number">
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9 h-8.5 text-xs"
                    disabled={isUpdatingProfile}
                  />
                </div>
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isUpdatingProfile}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isUpdatingProfile}>
                  Save Changes
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: Security & Password Change */}
          <TabsContent value="security" className="p-5 space-y-4 m-0">
            <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-foreground shrink-0" />
              <span>Updating your password will revoke all other active browser sessions.</span>
            </div>

            <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-3.5">
              <FormField
                label="Current Password"
                error={passwordErrors.currentPassword?.message}
                required
              >
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    {...registerPassword('currentPassword')}
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-9 h-8.5 text-xs"
                    disabled={isChangingPassword}
                  />
                </div>
              </FormField>

              <FormField
                label="New Password"
                error={passwordErrors.newPassword?.message}
                required
              >
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    {...registerPassword('newPassword')}
                    type="password"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="pl-9 h-8.5 text-xs"
                    disabled={isChangingPassword}
                  />
                </div>
              </FormField>

              <FormField
                label="Confirm New Password"
                error={passwordErrors.confirmPassword?.message}
                required
              >
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    {...registerPassword('confirmPassword')}
                    type="password"
                    placeholder="Repeat new password"
                    className="pl-9 h-8.5 text-xs"
                    disabled={isChangingPassword}
                  />
                </div>
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isChangingPassword}>
                  Update Password
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
