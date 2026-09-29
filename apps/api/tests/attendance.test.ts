import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '../src/modules/attendance/attendance.service';
import { HolidaysService } from '../src/modules/holidays/holidays.service';
import { prisma } from '../src/config/database';
import { AttendanceStatus } from '@prisma/client';
import { Permissions } from '@ems/shared-types';

vi.mock('../src/config/database', () => ({
  prisma: {
    attendanceRecord: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    },
    companyHoliday: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('AttendanceService & HolidaysService Unit Tests', () => {
  let attendanceService: AttendanceService;
  let holidaysService: HolidaysService;

  beforeEach(() => {
    vi.clearAllMocks();
    attendanceService = new AttendanceService();
    holidaysService = new HolidaysService();
  });

  describe('AttendanceService', () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const orgId = '22222222-2222-2222-2222-222222222222';

    it('should return not clocked in when no record exists today', async () => {
      vi.mocked(prisma.attendanceRecord.findFirst).mockResolvedValue(null);

      const status = await attendanceService.getTodayStatus(userId, orgId);
      expect(status.isClockedIn).toBe(false);
      expect(status.isClockedOut).toBe(false);
      expect(status.todayRecord).toBeNull();
      expect(status.workDurationMinutes).toBe(0);
    });

    it('should allow clocking in when not already clocked in', async () => {
      vi.mocked(prisma.attendanceRecord.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.attendanceRecord.create).mockResolvedValue({
        id: 'att-1',
        organizationId: orgId,
        userId,
        date: new Date('2026-09-28T00:00:00.000Z'),
        status: AttendanceStatus.IN_OFFICE,
        clockIn: new Date(),
        clockOut: null,
        workDurationMinutes: 0,
        notes: null,
        ipAddress: '127.0.0.1',
        location: 'HQ Office',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const record = await attendanceService.clockIn(
        userId,
        orgId,
        { status: 'IN_OFFICE', location: 'HQ Office' },
        '127.0.0.1'
      );

      expect(record.id).toBe('att-1');
      expect(prisma.attendanceRecord.create).toHaveBeenCalledOnce();
    });

    it('should reject clock in if already clocked in for the day', async () => {
      vi.mocked(prisma.attendanceRecord.findUnique).mockResolvedValue({
        id: 'att-1',
        clockIn: new Date()
      } as any);

      await expect(
        attendanceService.clockIn(userId, orgId, { status: 'IN_OFFICE' })
      ).rejects.toThrow('You have already clocked in for today');
    });

    it('should allow clocking out after clocking in', async () => {
      const clockInTime = new Date(Date.now() - 3600000); // 1 hour ago
      vi.mocked(prisma.attendanceRecord.findUnique).mockResolvedValue({
        id: 'att-1',
        clockIn: clockInTime,
        clockOut: null,
        notes: 'Morning shift'
      } as any);

      vi.mocked(prisma.attendanceRecord.update).mockResolvedValue({
        id: 'att-1',
        workDurationMinutes: 60
      } as any);

      const record = await attendanceService.clockOut(userId, orgId, { notes: 'Finished work' });
      expect(prisma.attendanceRecord.update).toHaveBeenCalled();
      expect(record.id).toBe('att-1');
    });

    it('should list filtered attendance records', async () => {
      vi.mocked(prisma.attendanceRecord.findMany).mockResolvedValue([
        {
          id: 'att-1',
          date: new Date('2026-09-28T00:00:00.000Z'),
          status: AttendanceStatus.WFH,
          user: { id: userId, firstName: 'Jane', lastName: 'Doe' }
        } as any
      ]);

      const list = await attendanceService.listAttendance(
        orgId,
        { startDate: '2026-09-01', endDate: '2026-09-30' },
        userId,
        [Permissions.ATTENDANCE_READ]
      );

      expect(list).toHaveLength(1);
      expect(list[0].date).toBe('2026-09-28');
    });

    it('should handle concurrent clock in race condition with ConflictError', async () => {
      vi.mocked(prisma.attendanceRecord.findUnique).mockResolvedValue(null);
      const p2002Error: any = new Error('Unique constraint failed');
      p2002Error.code = 'P2002';
      vi.mocked(prisma.attendanceRecord.create).mockRejectedValue(p2002Error);

      await expect(
        attendanceService.clockIn(userId, orgId, { status: 'IN_OFFICE' })
      ).rejects.toThrow('You have already clocked in for today');
    });
  });

  describe('HolidaysService', () => {
    const orgId = '22222222-2222-2222-2222-222222222222';

    it('should create a new company holiday', async () => {
      vi.mocked(prisma.companyHoliday.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.companyHoliday.create).mockResolvedValue({
        id: 'hol-1',
        organizationId: orgId,
        name: 'New Year Day',
        date: new Date('2026-01-01T00:00:00.000Z'),
        description: 'Public holiday',
        isRecurring: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const holiday = await holidaysService.createHoliday(orgId, {
        name: 'New Year Day',
        date: '2026-01-01',
        description: 'Public holiday',
        isRecurring: true
      });

      expect(holiday.name).toBe('New Year Day');
      expect(holiday.date).toBe('2026-01-01');
    });

    it('should project recurring holidays into queried year without mutating database', async () => {
      vi.mocked(prisma.companyHoliday.findMany).mockResolvedValue([
        {
          id: 'hol-rec',
          organizationId: orgId,
          name: 'Christmas',
          date: new Date('2024-12-25T00:00:00.000Z'),
          description: 'Yearly Christmas',
          isRecurring: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const holidays = await holidaysService.listHolidays(orgId, 2027);
      expect(holidays).toHaveLength(1);
      expect(holidays[0].date).toBe('2027-12-25');
    });
  });
});

