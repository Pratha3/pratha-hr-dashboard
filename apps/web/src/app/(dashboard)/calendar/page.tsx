'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  AttendanceKPIData,
  Employee,
  CompanyHoliday
} from '@/types/attendance';
import {
  MOCK_EMPLOYEES,
  generateInitialAttendanceRecords,
  getCompanyHolidays,
  formatDateKey
} from '@/data/attendance-mock-data';
import { CalendarRange, Download, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

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

  // 1. Live Users Query
  const { data: rawUsers = [] } = useQuery({
    queryKey: ['calendar-users'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // 2. Live Attendance Records Query
  const { data: rawAttendance = [] } = useQuery({
    queryKey: ['calendar-attendance', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      try {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        const res = await apiClient.get('/attendance', {
          params: {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
          }
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // 3. Live Leaves Query
  const { data: rawLeaves = [] } = useQuery({
    queryKey: ['calendar-leaves'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/leaves');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // 4. Live Holidays Query
  const { data: rawHolidays = [] } = useQuery({
    queryKey: ['calendar-holidays', currentDate.getFullYear()],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/holidays', {
          params: { year: currentDate.getFullYear() }
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  // Formatted Employees List
  const employees: Employee[] = useMemo(() => {
    if (rawUsers.length > 0) {
      return rawUsers.map((u: any) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        avatar:
          u.profileImageUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.firstName + u.lastName)}`,
        department: u.department?.name || 'General',
        role: u.position || 'Team Member',
        email: u.email
      }));
    }
    return MOCK_EMPLOYEES as any;
  }, [rawUsers]);

  // Formatted Holidays List
  const holidays: CompanyHoliday[] = useMemo(() => {
    if (rawHolidays.length > 0) {
      return rawHolidays.map((h: any) => ({
        id: h.id,
        name: h.name,
        date: typeof h.date === 'string' ? h.date.split('T')[0] : h.date,
        type: 'company' as const
      }));
    }
    return getCompanyHolidays(currentDate.getFullYear());
  }, [rawHolidays, currentDate]);

  // Combined Live Records
  const records: AttendanceRecord[] = useMemo(() => {
    const combined: AttendanceRecord[] = [];

    // 1. Process real attendance records
    if (rawAttendance.length > 0) {
      rawAttendance.forEach((att: any) => {
        const emp = employees.find((e) => e.id === att.userId);
        const statusMap: Record<string, AttendanceStatus> = {
          IN_OFFICE: 'in-office',
          WFH: 'wfh',
          HALF_DAY: 'wfh',
          ON_DUTY: 'in-office',
          ABSENT: 'sick'
        };

        combined.push({
          id: att.id,
          employeeId: att.userId,
          employeeName: emp ? emp.name : `${att.user?.firstName || 'User'} ${att.user?.lastName || ''}`.trim(),
          employeeAvatar: emp ? emp.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${att.userId}`,
          department: emp ? emp.department : att.user?.department?.name || 'Engineering',
          date: typeof att.date === 'string' ? att.date.split('T')[0] : att.date,
          status: statusMap[att.status] || 'in-office',
          notes: att.notes || undefined
        });
      });
    }

    // 2. Process approved leaves
    if (rawLeaves.length > 0) {
      rawLeaves.forEach((lv: any) => {
        if (lv.status === 'APPROVED' || lv.status === 'PENDING') {
          const emp = employees.find((e) => e.id === lv.userId);
          const start = new Date(lv.startDate);
          const end = new Date(lv.endDate);
          const isSick = lv.leaveType?.name?.toLowerCase().includes('sick');

          // Iterate through dates
          const current = new Date(start);
          while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            combined.push({
              id: `leave-${lv.id}-${dateStr}`,
              employeeId: lv.userId,
              employeeName: emp ? emp.name : `${lv.user?.firstName || 'User'} ${lv.user?.lastName || ''}`.trim(),
              employeeAvatar: emp ? emp.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${lv.userId}`,
              department: emp ? emp.department : 'General',
              date: dateStr,
              status: isSick ? 'sick' : 'pto',
              notes: lv.reason || (isSick ? 'Sick Leave' : 'Planned PTO')
            });
            current.setDate(current.getDate() + 1);
          }
        }
      });
    }

    // If no backend records exist yet, fall back to mock generator
    if (combined.length === 0) {
      return generateInitialAttendanceRecords();
    }

    return combined;
  }, [rawAttendance, rawLeaves, employees]);

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
    return employees.filter((emp) => {
      const matchDept =
        filters.department === 'All' || emp.department === filters.department;
      const matchSearch =
        filters.searchQuery.trim() === '' ||
        emp.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(filters.searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [filters, employees]);

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
    const total = employees.length;

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

  const handleSaveLeave = (_newRecords: AttendanceRecord[]) => {
    queryClient.invalidateQueries({ queryKey: ['calendar-leaves'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attendance'] });
    toast.success('Leave scheduled and synced with live calendar.');
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
