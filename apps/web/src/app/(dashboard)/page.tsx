'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Key
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { user, permissions } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Executive Overview`}
        description={`Welcome back, ${user?.firstName} ${user?.lastName}. Live session connected to Neon PostgreSQL.`}
        badge={
          <Badge variant={user?.role?.name === 'ADMIN' ? 'brass' : 'secondary'}>
            {user?.role?.name} Session
          </Badge>
        }
      >
        <Button asChild size="sm" variant="brass" className="gap-2">
          <Link href="/employees">
            <span>Explore Directory</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-executive-700/60 bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brass-500/10 text-brass-400 text-xs font-semibold border border-brass-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Phase 1–4 Frontend Online</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            EMS Session & Security Active
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your credentials have been securely verified using <strong>Argon2id</strong>. All permissions and active statuses are being re-derived live from the database on every authenticated API request.
          </p>
        </div>
      </motion.div>

      {/* Permission Summary Card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Live Database Permissions ({permissions.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Role: {user?.role?.name}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {permissions.map((perm) => (
            <div
              key={perm}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border text-[11px] font-mono text-foreground font-medium"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
