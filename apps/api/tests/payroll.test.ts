import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollService } from '../src/modules/payroll/payroll.service';
import { prisma } from '../src/config/database';
import { PayrollStatus, PayslipPaymentStatus } from '@prisma/client';
import { Permissions } from '@ems/shared-types';

vi.mock('../src/config/database', () => ({
  prisma: {
    payrollRun: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    payslip: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn()
    },
    user: {
      findMany: vi.fn()
    },
    $transaction: vi.fn((callback) => callback(prisma))
  }
}));

describe('PayrollService Unit Tests', () => {
  let payrollService: PayrollService;
  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId1 = '22222222-2222-2222-2222-222222222222';
  const userId2 = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    payrollService = new PayrollService();
  });

  describe('generatePayrollRun', () => {
    it('should generate monthly payroll run and calculate standard salary breakdown', async () => {
      vi.mocked(prisma.payrollRun.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'run-1',
          month: 10,
          year: 2026,
          totalGross: 10000,
          employeeCount: 2,
          payslips: [{ id: 'ps-1', userId: userId1 }]
        } as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: userId1,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          salary: 6000,
          isActive: true
        } as any,
        {
          id: userId2,
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          salary: 4000,
          isActive: true
        } as any
      ]);

      vi.mocked(prisma.payrollRun.create).mockResolvedValue({
        id: 'run-1',
        organizationId: orgId,
        month: 10,
        year: 2026,
        status: PayrollStatus.PROCESSING,
        totalGross: 10000,
        totalNet: 8850,
        totalDeductions: 1150,
        employeeCount: 2
      } as any);

      vi.mocked(prisma.payslip.upsert).mockResolvedValue({ id: 'ps-1' } as any);

      const result = await payrollService.generatePayrollRun(
        orgId,
        { month: 10, year: 2026, notes: 'October payroll' },
        'admin-id'
      );

      expect(prisma.payrollRun.create).toHaveBeenCalled();
      expect(prisma.payslip.upsert).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw ConflictError if payroll run is already PAID', async () => {
      vi.mocked(prisma.payrollRun.findUnique).mockResolvedValue({
        id: 'run-paid',
        status: PayrollStatus.PAID,
        month: 10,
        year: 2026
      } as any);

      await expect(
        payrollService.generatePayrollRun(orgId, { month: 10, year: 2026 }, 'admin-id')
      ).rejects.toThrow('already marked as PAID');
    });
  });

  describe('updatePayrollRunStatus', () => {
    it('should update status and mark all payslips as PAID when status is PAID', async () => {
      vi.mocked(prisma.payrollRun.findFirst).mockResolvedValue({
        id: 'run-1',
        organizationId: orgId,
        status: PayrollStatus.APPROVED
      } as any);

      vi.mocked(prisma.payrollRun.update).mockResolvedValue({
        id: 'run-1',
        status: PayrollStatus.PAID
      } as any);

      await payrollService.updatePayrollRunStatus('run-1', orgId, { status: 'PAID' });

      expect(prisma.payrollRun.update).toHaveBeenCalled();
      expect(prisma.payslip.updateMany).toHaveBeenCalledWith({
        where: { payrollRunId: 'run-1' },
        data: expect.objectContaining({
          status: PayslipPaymentStatus.PAID
        })
      });
    });
  });

  describe('getPayslipById', () => {
    it('should permit employee to access their own payslip', async () => {
      vi.mocked(prisma.payslip.findFirst).mockResolvedValue({
        id: 'ps-1',
        organizationId: orgId,
        userId: userId1,
        grossSalary: 6000,
        netSalary: 5310
      } as any);

      const payslip = await payrollService.getPayslipById(
        'ps-1',
        orgId,
        userId1,
        [Permissions.PAYSLIP_READ_SELF]
      );

      expect(payslip.id).toBe('ps-1');
    });

    it('should reject employee trying to view another employee payslip without admin permission', async () => {
      vi.mocked(prisma.payslip.findFirst).mockResolvedValue({
        id: 'ps-1',
        organizationId: orgId,
        userId: userId1
      } as any);

      await expect(
        payrollService.getPayslipById(
          'ps-1',
          orgId,
          userId2, // different user
          [Permissions.PAYSLIP_READ_SELF]
        )
      ).rejects.toThrow('You are not authorized to view this payslip');
    });
  });

  describe('updatePayslip', () => {
    it('should recalculate gross and net when bonus or deduction is updated', async () => {
      vi.mocked(prisma.payslip.findFirst).mockResolvedValue({
        id: 'ps-1',
        organizationId: orgId,
        basicSalary: 3000,
        hra: 1800,
        allowances: 1200,
        bonus: 0,
        taxDeduction: 600,
        providentFund: 150,
        otherDeductions: 0,
        grossSalary: 6000,
        netSalary: 5250,
        status: PayslipPaymentStatus.PENDING
      } as any);

      vi.mocked(prisma.payslip.update).mockResolvedValue({
        id: 'ps-1',
        bonus: 1000,
        grossSalary: 7000,
        netSalary: 6250
      } as any);

      const updated = await payrollService.updatePayslip('ps-1', orgId, { bonus: 1000 });
      expect(prisma.payslip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bonus: 1000,
            grossSalary: 7000
          })
        })
      );
      expect(updated.id).toBe('ps-1');
    });
  });
});
