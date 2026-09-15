'use client';

import React from 'react';
import { AttendanceRecord, CompanyHoliday, AttendanceStatus } from '@/types/attendance';
import { STATUS_CONFIG, formatDateKey } from '@/data/attendance-mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MonthViewProps {
  currentDate: Date;
  records: AttendanceRecord[];
  holidays: CompanyHoliday[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onSelectDay: (dateStr: string) => void;
}

export function MonthView({
  currentDate,
  records,
  holidays,
  onSelectRecord,
  onSelectDay
}: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month & number of days in month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun

  // Days from previous month to fill first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from(
    { length: startingDayOfWeek },
    (_, i) => prevMonthLastDay - startingDayOfWeek + i + 1
  );

  // Days in current month
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Days in next month to fill remaining grid (to complete 35 or 42 cells)
  const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
  const nextMonthDaysCount = totalCells - (startingDayOfWeek + daysInMonth);
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => i + 1);

  const todayKey = formatDateKey(new Date());
  const holidayMap = new Map<string, CompanyHoliday>();
  holidays.forEach((h) => holidayMap.set(h.date, h));

  // Group records by dateKey
  const recordsByDate = new Map<string, AttendanceRecord[]>();
  records.forEach((r) => {
    const list = recordsByDate.get(r.date) || [];
    list.push(r);
    recordsByDate.set(r.date, list);
  });

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2.5 divide-x">
        {weekDayNames.map((d, i) => (
          <div key={d} className={`py-0.5 ${i === 0 || i === 6 ? 'text-muted-foreground/60' : ''}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y border-b last:border-b-0 bg-background/50">
        {/* Previous Month Inactive Days */}
        {prevMonthDays.map((d) => {
          const prevDate = new Date(year, month - 1, d);
          const dateKey = formatDateKey(prevDate);
          return (
            <div
              key={`prev-${d}`}
              onClick={() => onSelectDay(dateKey)}
              className="min-h-[115px] sm:min-h-[130px] p-1.5 bg-muted/15 text-muted-foreground/40 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col justify-between select-none"
            >
              <div className="text-[11px] font-semibold p-1">{d}</div>
              <div className="text-[10px] text-muted-foreground/30 text-center pb-1">
                Prev month
              </div>
            </div>
          );
        })}

        {/* Current Month Active Days */}
        {currentMonthDays.map((d) => {
          const dayDate = new Date(year, month, d);
          const dateKey = formatDateKey(dayDate);
          const isToday = dateKey === todayKey;
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayHoliday = holidayMap.get(dateKey);
          const dayRecords = recordsByDate.get(dateKey) || [];

          const maxVisible = 3;
          const visibleRecords = dayRecords.slice(0, maxVisible);
          const overflowCount = Math.max(0, dayRecords.length - maxVisible);

          return (
            <div
              key={`curr-${d}`}
              onClick={(e) => {
                // If user didn't click directly on a chip
                if ((e.target as HTMLElement).closest('.event-chip')) return;
                onSelectDay(dateKey);
              }}
              className={`min-h-[115px] sm:min-h-[130px] p-1.5 transition-all flex flex-col justify-between group cursor-pointer ${
                isWeekend ? 'bg-muted/10' : 'bg-background hover:bg-muted/20'
              } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
            >
              {/* Day Number Header & Holiday Badge */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold transition-colors ${
                    isToday
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : isWeekend
                      ? 'text-muted-foreground/60'
                      : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {d}
                </span>

                {dayHoliday && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 truncate max-w-[110px]"
                    title={dayHoliday.name}
                  >
                    <PartyPopper className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate hidden sm:inline">{dayHoliday.name}</span>
                  </span>
                )}
              </div>

              {/* Event Chips List */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {visibleRecords.map((rec) => {
                  const conf = STATUS_CONFIG[rec.status];
                  return (
                    <div
                      key={rec.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord(rec);
                      }}
                      className={`event-chip group/chip flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer truncate ${conf.chipBg}`}
                      title={`${rec.employeeName} — ${conf.label}${rec.notes ? `: ${rec.notes}` : ''}`}
                    >
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <Avatar className="h-3.5 w-3.5 border shrink-0">
                          <AvatarImage src={rec.employeeAvatar} alt={rec.employeeName} />
                          <AvatarFallback className="text-[7px]">
                            {rec.employeeName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{rec.employeeName}</span>
                      </div>

                      <span className="text-[9px] shrink-0 font-bold opacity-90 hidden xl:inline">
                        {conf.icon}
                      </span>
                    </div>
                  );
                })}

                {/* Overflow Pill */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(dateKey);
                    }}
                    className="w-full text-center text-[10px] font-semibold text-muted-foreground hover:text-primary bg-muted/40 hover:bg-muted/80 rounded py-0.5 transition-colors cursor-pointer"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>

              {/* Bottom Day Quick Add Indicator on Hover */}
              <div className="h-3 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                  <Plus className="h-2.5 w-2.5" />
                  <span>View</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* Next Month Inactive Days */}
        {nextMonthDays.map((d) => {
          const nextDate = new Date(year, month + 1, d);
          const dateKey = formatDateKey(nextDate);
          return (
            <div
              key={`next-${d}`}
              onClick={() => onSelectDay(dateKey)}
              className="min-h-[115px] sm:min-h-[130px] p-1.5 bg-muted/15 text-muted-foreground/40 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col justify-between select-none"
            >
              <div className="text-[11px] font-semibold p-1">{d}</div>
              <div className="text-[10px] text-muted-foreground/30 text-center pb-1">
                Next month
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
