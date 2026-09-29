'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Clock,
  LogIn,
  LogOut,
  Building2,
  Home,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { TodayAttendanceStatusDto } from '@ems/shared-types';

export function ClockInWidget() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<'IN_OFFICE' | 'WFH' | 'ON_DUTY'>('IN_OFFICE');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch today's live status
  const { data: attendanceStatus, isLoading } = useQuery<TodayAttendanceStatusDto>({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/today');
      return res.data?.data;
    }
  });

  const record = attendanceStatus?.todayRecord;
  const isClockedIn = attendanceStatus?.isClockedIn && !attendanceStatus?.isClockedOut;
  const isCompletedToday = attendanceStatus?.isClockedIn && attendanceStatus?.isClockedOut;

  // Live timer for active work session
  useEffect(() => {
    if (!isClockedIn || !record?.clockIn) {
      setElapsedSeconds(0);
      return;
    }

    const clockInTime = new Date(record.clockIn).getTime();
    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - clockInTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, record?.clockIn]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins
      .toString()
      .padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/attendance/clock-in', {
        status: selectedStatus,
        location: selectedStatus === 'WFH' ? 'Remote Office' : 'Headquarters'
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Successfully clocked in for today!');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to clock in');
    }
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/attendance/clock-out', {});
      return res.data;
    },
    onSuccess: () => {
      toast.success('Successfully clocked out. Have a great evening!');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-attendance'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to clock out');
    }
  });

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm animate-pulse">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="h-6 w-36 bg-muted rounded"></div>
          <div className="h-9 w-28 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm bg-card/70 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-blue-500/80 to-emerald-500/80" />
      <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Today&apos;s Attendance & Shift
          </CardTitle>
          <CardDescription className="text-xs">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </CardDescription>
        </div>

        <div>
          {isCompletedToday ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Shift Completed
            </Badge>
          ) : isClockedIn ? (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 font-medium animate-pulse">
              <Timer className="h-3.5 w-3.5" /> On Duty ({record?.status})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1.5">
              Not Clocked In
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        {isCompletedToday ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-sm">
              <span className="font-medium text-emerald-800 dark:text-emerald-300">
                Total Worked Today:
              </span>{' '}
              <span className="font-bold text-foreground font-mono">
                {Math.floor((record?.workDurationMinutes || 0) / 60)}h{' '}
                {(record?.workDurationMinutes || 0) % 60}m
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              In:{' '}
              {record?.clockIn
                ? new Date(record.clockIn).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '--'}{' '}
              | Out:{' '}
              {record?.clockOut
                ? new Date(record.clockOut).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '--'}
            </div>
          </div>
        ) : isClockedIn ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Work Session
              </div>
              <div className="text-2xl font-bold font-mono text-primary tracking-tight">
                {formatTimer(elapsedSeconds)}
              </div>
              <div className="text-xs text-muted-foreground">
                Clocked in at{' '}
                {record?.clockIn
                  ? new Date(record.clockIn).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '--'}
              </div>
            </div>

            <Button
              variant="destructive"
              className="gap-2 w-full sm:w-auto shadow-sm"
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out Now'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status Type Picker */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('IN_OFFICE')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'IN_OFFICE'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Building2 className="h-4 w-4" />
                In-Office
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('WFH')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'WFH'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Home className="h-4 w-4" />
                Remote / WFH
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('ON_DUTY')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'ON_DUTY'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Client / On-Duty
              </button>
            </div>

            <Button
              className="w-full gap-2 shadow-sm font-semibold"
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
            >
              <LogIn className="h-4 w-4" />
              {clockInMutation.isPending ? 'Registering Check-In...' : 'Clock In for Today'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
