'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AttendanceKPIData } from '@/types/attendance';
import {
  Users,
  Palmtree,
  Laptop,
  PartyPopper,
  TrendingUp,
  Activity,
  HeartPulse,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AttendanceKPIsProps {
  kpi: AttendanceKPIData;
  onFilterStatus?: (status: string) => void;
}

export function AttendanceKPIs({ kpi, onFilterStatus }: AttendanceKPIsProps) {
  const cards = [
    {
      id: 'present',
      title: 'Present Today',
      value: `${kpi.presentToday} / ${kpi.totalEmployees}`,
      percentage: `${kpi.presentPercentage}%`,
      subtitle: `${kpi.presentToday} active on-site`,
      icon: Users,
      color: 'emerald',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      progress: kpi.presentPercentage,
      progressColor: 'bg-emerald-500',
      statusTarget: 'in-office'
    },
    {
      id: 'on-leave',
      title: 'On Leave Today',
      value: `${kpi.onLeaveToday}`,
      percentage: `${kpi.totalEmployees > 0 ? Math.round((kpi.onLeaveToday / kpi.totalEmployees) * 100) : 0}%`,
      subtitle: `${kpi.ptoToday} PTO · ${kpi.sickToday} Sick`,
      icon: Palmtree,
      color: 'amber',
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      progress: kpi.totalEmployees > 0 ? Math.round((kpi.onLeaveToday / kpi.totalEmployees) * 100) : 0,
      progressColor: 'bg-amber-500',
      statusTarget: 'pto'
    },
    {
      id: 'wfh',
      title: 'Working Remote',
      value: `${kpi.wfhToday}`,
      percentage: `${kpi.wfhPercentage}%`,
      subtitle: 'Distributed team capacity',
      icon: Laptop,
      color: 'blue',
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      progress: kpi.wfhPercentage,
      progressColor: 'bg-blue-500',
      statusTarget: 'wfh'
    },
    {
      id: 'holidays',
      title: 'Upcoming Holidays',
      value: `${kpi.upcomingHolidaysCount}`,
      percentage: kpi.nextHoliday ? 'Next Soon' : 'None',
      subtitle: kpi.nextHoliday ? `${kpi.nextHoliday.name} (${kpi.nextHoliday.date.slice(5)})` : 'No holidays in next 7d',
      icon: PartyPopper,
      color: 'purple',
      gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      progress: kpi.upcomingHolidaysCount > 0 ? 100 : 0,
      progressColor: 'bg-purple-500',
      statusTarget: 'holiday'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
          >
            <Card
              onClick={() => onFilterStatus?.(card.statusTarget)}
              className={`relative overflow-hidden border ${card.border} bg-card hover:shadow-md transition-all duration-200 cursor-pointer group`}
            >
              {/* Background Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity`}
              />

              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {card.title}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-display text-foreground tracking-tight">
                        {card.value}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        ({card.percentage})
                      </span>
                    </div>
                  </div>

                  <div
                    className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="h-1.5 w-full bg-muted/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${card.progressColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(5, card.progress))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{card.subtitle}</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 group-hover:opacity-100 font-semibold group-hover:text-primary transition-colors">
                      Filter →
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
