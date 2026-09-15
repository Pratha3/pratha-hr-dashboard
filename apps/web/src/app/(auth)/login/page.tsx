'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@ems/validation';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/form-field';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const fillDevCredentials = (role: 'admin' | 'hr' | 'employee') => {
    if (role === 'admin') {
      setValue('email', 'admin@nexus.com');
      setValue('password', 'Admin@123456');
    } else if (role === 'hr') {
      setValue('email', 'hr@nexus.com');
      setValue('password', 'Hr@123456');
    } else {
      setValue('email', 'alex.morgan@nexus.com');
      setValue('password', 'Emp@123456');
    }
    setErrorMessage(null);
  };

  // If user is already logged in, show sleek redirecting indicator
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
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-background via-background/95 to-muted/40 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Utilities */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="rounded-xl border bg-card/95 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-11 w-11 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-xs mb-1">
              N
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Enter your corporate credentials to access your enterprise dashboard.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Corporate Email" error={errors.email?.message} required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="admin@nexus.com"
                  className="pl-9 h-10 bg-background text-sm"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="pl-9 pr-9 h-10 bg-background text-sm font-mono"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Remember session</span>
              </label>
              <Link
                href="/forgot-password"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-10 gap-2 font-semibold shadow-xs"
              isLoading={isSubmitting}
            >
              <span>Authenticate Session</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            New to Nexus HR?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Create an organization
            </Link>
          </div>

          {/* Dev Quick Fill Pill Controls */}
          <div className="pt-2 border-t border-border/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 font-medium">
                <KeyRound className="h-3 w-3 text-primary" />
                Quick Dev Credentials:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => fillDevCredentials('admin')}
                className="px-2.5 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Admin</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono truncate">
                  admin@nexus.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDevCredentials('hr')}
                className="px-2.5 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>HR</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono truncate">
                  hr@nexus.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillDevCredentials('employee')}
                className="px-2.5 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Employee</span>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono truncate">
                  alex@nexus.com
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
