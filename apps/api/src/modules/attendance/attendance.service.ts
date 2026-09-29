import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../../common/errors/app-error';
import { AttendanceStatus } from '@prisma/client';
import {
  ClockInInput,
  ClockOutInput,
  AttendanceQueryInput,
  ManualAttendanceInput
} from '@ems/validation';
import { PermissionName, Permissions, TodayAttendanceStatusDto } from '@ems/shared-types';

export class AttendanceService {
  /**
   * Helper to normalize a date to start of UTC day (midnight)
   */
  private normalizeDate(dateInput: Date | string = new Date()): Date {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    const d = new Date(dateInput);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /**
   * Get today's clock-in/out status for a specific user
   */
  async getTodayStatus(userId: string, organizationId?: string): Promise<TodayAttendanceStatusDto> {
    const today = this.normalizeDate(new Date());

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        date: today
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            profileImageUrl: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!record) {
      return {
        isClockedIn: false,
        isClockedOut: false,
        todayRecord: null,
        workDurationMinutes: 0
      };
    }

    const isClockedIn = Boolean(record.clockIn);
    const isClockedOut = Boolean(record.clockOut);

    let workDuration = record.workDurationMinutes || 0;
    if (isClockedIn && !isClockedOut && record.clockIn) {
      workDuration = Math.max(
        0,
        Math.round((Date.now() - new Date(record.clockIn).getTime()) / (1000 * 60))
      );
    }

    return {
      isClockedIn,
      isClockedOut,
      todayRecord: {
        ...record,
        date: record.date.toISOString().split('T')[0]
      } as any,
      workDurationMinutes: workDuration
    };
  }

  /**
   * Clock-in for the current day
   */
  async clockIn(
    userId: string,
    organizationId: string,
    data: ClockInInput,
    ipAddress?: string
  ) {
    const today = this.normalizeDate(new Date());
    const now = new Date();

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        organizationId_userId_date: {
          organizationId,
          userId,
          date: today
        }
      }
    });

    if (existing && existing.clockIn) {
      throw new ConflictError('You have already clocked in for today.');
    }

    const statusEnum = (data.status as AttendanceStatus) || AttendanceStatus.IN_OFFICE;

    if (existing) {
      return prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          clockIn: now,
          status: statusEnum,
          location: data.location || existing.location,
          notes: data.notes || existing.notes,
          ipAddress: ipAddress || existing.ipAddress
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });
    }

    try {
      return await prisma.attendanceRecord.create({
        data: {
          organizationId,
          userId,
          date: today,
          clockIn: now,
          status: statusEnum,
          location: data.location || null,
          notes: data.notes || null,
          ipAddress: ipAddress || null
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });
    } catch (err: any) {
      // Prisma P2002 unique constraint violation on race condition
      if (err.code === 'P2002') {
        throw new ConflictError('You have already clocked in for today.');
      }
      throw err;
    }
  }

  /**
   * Clock-out for the current day
   */
  async clockOut(userId: string, organizationId: string, data: ClockOutInput) {
    const today = this.normalizeDate(new Date());
    const now = new Date();

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        organizationId_userId_date: {
          organizationId,
          userId,
          date: today
        }
      }
    });

    if (!existing || !existing.clockIn) {
      throw new BadRequestError('Cannot clock out before clocking in today.');
    }

    if (existing.clockOut) {
      throw new ConflictError('You have already clocked out for today.');
    }

    const durationMinutes = Math.max(
      0,
      Math.round((now.getTime() - new Date(existing.clockIn).getTime()) / (1000 * 60))
    );

    const updatedNotes = data.notes
      ? existing.notes
        ? `${existing.notes} | Out: ${data.notes}`
        : data.notes
      : existing.notes;

    return prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        clockOut: now,
        workDurationMinutes: durationMinutes,
        notes: updatedNotes
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
  }

  /**
   * List attendance records with filtering
   */
  async listAttendance(
    organizationId: string,
    filters: AttendanceQueryInput,
    currentUserId: string,
    userPermissions: PermissionName[]
  ) {
    const hasAdminAccess =
      userPermissions.includes(Permissions.ATTENDANCE_MANAGE) ||
      userPermissions.includes(Permissions.USER_READ);

    const targetUserId = hasAdminAccess ? filters.userId : currentUserId;

    const whereClause: any = {
      organizationId,
      ...(targetUserId ? { userId: targetUserId } : {}),
      ...(filters.status ? { status: filters.status as AttendanceStatus } : {})
    };

    if (filters.startDate || filters.endDate) {
      whereClause.date = {};
      if (filters.startDate) {
        whereClause.date.gte = this.normalizeDate(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.date.lte = this.normalizeDate(filters.endDate);
      }
    }

    if (filters.departmentId) {
      whereClause.user = {
        departmentId: filters.departmentId
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            profileImageUrl: true,
            department: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    return records.map((r) => ({
      ...r,
      date: r.date.toISOString().split('T')[0]
    }));
  }

  /**
   * Manual entry or update by Admin/HR
   */
  async logManualAttendance(
    organizationId: string,
    data: ManualAttendanceInput,
    _actionedById: string
  ) {
    const targetDate = this.normalizeDate(data.date);

    let duration = data.workDurationMinutes;
    if (duration === undefined && data.clockIn && data.clockOut) {
      duration = Math.max(
        0,
        Math.round(
          (new Date(data.clockOut).getTime() - new Date(data.clockIn).getTime()) / (1000 * 60)
        )
      );
    }

    return prisma.attendanceRecord.upsert({
      where: {
        organizationId_userId_date: {
          organizationId,
          userId: data.userId,
          date: targetDate
        }
      },
      create: {
        organizationId,
        userId: data.userId,
        date: targetDate,
        status: data.status as AttendanceStatus,
        clockIn: data.clockIn ? new Date(data.clockIn) : null,
        clockOut: data.clockOut ? new Date(data.clockOut) : null,
        workDurationMinutes: duration || 0,
        notes: data.notes || null,
        location: data.location || null
      },
      update: {
        status: data.status as AttendanceStatus,
        clockIn: data.clockIn ? new Date(data.clockIn) : null,
        clockOut: data.clockOut ? new Date(data.clockOut) : null,
        workDurationMinutes: duration !== undefined ? duration : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        location: data.location !== undefined ? data.location : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            department: { select: { id: true, name: true } }
          }
        }
      }
    });
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(id: string, organizationId: string) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      throw new NotFoundError('Attendance record not found');
    }

    return prisma.attendanceRecord.delete({
      where: { id }
    });
  }
}

export const attendanceService = new AttendanceService();
