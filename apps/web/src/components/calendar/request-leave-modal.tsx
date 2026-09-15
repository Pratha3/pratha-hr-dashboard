'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FormField } from '@/components/form/form-field';
import { Employee, AttendanceStatus, AttendanceRecord } from '@/types/attendance';
import { MOCK_EMPLOYEES, STATUS_CONFIG, formatDateKey } from '@/data/attendance-mock-data';
import { Calendar, Palmtree, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RequestLeaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string | null;
  onSaveLeave: (newRecords: AttendanceRecord[]) => void;
}

export function RequestLeaveModal({
  open,
  onOpenChange,
  defaultDate,
  onSaveLeave
}: RequestLeaveModalProps) {
  const todayStr = formatDateKey(new Date());

  const [employeeId, setEmployeeId] = useState<string>(MOCK_EMPLOYEES[0]?.id || '');
  const [status, setStatus] = useState<AttendanceStatus>('pto');
  const [startDate, setStartDate] = useState<string>(defaultDate || todayStr);
  const [endDate, setEndDate] = useState<string>(defaultDate || todayStr);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) {
      setStartDate(defaultDate);
      setEndDate(defaultDate);
    }
  }, [defaultDate, open]);

  const selectedEmployee = MOCK_EMPLOYEES.find((e) => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!employeeId) {
      setErrorMessage('Please select an employee');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage('Please provide both start and end dates');
      return;
    }

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    if (start > end) {
      setErrorMessage('End date cannot be earlier than start date');
      return;
    }

    setIsSubmitting(true);

    try {
      const emp = selectedEmployee || MOCK_EMPLOYEES[0];
      const generatedRecords: AttendanceRecord[] = [];

      // Generate a record for every business day between start and end
      const curr = new Date(start);
      while (curr <= end) {
        const dateKey = formatDateKey(curr);
        const dayOfWeek = curr.getDay();

        // Include weekdays (Mon-Fri)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          generatedRecords.push({
            id: `rec-${emp.id}-${dateKey}-${Date.now()}`,
            employeeId: emp.id,
            employeeName: emp.name,
            employeeAvatar: emp.avatar,
            department: emp.department,
            date: dateKey,
            status,
            notes: notes.trim() || undefined
          });
        }
        curr.setDate(curr.getDate() + 1);
      }

      if (generatedRecords.length === 0) {
        setErrorMessage('Selected range contains only weekends. Please select valid workdays.');
        setIsSubmitting(false);
        return;
      }

      onSaveLeave(generatedRecords);
      toast.success(
        `Leave scheduled for ${emp.name} (${generatedRecords.length} workday${
          generatedRecords.length > 1 ? 's' : ''
        })`
      );

      // Reset & close
      setNotes('');
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Palmtree className="h-4 w-4" />
            <span>Time Off & Availability</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground">
            Schedule Leave / Remote Work
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Log planned vacation, medical leave, or remote workdays for team members.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Employee Picker */}
          <FormField label="Employee" required>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-10 text-xs bg-background">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {MOCK_EMPLOYEES.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 border">
                        <AvatarImage src={emp.avatar} alt={emp.name} />
                        <AvatarFallback className="text-[9px]">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.name}</span>
                      <span className="text-[10px] text-muted-foreground">({emp.department})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Status / Type Selector */}
          <FormField label="Leave / Availability Status" required>
            <Select value={status} onValueChange={(val) => setStatus(val as AttendanceStatus)}>
              <SelectTrigger className="h-10 text-xs bg-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pto" className="text-xs">
                  <span className="mr-1.5">🌴</span> Planned PTO / Vacation
                </SelectItem>
                <SelectItem value="wfh" className="text-xs">
                  <span className="mr-1.5">🏠</span> Remote / Work From Home
                </SelectItem>
                <SelectItem value="sick" className="text-xs">
                  <span className="mr-1.5">🤒</span> Sick / Medical Leave
                </SelectItem>
                <SelectItem value="in-office" className="text-xs">
                  <span className="mr-1.5">🏢</span> In-Office Workday
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date" required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-xs bg-background"
                required
              />
            </FormField>

            <FormField label="End Date" required>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs bg-background"
                required
              />
            </FormField>
          </div>

          {/* Notes / Reason */}
          <FormField label="Reason / Notes (Optional)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual summer vacation with family, Doctor visit rest..."
              className="text-xs bg-background resize-none h-20"
              rows={3}
            />
          </FormField>

          <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Leave Entry</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
