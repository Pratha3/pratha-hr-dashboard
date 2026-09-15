'use client';

import React from 'react';
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
import { AttendanceRecord } from '@/types/attendance';
import { STATUS_CONFIG } from '@/data/attendance-mock-data';
import {
  Calendar,
  Building2,
  Mail,
  UserCheck,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  onDeleteRecord?: (id: string) => void;
}

export function EventDetailsModal({
  open,
  onOpenChange,
  record,
  onDeleteRecord
}: EventDetailsModalProps) {
  if (!record) return null;

  const conf = STATUS_CONFIG[record.status];

  const handleAcknowledge = () => {
    toast.success(`Acknowledged ${record.employeeName}'s ${conf.label}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-border shadow-xs">
              <AvatarImage src={record.employeeAvatar} alt={record.employeeName} />
              <AvatarFallback className="font-semibold text-sm">
                {record.employeeName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold font-display text-foreground">
                {record.employeeName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{record.department}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Status Chip Banner */}
          <div
            className={`p-3 rounded-lg border ${conf.border}/30 ${conf.badgeBg} flex items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{conf.icon}</span>
              <div>
                <p className="text-xs font-bold leading-tight">{conf.label}</p>
                <p className="text-[11px] opacity-80">{conf.description}</p>
              </div>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${conf.dotColor} animate-pulse`}
            />
          </div>

          {/* Details Table Card */}
          <div className="rounded-lg border bg-muted/30 divide-y text-xs">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Scheduled Date:
              </span>
              <span className="font-semibold font-mono text-foreground">
                {record.date}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Duration:
              </span>
              <span className="font-semibold text-foreground">Full Day (8 hrs)</span>
            </div>

            {record.notes && (
              <div className="p-2.5 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Notes / Reason:
                </span>
                <p className="text-foreground bg-background p-2 rounded-md border text-[11px] leading-relaxed">
                  {record.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2">
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
            onClick={handleAcknowledge}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Acknowledge Status</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
