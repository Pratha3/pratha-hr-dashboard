'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInvitationSchema, AcceptInvitationInput } from '@ems/validation';
import { useAuth } from '@/providers/auth-provider';
import { apiClient, setAccessToken, setActiveOrganizationId } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Building2, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';

interface InvitationDetails {
  email: string;
  organizationName: string;
  roleName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { refetchUser } = useAuth();

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token: token || '',
      firstName: '',
      lastName: '',
      password: ''
    }
  });

  useEffect(() => {
    if (!token) {
      setLoadError('Invalid invitation link: Missing invitation token.');
      setIsLoadingDetails(false);
      return;
    }

    setValue('token', token);

    const verifyToken = async () => {
      try {
        const res = await apiClient.get(`/invitations/verify/${token}`);
        if (res.data?.success && res.data?.data) {
          setInvitation(res.data.data);
        } else {
          setLoadError('Invitation not found or no longer active.');
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          'This invitation link is invalid or has expired.';
        setLoadError(msg);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    verifyToken();
  }, [token, setValue]);

  const onSubmit = async (data: AcceptInvitationInput) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await apiClient.post('/invitations/accept', data);
      if (res.data?.success && res.data?.data) {
        const { accessToken, organization } = res.data.data;
        if (accessToken) {
          setAccessToken(accessToken);
        }
        if (organization?.id) {
          setActiveOrganizationId(organization.id);
        }

        await refetchUser();
        toast.success(`You have joined ${organization?.name || 'the organization'}!`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Failed to accept invitation. Please try again.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background relative selection:bg-primary/20">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <div className="rounded-xl border bg-card/95 shadow-xl p-6 sm:p-8 space-y-6">
          {isLoadingDetails ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Verifying invitation link...</p>
            </div>
          ) : loadError ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Invitation Invalid or Expired</h2>
                <p className="text-sm text-muted-foreground max-w-sm">{loadError}</p>
              </div>
              <Button asChild variant="outline" className="mt-2">
                <Link href="/login">Return to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex h-11 w-11 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-sm mb-1">
                  P
                </div>
                <h1 className="text-2xl font-bold tracking-tight font-display text-foreground">
                  Accept Invitation
                </h1>
                <p className="text-sm text-muted-foreground">
                  You have been invited to join{' '}
                  <span className="font-semibold text-foreground">
                    {invitation?.organizationName}
                  </span>{' '}
                  as <span className="font-medium text-primary">{invitation?.roleName}</span>.
                </p>
              </div>

              {formError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-lg text-sm bg-destructive/10 border border-destructive/20 text-destructive text-center font-medium"
                >
                  {formError}
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Invited Email
                  </label>
                  <Input
                    value={invitation?.email || ''}
                    disabled
                    className="h-10 bg-muted/40 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      First Name
                    </label>
                    <Input
                      {...register('firstName')}
                      placeholder="Jane"
                      className="h-10 bg-background"
                      disabled={isSubmitting}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Last Name
                    </label>
                    <Input
                      {...register('lastName')}
                      placeholder="Doe"
                      className="h-10 bg-background"
                      disabled={isSubmitting}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Set Password
                  </label>
                  <Input
                    {...register('password')}
                    type="password"
                    placeholder="Min 8 characters, letters, numbers, symbols"
                    className="h-10 bg-background"
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold gap-2 shadow-sm transition-all mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Joining workspace...</span>
                    </div>
                  ) : (
                    <>
                      <span>Accept Invitation & Join</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-2 text-center text-sm text-muted-foreground border-t">
                Already have an active session?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
