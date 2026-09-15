'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AttendanceRecord, CompanyHoliday, AttendanceStatus } from '@/types/attendance';
import { STATUS_CONFIG } from '@/data/attendance-mock-data';
import {
  Calendar,
  Users,
  Search,
  Plus,
  Palmtree,
  PartyPopper,
  Building2
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DayOverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateStr: string | null;
  records: AttendanceRecord[];
  holiday?: CompanyHoliday;
  onSelectRecord: (record: AttendanceRecord) => void;
  onAddLeaveForDate: (dateStr: string) => void;
}

export function DayOverviewModal({
  open,
  onOpenChange,
  dateStr,
  records,
  holiday,
  onSelectRecord,
  onAddLeaveForDate
}: DayOverviewModalProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  if (!dateStr) return null;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || r.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const counts: Record<AttendanceStatus, number> = {
    'in-office': records.filter((r) => r.status === 'in-office').length,
    'wfh': records.filter((r) => r.status === 'wfh').length,
    'pto': records.filter((r) => r.status === 'pto').length,
    'sick': records.filter((r) => r.status === 'sick').length,
    'holiday': records.filter((r) => r.status === 'holiday').length
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{formattedDate}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Team availability breakdown & scheduled time off
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {holiday && (
          <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-2.5 text-xs font-semibold">
            <PartyPopper className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>Company Holiday: {holiday.name}</span>
          </div>
        )}

        {/* Quick Status Count Badges */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <p className="font-bold text-sm">{counts['in-office']}</p>
            <p className="text-[10px] uppercase font-medium">In-Office</p>
          </div>
          <div className="p-2 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300">
            <p className="font-bold text-sm">{counts['wfh']}</p>
            <p className="text-[10px] uppercase font-medium">Remote</p>
          </div>
          <div className="p-2 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300">
            <p className="font-bold text-sm">{counts['pto']}</p>
            <p className="text-[10px] uppercase font-medium">PTO</p>
          </div>
          <div className="p-2 rounded-lg border bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300">
            <p className="font-bold text-sm">{counts['sick']}</p>
            <p className="text-[10px] uppercase font-medium">Sick</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter attendees..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Attendee Roster List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[320px] divide-y border rounded-lg p-2 bg-muted/20">
          {filteredRecords.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p>No employee records found matching filter.</p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const conf = STATUS_CONFIG[rec.status];
              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    onOpenChange(false);
                    onSelectRecord(rec);
                  }}
                  className="pt-2 first:pt-0 flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={rec.employeeAvatar} alt={rec.employeeName} />
                      <AvatarFallback className="text-[11px] font-semibold">
                        {rec.employeeName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {rec.employeeName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {rec.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 border ${conf.badgeBg}`}
                    >
                      <span className="mr-1">{conf.icon}</span>
                      <span>{conf.label}</span>
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onAddLeaveForDate(dateStr);
            }}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Leave for Date</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
