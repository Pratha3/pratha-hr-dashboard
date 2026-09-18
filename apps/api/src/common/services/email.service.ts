import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../utils/logger';
import { escapeHtml, formatMultilineText } from '../utils/sanitize';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        });
        this.isConfigured = true;
        logger.info(`📧 SMTP Email Transporter configured for ${env.SMTP_HOST}:${env.SMTP_PORT}`);
      } catch (err) {
        logger.error('Failed to initialize SMTP transporter, falling back to console logger', { err });
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      logger.info('📧 SMTP not configured - email service operating in DEV/CONSOLE preview mode');
    }
  }

  /**
   * Directly sends an email via SMTP (or prints to console in dev mode).
   */
  async sendMail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.isConfigured && this.transporter) {
        await this.transporter.sendMail({
          from: env.SMTP_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text || options.subject,
          html: options.html
        });
        logger.info(`📧 Email sent to [${options.to}] - Subject: "${options.subject}"`);
        return true;
      } else {
        // Pretty developer console output
        console.log('\n===============================================================');
        console.log(`📧 [DEV EMAIL PREVIEW] To: ${options.to}`);
        console.log(`📌 Subject: ${options.subject}`);
        if (options.text) {
          console.log(`📝 Text Preview: ${options.text.substring(0, 160)}...`);
        }
        console.log('===============================================================\n');
        return true;
      }
    } catch (error) {
      logger.error(`❌ Failed to send email to ${options.to}`, { error, subject: options.subject });
      return false;
    }
  }

  /**
   * Resilient sendMail wrapper with exponential backoff retry mechanism.
   */
  async sendMailWithRetry(options: EmailOptions, retryOptions: RetryOptions = {}): Promise<boolean> {
    const maxAttempts = retryOptions.maxAttempts ?? 3;
    const initialDelayMs = retryOptions.initialDelayMs ?? 1000;

    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      const success = await this.sendMail(options);
      if (success) {
        return true;
      }

      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`Retrying email to ${options.to} (Attempt ${attempt + 1}/${maxAttempts}) in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.error(`❌ Email permanently failed after ${maxAttempts} attempts for ${options.to}`, {
      subject: options.subject
    });
    return false;
  }

  // Base HTML Template wrapper
  private wrapTemplate(title: string, bodyContent: string, actionButton?: { text: string; url: string }): string {
    const escapedTitle = escapeHtml(title);
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapedTitle}</title>
        <style>
          body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
          .wrapper { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2); }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px; text-align: left; }
          .brand { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; margin: 0; display: flex; align-items: center; }
          .brand span { color: #38bdf8; margin-left: 4px; }
          .sub { color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
          .content { padding: 36px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.3px; }
          .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #edf2f7; font-size: 13px; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-weight: 500; }
          .info-value { color: #0f172a; font-weight: 600; text-align: right; }
          .btn-container { text-align: center; margin: 32px 0 16px 0; }
          .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px; }
          .footer { background-color: #f8fafc; padding: 24px 36px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="brand">Nexus<span>HRMS</span></div>
            <div class="sub">Enterprise Human Capital OS</div>
          </div>
          <div class="content">
            <h1 class="title">${escapedTitle}</h1>
            ${bodyContent}
            ${
              actionButton
                ? `<div class="btn-container"><a href="${encodeURI(actionButton.url)}" class="btn">${escapeHtml(actionButton.text)}</a></div>`
                : ''
            }
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Nexus HRMS Enterprise. Automated system update. Please do not reply directly.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 1. Leave Request Created (Target: HR / Admin)
  async sendLeaveRequestAlert(
    to: string,
    data: {
      employeeName: string;
      employeeEmail: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
      dashboardUrl?: string;
    }
  ) {
    const url = data.dashboardUrl || `${env.APP_URL}/leaves`;
    const employeeNameEsc = escapeHtml(data.employeeName);
    const employeeEmailEsc = escapeHtml(data.employeeEmail);
    const leaveTypeEsc = escapeHtml(data.leaveType);
    const startDateEsc = escapeHtml(data.startDate);
    const endDateEsc = escapeHtml(data.endDate);
    const reasonEsc = formatMultilineText(data.reason);

    const body = `
      <p class="text">A new leave request has been submitted by <strong>${employeeNameEsc}</strong> and requires management review.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Employee</span><span class="info-value">${employeeNameEsc} (${employeeEmailEsc})</span></div>
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">${leaveTypeEsc}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${startDateEsc} to ${endDateEsc}</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reasonEsc}</span></div>
      </div>
      <p class="text">Please log in to the HR portal to approve or reject this leave application.</p>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `[Action Required] New Leave Request - ${data.employeeName} (${data.leaveType})`,
      text: `New leave request submitted by ${data.employeeName} for ${data.leaveType} from ${data.startDate} to ${data.endDate}. Reason: ${data.reason}`,
      html: this.wrapTemplate('New Leave Request Submitted', body, { text: 'Review Leave Application', url })
    });
  }

  // 2. Leave Request Actioned (Target: Employee)
  async sendLeaveStatusAlert(
    to: string,
    data: {
      employeeName: string;
      leaveType: string;
      status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
      startDate: string;
      endDate: string;
      actionByName?: string;
      actionNote?: string;
      dashboardUrl?: string;
    }
  ) {
    const url = data.dashboardUrl || `${env.APP_URL}/leaves`;
    const employeeNameEsc = escapeHtml(data.employeeName);
    const leaveTypeEsc = escapeHtml(data.leaveType);
    const statusEsc = escapeHtml(data.status);
    const startDateEsc = escapeHtml(data.startDate);
    const endDateEsc = escapeHtml(data.endDate);
    const actionByNameEsc = data.actionByName ? escapeHtml(data.actionByName) : undefined;
    const actionNoteEsc = data.actionNote ? formatMultilineText(data.actionNote) : undefined;

    const statusColor = data.status === 'APPROVED' ? '#16a34a' : data.status === 'REJECTED' ? '#dc2626' : '#64748b';
    const body = `
      <p class="text">Hello <strong>${employeeNameEsc}</strong>,</p>
      <p class="text">Your leave application for <strong>${leaveTypeEsc}</strong> has been updated to:
        <span style="display:inline-block; padding:4px 10px; border-radius:6px; font-weight:700; color:#fff; background-color:${statusColor}; font-size:12px;">${statusEsc}</span>
      </p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">${leaveTypeEsc}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">${startDateEsc} to ${endDateEsc}</span></div>
        ${actionByNameEsc ? `<div class="info-row"><span class="info-label">Reviewed By</span><span class="info-value">${actionByNameEsc}</span></div>` : ''}
        ${actionNoteEsc ? `<div class="info-row"><span class="info-label">Review Note</span><span class="info-value">${actionNoteEsc}</span></div>` : ''}
      </div>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `Leave Request ${data.status}: ${data.leaveType} (${data.startDate} to ${data.endDate})`,
      text: `Your ${data.leaveType} request from ${data.startDate} to ${data.endDate} has been ${data.status}.`,
      html: this.wrapTemplate(`Leave Request ${data.status}`, body, { text: 'View In Portal', url })
    });
  }

  // 3. Announcement Published (Target: Organization Members)
  async sendAnnouncementAlert(
    to: string,
    data: {
      recipientName: string;
      title: string;
      content: string;
      authorName: string;
      dashboardUrl?: string;
    }
  ) {
    const url = data.dashboardUrl || `${env.APP_URL}/announcements`;
    const recipientNameEsc = escapeHtml(data.recipientName);
    const titleEsc = escapeHtml(data.title);
    const contentEsc = formatMultilineText(data.content);
    const authorNameEsc = escapeHtml(data.authorName);

    const body = `
      <p class="text">Hello <strong>${recipientNameEsc}</strong>,</p>
      <p class="text">A new company-wide announcement has been posted by <strong>${authorNameEsc}</strong>:</p>
      <div class="info-box">
        <h3 style="margin-top:0; color:#0f172a; font-size:16px;">${titleEsc}</h3>
        <p style="color:#475569; font-size:14px; line-height:1.6; margin-bottom:0;">${contentEsc}</p>
      </div>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `📢 Company Announcement: ${data.title}`,
      text: `Announcement: ${data.title}\n\n${data.content}\n\nPosted by: ${data.authorName}`,
      html: this.wrapTemplate('Company Announcement', body, { text: 'View Announcement Noticeboard', url })
    });
  }

  // 4. Project Member Assigned (Target: Employee)
  async sendProjectAssignedAlert(
    to: string,
    data: {
      employeeName: string;
      projectName: string;
      clientName?: string | null;
      role: string;
      allocation: number;
      dashboardUrl?: string;
    }
  ) {
    const url = data.dashboardUrl || `${env.APP_URL}/projects`;
    const employeeNameEsc = escapeHtml(data.employeeName);
    const projectNameEsc = escapeHtml(data.projectName);
    const clientNameEsc = data.clientName ? escapeHtml(data.clientName) : null;
    const roleEsc = escapeHtml(data.role);

    const body = `
      <p class="text">Hello <strong>${employeeNameEsc}</strong>,</p>
      <p class="text">You have been allocated to a new project team:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Project Name</span><span class="info-value">${projectNameEsc}</span></div>
        ${clientNameEsc ? `<div class="info-row"><span class="info-label">Client</span><span class="info-value">${clientNameEsc}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Assigned Role</span><span class="info-value">${roleEsc}</span></div>
        <div class="info-row"><span class="info-label">Workload Allocation</span><span class="info-value">${data.allocation}%</span></div>
      </div>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `🎯 Project Assignment: ${data.projectName}`,
      text: `You have been assigned to project ${data.projectName} as ${data.role} with ${data.allocation}% allocation.`,
      html: this.wrapTemplate('Project Assignment', body, { text: 'Open Projects Hub', url })
    });
  }

  // 5. IT Asset Assigned (Target: Employee)
  async sendAssetAssignedAlert(
    to: string,
    data: {
      employeeName: string;
      assetName: string;
      serialNumber: string;
      assetType: string;
      notes?: string | null;
      dashboardUrl?: string;
    }
  ) {
    const url = data.dashboardUrl || `${env.APP_URL}/assets`;
    const employeeNameEsc = escapeHtml(data.employeeName);
    const assetNameEsc = escapeHtml(data.assetName);
    const serialNumberEsc = escapeHtml(data.serialNumber);
    const assetTypeEsc = escapeHtml(data.assetType);
    const notesEsc = data.notes ? formatMultilineText(data.notes) : null;

    const body = `
      <p class="text">Hello <strong>${employeeNameEsc}</strong>,</p>
      <p class="text">A corporate IT asset has been assigned to you:</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Asset Name</span><span class="info-value">${assetNameEsc}</span></div>
        <div class="info-row"><span class="info-label">Asset Type</span><span class="info-value">${assetTypeEsc}</span></div>
        <div class="info-row"><span class="info-label">Serial Number</span><span class="info-value font-mono">${serialNumberEsc}</span></div>
        ${notesEsc ? `<div class="info-row"><span class="info-label">Notes / Instructions</span><span class="info-value">${notesEsc}</span></div>` : ''}
      </div>
      <p class="text">Please verify the serial number upon receipt and notify IT Ops of any discrepancies.</p>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `💻 IT Hardware Assigned: ${data.assetName}`,
      text: `Corporate IT asset ${data.assetName} (${data.serialNumber}) has been assigned to you.`,
      html: this.wrapTemplate('Hardware Asset Assigned', body, { text: 'View Hardware Assets', url })
    });
  }

  // 6. Organization Invitation (Target: Invitee)
  async sendInvitationEmail(
    to: string,
    data: {
      organizationName: string;
      invitedByName?: string;
      roleName: string;
      inviteToken: string;
      inviteLink?: string;
    }
  ) {
    const link = data.inviteLink || `${env.APP_URL}/invite/${encodeURIComponent(data.inviteToken)}`;
    const orgNameEsc = escapeHtml(data.organizationName);
    const invitedByNameEsc = data.invitedByName ? escapeHtml(data.invitedByName) : undefined;
    const roleNameEsc = escapeHtml(data.roleName);

    const body = `
      <p class="text">You have been invited${invitedByNameEsc ? ` by <strong>${invitedByNameEsc}</strong>` : ''} to join <strong>${orgNameEsc}</strong> on the Nexus HRMS workspace as a <strong>${roleNameEsc}</strong>.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Organization</span><span class="info-value">${orgNameEsc}</span></div>
        <div class="info-row"><span class="info-label">Role</span><span class="info-value">${roleNameEsc}</span></div>
        <div class="info-row"><span class="info-label">Validity</span><span class="info-value">7 Days</span></div>
      </div>
      <p class="text">Click the button below to complete your profile setup and access the organization dashboard.</p>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `Invitation to join ${data.organizationName} on Nexus HRMS`,
      text: `You have been invited to join ${data.organizationName} as ${data.roleName}. Accept invitation here: ${link}`,
      html: this.wrapTemplate(`Join ${data.organizationName}`, body, { text: 'Accept Invitation & Join', url: link })
    });
  }

  // 7. Password Reset Email (Target: User)
  async sendPasswordResetEmail(
    to: string,
    data: {
      userName?: string;
      resetToken: string;
      resetLink?: string;
    }
  ) {
    const link = data.resetLink || `${env.APP_URL}/reset-password?token=${encodeURIComponent(data.resetToken)}`;
    const userNameEsc = data.userName ? escapeHtml(data.userName) : undefined;

    const body = `
      <p class="text">Hello${userNameEsc ? ` <strong>${userNameEsc}</strong>` : ''},</p>
      <p class="text">We received a request to reset the password for your Nexus HRMS account.</p>
      <p class="text">Click the button below to choose a new password. This link is valid for 1 hour.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Expires in</span><span class="info-value">1 Hour</span></div>
        <div class="info-row"><span class="info-label">Security Notice</span><span class="info-value">If you did not request this, you can ignore this email safely.</span></div>
      </div>
    `;
    return this.sendMailWithRetry({
      to,
      subject: `🔑 Reset Your Password - Nexus HRMS`,
      text: `Reset your Nexus HRMS password by clicking this link: ${link} (valid for 1 hour).`,
      html: this.wrapTemplate('Password Reset Request', body, { text: 'Reset Password', url: link })
    });
  }
}

export const emailService = new EmailService();
