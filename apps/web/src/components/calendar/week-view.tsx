'use client';

import React from 'react';
import { AttendanceRecord, CompanyHoliday } from '@/types/attendance';
import { STATUS_CONFIG, formatDateKey } from '@/data/attendance-mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PartyPopper, Plus, Users, Clock, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface WeekViewProps {
  currentDate: Date;
  records: AttendanceRecord[];
  holidays: CompanyHoliday[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onSelectDay: (dateStr: string) => void;
}

export function WeekView({
  currentDate,
  records,
  holidays,
  onSelectRecord,
  onSelectDay
}: WeekViewProps) {
  // Compute start of week (Sunday or Monday)
  const current = new Date(currentDate);
  const dayOfWeek = current.getDay();
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const todayKey = formatDateKey(new Date());
  const holidayMap = new Map<string, CompanyHoliday>();
  holidays.forEach((h) => holidayMap.set(h.date, h));

  const recordsByDate = new Map<string, AttendanceRecord[]>();
  records.forEach((r) => {
    const list = recordsByDate.get(r.date) || [];
    list.push(r);
    recordsByDate.set(r.date, list);
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
      {/* 7 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-border">
        {weekDays.map((dayDate, idx) => {
          const dateKey = formatDateKey(dayDate);
          const isToday = dateKey === todayKey;
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayHoliday = holidayMap.get(dateKey);
          const dayRecords = recordsByDate.get(dateKey) || [];

          const weekdayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
          const monthName = dayDate.toLocaleDateString('en-US', { month: 'short' });
          const dayNum = dayDate.getDate();

          return (
            <div
              key={dateKey}
              className={`flex flex-col min-h-[500px] ${
                isWeekend ? 'bg-muted/15' : 'bg-background'
              }`}
            >
              {/* Column Header */}
              <div
                onClick={() => onSelectDay(dateKey)}
                className={`p-3 border-b text-center cursor-pointer transition-colors hover:bg-muted/40 ${
                  isToday ? 'bg-primary/10 border-b-primary/40' : 'bg-muted/30'
                }`}
              >
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {weekdayName}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-bold ${
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-foreground'
                    }`}
                  >
                    {dayNum}
                  </span>
                  <span className="text-xs text-muted-foreground">{monthName}</span>
                </div>

                {dayHoliday && (
                  <div className="mt-1.5 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold flex items-center justify-center gap-1">
                    <PartyPopper className="h-3 w-3 shrink-0" />
                    <span className="truncate">{dayHoliday.name}</span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                  <span className="font-semibold text-foreground">{dayRecords.length}</span>
                  <span>members</span>
                </div>
              </div>

              {/* Day Roster Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[520px]">
                {dayRecords.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center text-xs text-muted-foreground/60 p-2">
                    <p>No team leaves</p>
                    <span className="text-[10px]">All in-office / standard</span>
                  </div>
                ) : (
                  dayRecords.map((rec) => {
                    const conf = STATUS_CONFIG[rec.status];
                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -1 }}
                        onClick={() => onSelectRecord(rec)}
                        className={`p-2.5 rounded-lg border bg-card hover:shadow-xs transition-all cursor-pointer group ${conf.border}/40`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 border shrink-0">
                              <AvatarImage src={rec.employeeAvatar} alt={rec.employeeName} />
                              <AvatarFallback className="text-[10px] font-semibold">
                                {rec.employeeName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                {rec.employeeName}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {rec.department}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0.5 border ${conf.badgeBg}`}
                          >
                            <span className="mr-1">{conf.icon}</span>
                            <span>{conf.label}</span>
                          </Badge>
                        </div>

                        {rec.notes && (
                          <p className="mt-1.5 text-[10px] text-muted-foreground line-clamp-2 bg-muted/40 p-1 rounded border text-left">
                            {rec.notes}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
