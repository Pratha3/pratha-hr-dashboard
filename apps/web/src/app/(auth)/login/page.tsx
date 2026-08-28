'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@ems/validation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
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
    setValue,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDevCredentials = (role: 'admin' | 'hr') => {
    if (role === 'admin') {
      setValue('email', 'admin@pratha.com');
      setValue('password', 'Admin@123456');
    } else {
      setValue('email', 'hr@pratha.com');
      setValue('password', 'Hr@123456');
    }
    setErrorMessage(null);
  };

  // If session is being verified or user is already logged in, show sleek loading indicator
  if (isLoading || user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-executive-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-brass-500 flex items-center justify-center text-white font-bold font-display text-xl animate-pulse shadow-lg shadow-primary/25">
            P
          </div>
          <p className="text-xs font-mono text-muted-foreground animate-pulse">
            {user ? 'Redirecting to Dashboard...' : 'Verifying active session...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-executive-950 via-executive-900 to-executive-950 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brass-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-executive-700/80 bg-card/85 backdrop-blur-xl shadow-2xl p-7 sm:p-8 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-blue-600 to-brass-500 items-center justify-center text-white font-bold font-display text-xl shadow-lg shadow-primary/25 mb-1">
              P
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Sign in to Pratha EMS
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Enterprise Employee & Human Resource Management Platform
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium text-center"
            >
              {errorMessage}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Work Email" error={errors.email?.message} required>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="admin@pratha.com"
                  className="pl-9 bg-background/50"
                  error={Boolean(errors.email)}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••••••"
                  className="pl-9 bg-background/50 font-mono text-sm"
                  error={Boolean(errors.password)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
              </div>
            </FormField>

            <Button
              type="submit"
              className="w-full h-10 gap-2 font-semibold shadow-md shadow-primary/20"
              isLoading={isSubmitting}
            >
              <span>Authenticate Session</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Dev Quick Fill Pill Controls */}
          <div className="pt-2 border-t border-border/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-brass-500" />
                Quick Dev Credentials:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDevCredentials('admin')}
                className="px-3 py-2 rounded-md border border-executive-700 bg-muted/30 hover:bg-muted text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Admin</span>
                  <span className="text-[10px] text-brass-400 font-mono">Full</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  admin@pratha.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDevCredentials('hr')}
                className="px-3 py-2 rounded-md border border-executive-700 bg-muted/30 hover:bg-muted text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>HR User</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Restricted</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  hr@pratha.com
                </div>
              </button>
            </div>
          </div>

          {/* Security Guarantee Pill */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/70">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>256-bit Argon2id & rotating session security</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
