'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { AttendanceKPIs } from '@/components/calendar/attendance-kpis';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { MonthView } from '@/components/calendar/month-view';
import { WeekView } from '@/components/calendar/week-view';
import { TimelineView } from '@/components/calendar/timeline-view';
import { EventDetailsModal } from '@/components/calendar/event-details-modal';
import { DayOverviewModal } from '@/components/calendar/day-overview-modal';
import { RequestLeaveModal } from '@/components/calendar/request-leave-modal';
import {
  CalendarViewMode,
  AttendanceStatus,
  AttendanceRecord,
  AttendanceFilterState,
  AttendanceKPIData
} from '@/types/attendance';
import {
  MOCK_EMPLOYEES,
  generateInitialAttendanceRecords,
  getCompanyHolidays,
  formatDateKey
} from '@/data/attendance-mock-data';
import { CalendarRange, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Master records state (loaded from realistic generator)
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    generateInitialAttendanceRecords()
  );

  // Filters state
  const [filters, setFilters] = useState<AttendanceFilterState>({
    department: 'All',
    selectedStatuses: ['in-office', 'wfh', 'pto', 'sick', 'holiday'],
    searchQuery: ''
  });

  // Modal interaction states
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [dayOverviewModalOpen, setDayOverviewModalOpen] = useState(false);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestDefaultDate, setRequestDefaultDate] = useState<string | null>(null);

  // Holidays for current year
  const holidays = useMemo(
    () => getCompanyHolidays(currentDate.getFullYear()),
    [currentDate]
  );

  // Date navigation handlers
  const handleNavigatePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 14);
    }
    setCurrentDate(next);
  };

  const handleNavigateNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 14);
    }
    setCurrentDate(next);
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  // Title string computation
  const titleText = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    } else if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return `${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} – ${end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    } else {
      return `Schedule Timeline (${currentDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })})`;
    }
  }, [currentDate, viewMode]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEES.filter((emp) => {
      const matchDept =
        filters.department === 'All' || emp.department === filters.department;
      const matchSearch =
        filters.searchQuery.trim() === '' ||
        emp.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(filters.searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [filters]);

  const filteredEmpIds = useMemo(
    () => new Set(filteredEmployees.map((e) => e.id)),
    [filteredEmployees]
  );

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchEmp = filteredEmpIds.has(r.employeeId);
      const matchStatus = filters.selectedStatuses.includes(r.status);
      return matchEmp && matchStatus;
    });
  }, [records, filteredEmpIds, filters.selectedStatuses]);

  // Compute live KPIs for Today
  const todayKey = formatDateKey(new Date());
  const kpiData: AttendanceKPIData = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === todayKey);
    const total = MOCK_EMPLOYEES.length;

    const ptoCount = todayRecords.filter((r) => r.status === 'pto').length;
    const sickCount = todayRecords.filter((r) => r.status === 'sick').length;
    const wfhCount = todayRecords.filter((r) => r.status === 'wfh').length;
    const onLeaveCount = ptoCount + sickCount;
    const presentCount = Math.max(0, total - onLeaveCount);

    const todayDate = new Date();
    const upcomingHolidays = holidays.filter((h) => {
      const hDate = new Date(h.date + 'T00:00:00');
      const diffDays = (hDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 30;
    });

    return {
      totalEmployees: total,
      presentToday: presentCount,
      presentPercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
      onLeaveToday: onLeaveCount,
      ptoToday: ptoCount,
      sickToday: sickCount,
      wfhToday: wfhCount,
      wfhPercentage: total > 0 ? Math.round((wfhCount / total) * 100) : 0,
      upcomingHolidaysCount: upcomingHolidays.length,
      nextHoliday: upcomingHolidays[0]
    };
  }, [records, todayKey, holidays]);

  // Selection handlers
  const handleSelectRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setDetailsModalOpen(true);
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDayStr(dateStr);
    setDayOverviewModalOpen(true);
  };

  const handleAddLeaveForDate = (dateStr: string) => {
    setRequestDefaultDate(dateStr);
    setRequestModalOpen(true);
  };

  const handleSaveLeave = (newRecords: AttendanceRecord[]) => {
    // Deduplicate by employeeId + date
    const newKeys = new Set(newRecords.map((r) => `${r.employeeId}-${r.date}`));
    setRecords((prev) => [
      ...prev.filter((r) => !newKeys.has(`${r.employeeId}-${r.date}`)),
      ...newRecords
    ]);
  };

  const handleExport = () => {
    toast.success('Calendar roster schedule exported to CSV');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Leave & Availability Calendar"
        description="Real-time corporate attendance, planned PTO, sick leaves, remote work roster, and official company holidays."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 text-xs bg-background"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export Roster</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setRequestDefaultDate(null);
              setRequestModalOpen(true);
            }}
            className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 shadow-xs"
          >
            <CalendarRange className="h-4 w-4" />
            <span>Schedule Leave</span>
          </Button>
        </div>
      </PageHeader>

      {/* Top KPI Summary Metrics Cards */}
      <AttendanceKPIs
        kpi={kpiData}
        onFilterStatus={(status) => {
          setFilters((prev) => ({
            ...prev,
            selectedStatuses: [status as AttendanceStatus]
          }));
          toast.info(`Filtered calendar for ${status} status`);
        }}
      />

      {/* Calendar Controls & Filters Toolbar */}
      <CalendarToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onNavigateToday={handleNavigateToday}
        title={titleText}
        filters={filters}
        onFilterChange={setFilters}
        onOpenRequestModal={() => {
          setRequestDefaultDate(null);
          setRequestModalOpen(true);
        }}
        totalFilteredRecords={filteredRecords.length}
      />

      {/* Active Calendar View with Smooth Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              records={filteredRecords}
              holidays={holidays}
              onSelectRecord={handleSelectRecord}
              onSelectDay={handleSelectDay}
            />
          )}

          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              records={filteredRecords}
              holidays={holidays}
              onSelectRecord={handleSelectRecord}
              onSelectDay={handleSelectDay}
            />
          )}

          {viewMode === 'timeline' && (
            <TimelineView
              currentDate={currentDate}
              records={filteredRecords}
              holidays={holidays}
              filteredEmployees={filteredEmployees}
              onSelectRecord={handleSelectRecord}
              onSelectDay={handleSelectDay}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals & Dialogs */}
      <EventDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        record={selectedRecord}
      />

      <DayOverviewModal
        open={dayOverviewModalOpen}
        onOpenChange={setDayOverviewModalOpen}
        dateStr={selectedDayStr}
        records={
          selectedDayStr
            ? filteredRecords.filter((r) => r.date === selectedDayStr)
            : []
        }
        holiday={
          selectedDayStr
            ? holidays.find((h) => h.date === selectedDayStr)
            : undefined
        }
        onSelectRecord={handleSelectRecord}
        onAddLeaveForDate={handleAddLeaveForDate}
      />

      <RequestLeaveModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        defaultDate={requestDefaultDate}
        onSaveLeave={handleSaveLeave}
      />
    </div>
  );
}
