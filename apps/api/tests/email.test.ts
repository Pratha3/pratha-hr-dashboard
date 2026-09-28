import { describe, it, expect, vi } from 'vitest';
import { emailService } from '../src/common/services/email.service';

describe('Email Notification Service End-to-End Suite', () => {
  const TEST_RECIPIENT = 'prathabagtharia@gmail.com';

  it('should generate and dispatch Workspace Invitation email with professional styling', async () => {
    const success = await emailService.sendInvitationEmail(TEST_RECIPIENT, {
      organizationName: 'Pratha Enterprise Tech',
      invitedByName: 'Pratha Bagtharia',
      roleName: 'System Architect',
      inviteToken: 'test-token-uuid-12345'
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch Leave Request Created Alert to HR/Manager', async () => {
    const success = await emailService.sendLeaveRequestAlert(TEST_RECIPIENT, {
      employeeName: 'Pratha Bagtharia',
      employeeEmail: TEST_RECIPIENT,
      leaveType: 'Annual Vacation / PTO',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      reason: 'Scheduled personal leave & summit attendance'
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch Leave Request Status Update Alert (Approved/Rejected)', async () => {
    const success = await emailService.sendLeaveStatusAlert(TEST_RECIPIENT, {
      employeeName: 'Pratha Bagtharia',
      leaveType: 'Annual Vacation / PTO',
      status: 'APPROVED',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      actionByName: 'HR Operations Manager',
      actionNote: 'Approved. All project handovers verified.'
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch Company Announcement Broadcast email', async () => {
    const success = await emailService.sendAnnouncementAlert(TEST_RECIPIENT, {
      recipientName: 'Pratha Bagtharia',
      title: '🚀 Q4 Strategic Roadmap Announcement',
      content: 'We are expanding the high-availability cloud architecture to all regions.',
      authorName: 'Executive Team'
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch Project Assignment Notification email', async () => {
    const success = await emailService.sendProjectAssignedAlert(TEST_RECIPIENT, {
      employeeName: 'Pratha Bagtharia',
      projectName: 'FinTech Cloud Gateway',
      clientName: 'Global Payments Inc',
      role: 'Principal Engineer',
      allocation: 100
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch IT Hardware / Asset Custody Alert email', async () => {
    const success = await emailService.sendAssetAssignedAlert(TEST_RECIPIENT, {
      employeeName: 'Pratha Bagtharia',
      assetName: 'Apple MacBook Pro 16" (M3 Max)',
      serialNumber: 'C02G14H8MD6T',
      assetType: 'LAPTOP',
      notes: 'Configured with zero-trust developer certificates.'
    });
    expect(success).toBe(true);
  });

  it('should generate and dispatch Password Reset Security email', async () => {
    const success = await emailService.sendPasswordResetEmail(TEST_RECIPIENT, {
      userName: 'Pratha Bagtharia',
      resetToken: 'test-crypto-reset-token-999'
    });
    expect(success).toBe(true);
  });
});
