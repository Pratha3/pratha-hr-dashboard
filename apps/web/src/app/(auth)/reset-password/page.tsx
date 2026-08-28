'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '@ems/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get('token') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiClient.post('/auth/reset-password', data);
      setIsSuccess(true);
      toast.success('Password updated successfully');
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to reset password. The token may be expired or invalid.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card/95 shadow-xl p-6 sm:p-8 space-y-6">
      {/* Logo & Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-11 w-11 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-xs mb-1">
          N
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
          Set New Password
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Create a secure new password for your enterprise account.
        </p>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium text-center"
        >
          {errorMessage}
        </motion.div>
      )}

      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Password Successfully Changed</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your password has been updated. You can now sign in to your dashboard with your new credentials.
            </p>
          </div>

          <Button asChild className="w-full h-9 text-xs">
            <Link href="/login">
              <span>Sign In with New Password</span>
              <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Link>
          </Button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Security Reset Token" error={errors.token?.message} required>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                {...register('token')}
                type="text"
                placeholder="Paste security reset token"
                className="pl-9 bg-background/50 text-xs font-mono"
                disabled={isSubmitting}
              />
            </div>
          </FormField>

          <FormField label="New Password" error={errors.password?.message} required>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                {...register('password')}
                type="password"
                placeholder="Minimum 8 characters"
                className="pl-9 bg-background/50 text-xs"
                disabled={isSubmitting}
              />
            </div>
          </FormField>

          <FormField label="Confirm New Password" error={errors.confirmPassword?.message} required>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                {...register('confirmPassword')}
                type="password"
                placeholder="Repeat password"
                className="pl-9 bg-background/50 text-xs"
                disabled={isSubmitting}
              />
            </div>
          </FormField>

          <Button
            type="submit"
            className="w-full h-9 gap-2 font-semibold shadow-xs text-xs"
            isLoading={isSubmitting}
          >
            <span>Update Password</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background relative selection:bg-primary/20">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
