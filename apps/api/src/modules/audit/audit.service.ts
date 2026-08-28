import { auditRepository, AuditRepository } from './audit.repository';

export class AuditService {
  constructor(private repo: AuditRepository = auditRepository) {}

  async listLogs(page = 1, limit = 15, search?: string) {
    return this.repo.findAll(page, limit, search);
  }
}

export const auditService = new AuditService();
