'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@ems/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', data);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success('Password reset instructions generated');
    } catch (err: any) {
      // Return success UX anyway to prevent email enumeration
      setSubmittedEmail(data.email);
      setIsSuccess(true);
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
        className="w-full max-w-md"
      >
        <div className="rounded-xl border bg-card/95 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-11 w-11 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-xs mb-1">
              N
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Reset Your Password
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Enter your work email address to receive password reset credentials.
            </p>
          </div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Reset Instructions Dispatched</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  If an account exists for <strong className="text-foreground">{submittedEmail}</strong>, instructions and a reset token have been generated.
                </p>
              </div>

              <div className="space-y-2">
                <Button asChild variant="default" className="w-full h-9 text-xs">
                  <Link href="/reset-password">
                    <KeyRound className="h-3.5 w-3.5 mr-2" />
                    <span>Enter Reset Token</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full h-9 text-xs">
                  <Link href="/login">
                    <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                    <span>Return to Sign In</span>
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Work Email" error={errors.email?.message} required>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="name@company.com"
                    className="pl-9 bg-background/50 text-xs"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
              </FormField>

              <Button
                type="submit"
                className="w-full h-9 gap-2 font-semibold shadow-xs text-xs"
                isLoading={isSubmitting}
              >
                <span>Send Reset Instructions</span>
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
      </motion.div>
    </div>
  );
}
