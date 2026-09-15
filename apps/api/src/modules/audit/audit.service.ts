import { auditRepository, AuditRepository } from './audit.repository';
import { AuditLogQueryInput } from '@ems/validation';

export class AuditService {
  constructor(private repo: AuditRepository = auditRepository) {}

  async listLogs(params: AuditLogQueryInput, organizationId?: string) {
    return this.repo.findAll({ ...params, organizationId });
  }
}

export const auditService = new AuditService();

