'use client';

import React, { useRef } from 'react';
import { Employee, AttendanceRecord, CompanyHoliday } from '@/types/attendance';
import { STATUS_CONFIG, formatDateKey, MOCK_EMPLOYEES } from '@/data/attendance-mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineViewProps {
  currentDate: Date;
  records: AttendanceRecord[];
  holidays: CompanyHoliday[];
  filteredEmployees: Employee[];
  onSelectRecord: (record: AttendanceRecord) => void;
  onSelectDay: (dateStr: string) => void;
}

export function TimelineView({
  currentDate,
  records,
  holidays,
  filteredEmployees,
  onSelectRecord,
  onSelectDay
}: TimelineViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate 21 days window (7 days before, 14 days after current date)
  const daysRange = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - 5 + i);
    return d;
  });

  const todayKey = formatDateKey(new Date());
  const holidayMap = new Map<string, CompanyHoliday>();
  holidays.forEach((h) => holidayMap.set(h.date, h));

  // Map employeeId + dateKey -> AttendanceRecord
  const recordLookup = new Map<string, AttendanceRecord>();
  records.forEach((r) => {
    recordLookup.set(`${r.employeeId}-${r.date}`, r);
  });

  const handleScroll = (dir: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = dir === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-xs relative">
      {/* Scroll controls */}
      <div className="absolute top-3 right-3 z-20 hidden sm:flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleScroll('left')}
          className="h-7 w-7 rounded-md bg-background/90 backdrop-blur shadow-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleScroll('right')}
          className="h-7 w-7 rounded-md bg-background/90 backdrop-blur shadow-xs"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden select-none pb-2"
      >
        <table className="w-full border-collapse text-left">
          {/* Timeline Header */}
          <thead>
            <tr className="border-b bg-muted/40 divide-x">
              {/* Sticky Employee Header */}
              <th className="sticky left-0 z-10 bg-card/95 backdrop-blur p-3 min-w-[220px] sm:min-w-[250px] text-xs font-bold font-display uppercase tracking-wider text-muted-foreground border-r shadow-xs">
                Employee Roster ({filteredEmployees.length})
              </th>

              {/* Day Headers */}
              {daysRange.map((dayDate) => {
                const dateKey = formatDateKey(dayDate);
                const isToday = dateKey === todayKey;
                const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                const dayHoliday = holidayMap.get(dateKey);
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                const monthName = dayDate.toLocaleDateString('en-US', { month: 'short' });

                return (
                  <th
                    key={dateKey}
                    onClick={() => onSelectDay(dateKey)}
                    className={`p-2 text-center min-w-[65px] sm:min-w-[75px] cursor-pointer hover:bg-muted/60 transition-colors ${
                      isToday ? 'bg-primary/10 font-bold' : isWeekend ? 'bg-muted/20' : ''
                    }`}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase">{dayName}</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                          isToday
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-foreground'
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground/70">{monthName}</div>
                  </th>
                );
              })}

              {/* Total Stats Column */}
              <th className="p-3 text-center min-w-[90px] text-[11px] font-semibold text-muted-foreground uppercase border-l">
                Leave Days
              </th>
            </tr>
          </thead>

          {/* Timeline Employee Rows */}
          <tbody className="divide-y divide-border">
            {filteredEmployees.map((emp) => {
              // Calculate total leaves for this employee in window
              let ptoCount = 0;
              let wfhCount = 0;

              return (
                <tr key={emp.id} className="hover:bg-muted/20 transition-colors group">
                  {/* Sticky Employee Cell */}
                  <td className="sticky left-0 z-10 bg-card/95 backdrop-blur p-3 border-r shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarImage src={emp.avatar} alt={emp.name} />
                        <AvatarFallback className="text-xs font-semibold">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {emp.role}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Day Status Cells */}
                  {daysRange.map((dayDate) => {
                    const dateKey = formatDateKey(dayDate);
                    const isToday = dateKey === todayKey;
                    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                    const dayHoliday = holidayMap.get(dateKey);
                    const record = recordLookup.get(`${emp.id}-${dateKey}`);

                    if (record?.status === 'pto' || record?.status === 'sick') {
                      ptoCount++;
                    } else if (record?.status === 'wfh') {
                      wfhCount++;
                    }

                    return (
                      <td
                        key={`${emp.id}-${dateKey}`}
                        className={`p-1.5 text-center align-middle border-r border-dashed border-border/50 ${
                          isToday ? 'bg-primary/5' : isWeekend ? 'bg-muted/10' : ''
                        }`}
                      >
                        {dayHoliday ? (
                          <div
                            onClick={() => onSelectDay(dateKey)}
                            className="h-8 w-full rounded flex items-center justify-center bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] cursor-pointer"
                            title={dayHoliday.name}
                          >
                            <span>🎉</span>
                          </div>
                        ) : record ? (
                          (() => {
                            const conf = STATUS_CONFIG[record.status];
                            return (
                              <div
                                onClick={() => onSelectRecord(record)}
                                className={`h-8 w-full rounded flex items-center justify-center gap-1 text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-105 ${conf.badgeBg}`}
                                title={`${emp.name}: ${conf.label}${record.notes ? ` (${record.notes})` : ''}`}
                              >
                                <span>{conf.icon}</span>
                              </div>
                            );
                          })()
                        ) : isWeekend ? (
                          <div className="h-8 w-full flex items-center justify-center text-[10px] text-muted-foreground/30">
                            —
                          </div>
                        ) : (
                          <div
                            onClick={() => onSelectDay(dateKey)}
                            className="h-8 w-full rounded flex items-center justify-center text-[10px] text-muted-foreground/40 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            🏢
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Summary Cell */}
                  <td className="p-3 text-center border-l text-xs font-semibold">
                    <span className="text-amber-600 dark:text-amber-400">{ptoCount} PTO</span>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span className="text-blue-600 dark:text-blue-400">{wfhCount} WFH</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
