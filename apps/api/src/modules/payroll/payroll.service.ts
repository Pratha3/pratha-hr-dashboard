import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError, AuthorizationError } from '../../common/errors/app-error';
import { PayrollStatus, PayslipPaymentStatus } from '@prisma/client';
import {
  GeneratePayrollInput,
  UpdatePayrollStatusInput,
  UpdatePayslipInput,
  PayrollQueryInput,
  PayslipQueryInput
} from '@ems/validation';
import { PermissionName, Permissions, PayrollSummaryDto } from '@ems/shared-types';

export class PayrollService {
  /**
   * Helper to compute detailed salary breakdown from monthly total base
   */
  private calculateBreakdown(monthlySalary: number, bonus = 0, otherDeductions = 0) {
    const base = Math.max(0, monthlySalary);
    // Standard corporate compensation formula:
    // 50% Basic, 30% HRA, 20% Special Allowances
    const basicSalary = Math.round(base * 0.5);
    const hra = Math.round(base * 0.3);
    const allowances = Math.round(base * 0.2);
    const grossSalary = basicSalary + hra + allowances + bonus;

    // Deductions: 10% Standard Tax, 5% Retirement/PF
    const taxDeduction = Math.round(grossSalary * 0.1);
    const providentFund = Math.round(basicSalary * 0.05);
    const totalDeductions = taxDeduction + providentFund + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      basicSalary,
      hra,
      allowances,
      bonus,
      taxDeduction,
      providentFund,
      otherDeductions,
      grossSalary,
      netSalary
    };
  }

  /**
   * Get high-level summary metrics for Payroll KPI Cards
   */
  async getPayrollSummary(organizationId: string, year?: number, month?: number): Promise<PayrollSummaryDto> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const latestRun = await prisma.payrollRun.findFirst({
      where: {
        organizationId,
        year: targetYear,
        month: targetMonth
      },
      include: {
        payslips: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                position: true,
                department: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    const pendingPayslipsCount = await prisma.payslip.count({
      where: {
        organizationId,
        status: PayslipPaymentStatus.PENDING
      }
    });

    const totalMonthlyPayroll = latestRun?.totalGross || 0;
    const totalNetDisbursed = latestRun?.totalNet || 0;
    const totalDeductions = latestRun?.totalDeductions || 0;
    const totalEmployeesProcessed = latestRun?.employeeCount || 0;

    return {
      currentMonth: targetMonth,
      currentYear: targetYear,
      totalMonthlyPayroll,
      totalNetDisbursed,
      totalDeductions,
      totalEmployeesProcessed,
      pendingPayslipsCount,
      latestRun: (latestRun as any) || null
    };
  }

  /**
   * Generate or re-calculate full organization monthly payroll run
   */
  async generatePayrollRun(
    organizationId: string,
    input: GeneratePayrollInput,
    _actorId: string
  ) {
    const { month, year, notes } = input;

    // 1. Check if a finalized run already exists
    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        organizationId_year_month: {
          organizationId,
          year,
          month
        }
      }
    });

    if (existingRun && existingRun.status === PayrollStatus.PAID) {
      throw new ConflictError(
        `Payroll run for ${month}/${year} is already marked as PAID and cannot be regenerated.`
      );
    }

    // 2. Fetch all active users in organization with salary
    const activeUsers = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId,
            isActive: true
          }
        }
      },
      include: {
        department: true
      }
    });

    if (activeUsers.length === 0) {
      throw new BadRequestError('No active employees found in this organization to generate payroll for.');
    }

    // 3. Compute totals and build payslip models
    let runTotalGross = 0;
    let runTotalNet = 0;
    let runTotalDeductions = 0;

    const payslipDataList = activeUsers.map((emp) => {
      // Default monthly salary if null is $5,000
      const monthlySalary = emp.salary ? Number(emp.salary) : 5000;
      const breakdown = this.calculateBreakdown(monthlySalary);

      runTotalGross += breakdown.grossSalary;
      runTotalNet += breakdown.netSalary;
      runTotalDeductions += (breakdown.taxDeduction + breakdown.providentFund + breakdown.otherDeductions);

      return {
        userId: emp.id,
        ...breakdown
      };
    });

    // 4. Atomic transaction: create/update PayrollRun and replace/upsert Payslips
    return prisma.$transaction(async (tx) => {
      let payrollRun = existingRun;

      if (payrollRun) {
        payrollRun = await tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: {
            status: PayrollStatus.PROCESSING,
            totalGross: runTotalGross,
            totalNet: runTotalNet,
            totalDeductions: runTotalDeductions,
            employeeCount: activeUsers.length,
            notes: notes || payrollRun.notes,
            processedAt: new Date()
          }
        });
      } else {
        payrollRun = await tx.payrollRun.create({
          data: {
            organizationId,
            month,
            year,
            status: PayrollStatus.PROCESSING,
            totalGross: runTotalGross,
            totalNet: runTotalNet,
            totalDeductions: runTotalDeductions,
            employeeCount: activeUsers.length,
            notes: notes || null,
            processedAt: new Date()
          }
        });
      }

      // Upsert individual payslips
      for (const item of payslipDataList) {
        await tx.payslip.upsert({
          where: {
            organizationId_userId_year_month: {
              organizationId,
              userId: item.userId,
              year,
              month
            }
          },
          create: {
            organizationId,
            payrollRunId: payrollRun.id,
            userId: item.userId,
            month,
            year,
            basicSalary: item.basicSalary,
            hra: item.hra,
            allowances: item.allowances,
            bonus: item.bonus,
            taxDeduction: item.taxDeduction,
            providentFund: item.providentFund,
            otherDeductions: item.otherDeductions,
            grossSalary: item.grossSalary,
            netSalary: item.netSalary,
            status: PayslipPaymentStatus.PENDING,
            paymentMethod: 'Direct Deposit'
          },
          update: {
            payrollRunId: payrollRun.id,
            basicSalary: item.basicSalary,
            hra: item.hra,
            allowances: item.allowances,
            bonus: item.bonus,
            taxDeduction: item.taxDeduction,
            providentFund: item.providentFund,
            otherDeductions: item.otherDeductions,
            grossSalary: item.grossSalary,
            netSalary: item.netSalary
          }
        });
      }

      return tx.payrollRun.findUnique({
        where: { id: payrollRun.id },
        include: {
          payslips: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  employeeCode: true,
                  position: true,
                  department: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      });
    });
  }

  /**
   * List payroll runs
   */
  async listPayrollRuns(organizationId: string, query: PayrollQueryInput) {
    const where: any = { organizationId };
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;
    if (query.status) where.status = query.status as PayrollStatus;

    return prisma.payrollRun.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: {
          select: { payslips: true }
        }
      }
    });
  }

  /**
   * Get single payroll run with full payslips
   */
  async getPayrollRunById(id: string, organizationId: string) {
    const run = await prisma.payrollRun.findFirst({
      where: { id, organizationId },
      include: {
        payslips: {
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
                department: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { grossSalary: 'desc' }
        }
      }
    });

    if (!run) {
      throw new NotFoundError('Payroll run not found.');
    }

    return run;
  }

  /**
   * Update status of a payroll run (e.g. APPROVED, PAID)
   */
  async updatePayrollRunStatus(
    id: string,
    organizationId: string,
    input: UpdatePayrollStatusInput
  ) {
    const run = await prisma.payrollRun.findFirst({
      where: { id, organizationId }
    });

    if (!run) {
      throw new NotFoundError('Payroll run not found.');
    }

    const newStatus = input.status as PayrollStatus;
    const isPaid = newStatus === PayrollStatus.PAID;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const updatedRun = await tx.payrollRun.update({
        where: { id },
        data: {
          status: newStatus,
          paidAt: isPaid ? now : run.paidAt
        }
      });

      if (isPaid) {
        // Mark all associated payslips as PAID
        await tx.payslip.updateMany({
          where: { payrollRunId: id },
          data: {
            status: PayslipPaymentStatus.PAID,
            paidAt: now
          }
        });
      }

      return updatedRun;
    });
  }

  /**
   * List payslips with permissions & filtering
   */
  async listPayslips(
    organizationId: string,
    query: PayslipQueryInput,
    currentUserId: string,
    userPermissions: PermissionName[]
  ) {
    const canViewAll =
      userPermissions.includes(Permissions.PAYROLL_READ) ||
      userPermissions.includes(Permissions.PAYSLIP_READ_ALL);

    const targetUserId = canViewAll ? query.userId : currentUserId;

    const where: any = {
      organizationId,
      ...(targetUserId ? { userId: targetUserId } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.status ? { status: query.status as PayslipPaymentStatus } : {})
    };

    if (query.departmentId) {
      where.user = { departmentId: query.departmentId };
    }

    return prisma.payslip.findMany({
      where,
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
            department: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }]
    });
  }

  /**
   * Get single payslip by ID with access control
   */
  async getPayslipById(
    id: string,
    organizationId: string,
    currentUserId: string,
    userPermissions: PermissionName[]
  ) {
    const payslip = await prisma.payslip.findFirst({
      where: { id, organizationId },
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
            department: { select: { id: true, name: true } }
          }
        },
        payrollRun: {
          select: {
            id: true,
            status: true,
            processedAt: true,
            paidAt: true
          }
        }
      }
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found.');
    }

    const canViewAll =
      userPermissions.includes(Permissions.PAYROLL_READ) ||
      userPermissions.includes(Permissions.PAYSLIP_READ_ALL);

    if (!canViewAll && payslip.userId !== currentUserId) {
      throw new AuthorizationError('You are not authorized to view this payslip.');
    }

    return payslip;
  }

  /**
   * Update individual payslip adjustments (bonus, custom deduction, status)
   */
  async updatePayslip(id: string, organizationId: string, data: UpdatePayslipInput) {
    const existing = await prisma.payslip.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      throw new NotFoundError('Payslip not found.');
    }

    const basicSalary = data.basicSalary !== undefined ? data.basicSalary : existing.basicSalary;
    const hra = data.hra !== undefined ? data.hra : existing.hra;
    const allowances = data.allowances !== undefined ? data.allowances : existing.allowances;
    const bonus = data.bonus !== undefined ? data.bonus : existing.bonus;
    const taxDeduction = data.taxDeduction !== undefined ? data.taxDeduction : existing.taxDeduction;
    const providentFund = data.providentFund !== undefined ? data.providentFund : existing.providentFund;
    const otherDeductions = data.otherDeductions !== undefined ? data.otherDeductions : existing.otherDeductions;

    const grossSalary = basicSalary + hra + allowances + bonus;
    const totalDeductions = taxDeduction + providentFund + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const isPaid = data.status === 'PAID';

    return prisma.payslip.update({
      where: { id },
      data: {
        basicSalary,
        hra,
        allowances,
        bonus,
        taxDeduction,
        providentFund,
        otherDeductions,
        grossSalary,
        netSalary,
        status: data.status ? (data.status as PayslipPaymentStatus) : existing.status,
        paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : existing.paymentMethod,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        paidAt: isPaid ? new Date() : existing.paidAt
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
            department: { select: { id: true, name: true } }
          }
        }
      }
    });
  }

  /**
   * Delete a draft/unfinalized payroll run
   */
  async deletePayrollRun(id: string, organizationId: string) {
    const run = await prisma.payrollRun.findFirst({
      where: { id, organizationId }
    });

    if (!run) {
      throw new NotFoundError('Payroll run not found.');
    }

    if (run.status === PayrollStatus.PAID) {
      throw new BadRequestError('Cannot delete a finalized PAID payroll run.');
    }

    return prisma.payrollRun.delete({
      where: { id }
    });
  }
}

export const payrollService = new PayrollService();
