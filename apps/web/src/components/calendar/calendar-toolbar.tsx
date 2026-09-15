'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CalendarViewMode,
  AttendanceStatus,
  AttendanceFilterState
} from '@/types/attendance';
import { MOCK_DEPARTMENTS, STATUS_CONFIG } from '@/data/attendance-mock-data';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  GanttChartSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Filter,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  currentDate: Date;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  title: string;
  filters: AttendanceFilterState;
  onFilterChange: (newFilters: AttendanceFilterState) => void;
  onOpenRequestModal: () => void;
  totalFilteredRecords: number;
}

export function CalendarToolbar({
  viewMode,
  onViewModeChange,
  currentDate,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  title,
  filters,
  onFilterChange,
  onOpenRequestModal,
  totalFilteredRecords
}: CalendarToolbarProps) {
  const allStatuses: AttendanceStatus[] = ['in-office', 'wfh', 'pto', 'sick', 'holiday'];

  const toggleStatus = (status: AttendanceStatus) => {
    let nextStatuses: AttendanceStatus[];
    if (filters.selectedStatuses.includes(status)) {
      // Don't allow unchecking all
      if (filters.selectedStatuses.length === 1) return;
      nextStatuses = filters.selectedStatuses.filter((s) => s !== status);
    } else {
      nextStatuses = [...filters.selectedStatuses, status];
    }
    onFilterChange({ ...filters, selectedStatuses: nextStatuses });
  };

  const selectAllStatuses = () => {
    onFilterChange({ ...filters, selectedStatuses: allStatuses });
  };

  const handleDepartmentChange = (dept: string) => {
    onFilterChange({ ...filters, department: dept });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const clearSearch = () => {
    onFilterChange({ ...filters, searchQuery: '' });
  };

  const resetAllFilters = () => {
    onFilterChange({
      department: 'All',
      selectedStatuses: allStatuses,
      searchQuery: ''
    });
  };

  const isFiltered =
    filters.department !== 'All' ||
    filters.selectedStatuses.length !== allStatuses.length ||
    filters.searchQuery.trim().length > 0;

  return (
    <div className="space-y-3 bg-card border rounded-xl p-4 shadow-xs">
      {/* Top Row: Date Navigation + View Switcher + Action CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Month/Week Title & Nav buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center border rounded-lg overflow-hidden bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigatePrev}
              className="h-9 w-9 rounded-none border-r hover:bg-muted"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToday}
              className="h-9 px-3 rounded-none text-xs font-semibold hover:bg-muted"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateNext}
              className="h-9 w-9 rounded-none border-l hover:bg-muted"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            <span>{title}</span>
          </h2>
        </div>

        {/* Right: View Mode Toggle + CTA Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Tabs */}
          <div className="inline-flex p-1 rounded-lg border bg-muted/50 text-muted-foreground text-xs font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange('month')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'hover:text-foreground'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('week')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span>Week</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'hover:text-foreground'
              }`}
            >
              <GanttChartSquare className="h-3.5 w-3.5 text-primary" />
              <span>Timeline</span>
            </button>
          </div>

          {/* Request / Add Leave CTA Button */}
          <Button
            onClick={onOpenRequestModal}
            className="h-9 gap-1.5 shadow-xs text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Request Leave</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Search + Department Dropdown + Status Filter Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-border/60">
        {/* Left: Search Input & Department Dropdown */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filters.searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by employee name or role..."
              className="pl-8.5 pr-8 h-8.5 text-xs bg-background"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8.5 text-xs gap-1.5 shrink-0 bg-background font-medium">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Dept: {filters.department}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Filter Department</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MOCK_DEPARTMENTS.map((dept) => (
                <DropdownMenuItem
                  key={dept}
                  onClick={() => handleDepartmentChange(dept)}
                  className={`text-xs cursor-pointer ${
                    filters.department === dept ? 'font-semibold text-primary bg-primary/10' : ''
                  }`}
                >
                  {dept}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>

        {/* Right: Status Multi-Select Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline">
            Status:
          </span>
          {allStatuses.map((st) => {
            const conf = STATUS_CONFIG[st];
            const isSelected = filters.selectedStatuses.includes(st);
            return (
              <button
                key={st}
                type="button"
                onClick={() => toggleStatus(st)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border select-none cursor-pointer ${
                  isSelected
                    ? conf.badgeBg
                    : 'bg-muted/40 text-muted-foreground/60 border-transparent hover:bg-muted'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? conf.dotColor : 'bg-muted-foreground/40'
                  }`}
                />
                <span>{conf.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
