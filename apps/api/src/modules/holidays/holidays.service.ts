import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../common/errors/app-error';
import { CreateHolidayInput, UpdateHolidayInput } from '@ems/validation';

export class HolidaysService {
  private normalizeDate(dateInput: Date | string): Date {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    const d = new Date(dateInput);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async listHolidays(organizationId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));

    const holidays = await prisma.companyHoliday.findMany({
      where: {
        organizationId,
        OR: [
          {
            date: {
              gte: startOfYear,
              lte: endOfYear
            }
          },
          {
            isRecurring: true
          }
        ]
      },
      orderBy: { date: 'asc' }
    });

    return holidays.map((h) => {
      const hDate = new Date(h.date);
      const dateStr = h.isRecurring
        ? `${currentYear}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`
        : h.date.toISOString().split('T')[0];

      return {
        ...h,
        date: dateStr
      };
    });
  }

  async createHoliday(organizationId: string, data: CreateHolidayInput) {
    const holidayDate = this.normalizeDate(data.date);

    const existing = await prisma.companyHoliday.findUnique({
      where: {
        organizationId_date_name: {
          organizationId,
          date: holidayDate,
          name: data.name
        }
      }
    });

    if (existing) {
      throw new ConflictError(`Holiday '${data.name}' already exists on this date`);
    }

    const created = await prisma.companyHoliday.create({
      data: {
        organizationId,
        name: data.name,
        date: holidayDate,
        description: data.description || null,
        isRecurring: data.isRecurring || false
      }
    });

    return {
      ...created,
      date: created.date.toISOString().split('T')[0]
    };
  }

  async updateHoliday(id: string, organizationId: string, data: UpdateHolidayInput) {
    const existing = await prisma.companyHoliday.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      throw new NotFoundError('Company holiday not found');
    }

    const updated = await prisma.companyHoliday.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        date: data.date ? this.normalizeDate(data.date) : undefined,
        description: data.description !== undefined ? data.description : undefined,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : undefined
      }
    });

    return {
      ...updated,
      date: updated.date.toISOString().split('T')[0]
    };
  }

  async deleteHoliday(id: string, organizationId: string) {
    const existing = await prisma.companyHoliday.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      throw new NotFoundError('Company holiday not found');
    }

    return prisma.companyHoliday.delete({
      where: { id }
    });
  }
}

export const holidaysService = new HolidaysService();
