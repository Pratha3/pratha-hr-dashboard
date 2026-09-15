'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@ems/validation';
import { useAuth } from '@/providers/auth-provider';
import { apiClient, setAccessToken, setActiveOrganizationId } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { motion } from 'framer-motion';
import { Building2, Lock, Mail, User, ArrowRight, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { user, isLoading, refetchUser } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      organizationName: ''
    }
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post('/auth/register', data);
      if (res.data?.success && res.data?.data) {
        const { accessToken, activeOrganization } = res.data.data;
        if (accessToken) {
          setAccessToken(accessToken);
        }
        if (activeOrganization?.id) {
          setActiveOrganizationId(activeOrganization.id);
        }

        await refetchUser();
        toast.success(`Welcome to Nexus HR! Your workspace is ready.`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Registration failed. Please check your information and try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-display text-lg animate-pulse shadow-sm">
            N
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">
            Redirecting to Dashboard...
          </p>
        </div>
      </div>
    );
  }

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
          <div className="text-center space-y-2">
            <div className="inline-flex h-11 w-11 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-sm mb-1">
              N
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display text-foreground">
              Create your organization
            </h1>
            <p className="text-sm text-muted-foreground">
              Get started with Nexus HR Workforce Platform
            </p>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-lg text-sm bg-destructive/10 border border-destructive/20 text-destructive text-center font-medium"
            >
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Organization Name
              </label>
              <Input
                {...register('organizationName')}
                placeholder="Acme Innovations Inc."
                className="h-10 bg-background"
                disabled={isSubmitting}
              />
              {errors.organizationName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.organizationName.message}
                </p>
              )}
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
                <Mail className="h-3.5 w-3.5 text-primary" />
                Work Email
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="jane.doe@company.com"
                className="h-10 bg-background"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Password
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
                  <span>Creating workspace...</span>
                </div>
              ) : (
                <>
                  <span>Create Organization</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-sm text-muted-foreground border-t">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
