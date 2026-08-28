'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/providers/auth-provider';
import { LoadingState } from '@/components/states/loading-state';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-10 w-10 rounded-xl bg-primary animate-pulse flex items-center justify-center text-white font-bold font-display text-lg">
          P
        </div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest animate-pulse">
          Establishing Secure Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
