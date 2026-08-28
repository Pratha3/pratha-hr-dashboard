import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) & Multi-Role Verification', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('1. ADMIN Role: Full System Access & Unrestricted Visibility', async ({ page }) => {
    await page.goto('/login');

    // Login as Admin
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/ADMIN Session/i)).toBeVisible({ timeout: 10000 });

    // Verify all sidebar navigation links are present
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: /Overview/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Workforce/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Departments/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Leaves & Time Off/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Announcements/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /User Access/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Audit Trail/i })).toBeVisible();

    // Verify access to Audit Logs
    await sidebar.getByRole('link', { name: /Audit Trail/i }).click();
    await expect(page).toHaveURL(/.*audit-logs/);
    await expect(page.getByText(/System Audit Trail/i)).toBeVisible();
    await expect(page.getByText(/Unauthorized Access/i)).not.toBeVisible();

    // Verify access to User Access module
    await sidebar.getByRole('link', { name: /User Access/i }).click();
    await expect(page).toHaveURL(/.*users/);
    await expect(page.getByText(/User Access & Roles/i)).toBeVisible();

    // Verify admin access to Workforce features
    await sidebar.getByRole('link', { name: /Workforce/i }).click();
    await expect(page).toHaveURL(/.*employees/);
    await expect(page.getByRole('button', { name: /Add Member/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reveal Salaries/i })).toBeVisible();
  });

  test('2. HR Role: Workforce & Employee Management with Restricted Audit Logs', async ({
    page
  }) => {
    await page.goto('/login');

    // Login as HR
    await page.locator('input[type="email"]').fill('hr@pratha.com');
    await page.locator('input[type="password"]').fill('Hr@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/HR Session/i)).toBeVisible({ timeout: 10000 });

    // Verify Sidebar: Audit Trail link should NOT be present for HR
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: /Overview/i })).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByRole('link', { name: /Workforce/i })).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByRole('link', { name: /Departments/i })).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByRole('link', { name: /Leaves & Time Off/i })).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByRole('link', { name: /Announcements/i })).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByRole('link', { name: /Audit Trail/i })).not.toBeVisible();

    // Attempting direct URL access to /audit-logs displays Unauthorized Access guard
    await page.goto('/audit-logs');
    await expect(page.getByText(/Unauthorized Access/i)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/You do not have the required permission \(AUDIT_READ\)/i)
    ).toBeVisible();

    // Verify HR can access Workforce and perform management actions
    await sidebar.getByRole('link', { name: /Workforce/i }).click();
    await expect(page).toHaveURL(/.*employees/);
    await expect(page.getByText(/Workforce & Directory/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Member/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reveal Salaries/i })).toBeVisible();
  });

  test('3. EMPLOYEE Role: Read-Only Workforce View with Hidden Salaries and Restricted Actions', async ({
    page
  }) => {
    await page.goto('/login');

    // Login as Employee
    await page.locator('input[type="email"]').fill('alex.morgan@pratha.com');
    await page.locator('input[type="password"]').fill('Emp@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/EMPLOYEE Session/i)).toBeVisible({ timeout: 10000 });

    // Verify Sidebar: Neither Audit Trail link is present
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: /Audit Trail/i })).not.toBeVisible();

    // Direct access to /audit-logs should be blocked
    await page.goto('/audit-logs');
    await expect(page.getByText(/Unauthorized Access/i)).toBeVisible({ timeout: 10000 });

    // Verify Employee on Workforce directory page via sidebar navigation
    await sidebar.getByRole('link', { name: /Workforce/i }).click();
    await expect(page).toHaveURL(/.*employees/);
    await expect(page.getByText(/Workforce & Directory/i)).toBeVisible({ timeout: 15000 });

    // Employee must NOT see Add Member button
    await expect(page.getByRole('button', { name: /Add Member/i })).not.toBeVisible();

    // Employee must NOT see Reveal Salaries button
    await expect(page.getByRole('button', { name: /Reveal Salaries/i })).not.toBeVisible();

    // Salary table header must NOT be present
    await expect(page.locator('th:has-text("Salary")')).not.toBeVisible();
  });
});
