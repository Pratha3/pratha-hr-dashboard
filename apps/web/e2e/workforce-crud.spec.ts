import { test, expect } from '@playwright/test';

test.describe('Workforce Management & Employee Lifecycle Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');

    // Login as Admin
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await page.locator('aside').getByRole('link', { name: /Workforce/i }).click();
    await expect(page).toHaveURL(/.*employees/, { timeout: 15000 });
    await expect(page.getByText(/Workforce & Directory/i)).toBeVisible({ timeout: 15000 });
  });

  test('1. Should render directory table with member rows and salary masking', async ({
    page
  }) => {
    // Check table headers
    await expect(page.locator('th:has-text("Member")')).toBeVisible();
    await expect(page.locator('th:has-text("Code")')).toBeVisible();
    await expect(page.locator('th:has-text("Department & Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Position")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Salary")')).toBeVisible();

    // Verify salaries are masked by default
    await expect(page.getByText('••••••••').first()).toBeVisible();

    // Toggle Reveal Salaries
    await page.getByRole('button', { name: /Reveal Salaries/i }).click();
    await expect(page.getByRole('button', { name: /Hide Salaries/i })).toBeVisible();
    // At least one salary number should now be rendered
    await expect(page.locator('td:has-text("$")').first()).toBeVisible();

    // Toggle Hide Salaries again
    await page.getByRole('button', { name: /Hide Salaries/i }).click();
    await expect(page.getByText('••••••••').first()).toBeVisible();
  });

  test('2. Should filter workforce records by search input and dropdowns', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search by name"]');

    // Search for "Sarah"
    await searchInput.fill('Sarah');
    await expect(page.locator('tbody').getByText('Sarah Jenkins')).toBeVisible({ timeout: 15000 });

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Filter by Department (Engineering)
    const departmentSelect = page.locator('select').first();
    await departmentSelect.selectOption({ label: 'Engineering' });
    await expect(page.locator('tbody').getByText('Engineering').first()).toBeVisible({
      timeout: 10000
    });

    // Reset Department filter
    await departmentSelect.selectOption({ value: '' });

    // Filter by Status (Active)
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption({ value: 'ACTIVE' });
    await expect(page.locator('tbody').getByText('Active').first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Full Add Member Lifecycle (Create User via Modal)', async ({ page }) => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const uniqueEmail = `qa.engineer.${Date.now()}.${randomId}@pratha.com`;
    const uniqueCode = `QA-${randomId}`;
    const uniqueLastName = `Tester${randomId}`;
    const fullName = `Taylor ${uniqueLastName}`;

    // Open Add Member Modal
    await page.getByRole('button', { name: /Add Member/i }).click();
    await expect(page.getByText('Add Workforce Member')).toBeVisible();

    // Fill in required form fields
    await page.locator('input[placeholder="Jane"]').fill('Taylor');
    await page.locator('input[placeholder="Doe"]').fill(uniqueLastName);
    await page.locator('input[placeholder="jane.doe@pratha.com"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').fill('Secr3tP@ssword!');
    await page.locator('input[placeholder="EMP-010"]').fill(uniqueCode);
    await page.locator('input[placeholder="Product Designer"]').fill('QA Lead Automation Engineer');

    // Select Department
    const modal = page.locator('[role="dialog"]');
    await modal.locator('select').first().selectOption({ label: 'Engineering' });

    // Select Role
    await modal.locator('select').nth(1).selectOption({ label: 'EMPLOYEE' });

    // Select Status
    await modal.locator('select').nth(2).selectOption({ label: 'Active' });

    // Fill Salary
    await modal.locator('input[type="number"]').fill('115000');

    // Submit form
    await page.getByRole('button', { name: /Create Member/i }).click();

    // Verify modal closes and new member appears in directory
    await expect(page.getByText('Workforce member added successfully!')).toBeVisible({
      timeout: 10000
    });
    await expect(page.getByText(fullName)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueCode)).toBeVisible();
  });

  test('4. Full Edit Member Lifecycle (Update Details via Modal)', async ({ page }) => {
    // Search for Alex Morgan to ensure target is in current view
    await page.locator('input[placeholder*="Search by name"]').fill('Alex Morgan');
    const alexRow = page.locator('tr:has-text("Alex Morgan")');
    await expect(alexRow).toBeVisible({ timeout: 10000 });

    // Open row actions dropdown
    await alexRow.locator('button').click();
    await page.getByRole('menuitem', { name: /Edit Details/i }).click();

    // Verify Edit modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal.getByText('Edit Workforce Member')).toBeVisible({ timeout: 5000 });

    // Change job position
    const positionInput = modal.locator('input[name="position"]');
    await positionInput.fill('Principal Staff Engineer');

    // Save changes
    await modal.getByRole('button', { name: /Save Changes/i }).click();

    // Verify success toast & updated text in table
    await expect(page.getByText('Member updated successfully!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Principal Staff Engineer')).toBeVisible({ timeout: 10000 });
  });

  test('5. Deactivate and Reactivate Member Lifecycle', async ({ page }) => {
    // Search for Sarah Jenkins to ensure target is in current view
    await page.locator('input[placeholder*="Search by name"]').fill('Sarah Jenkins');
    const userRow = page.locator('tr:has-text("Sarah Jenkins")');
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Click actions menu and Deactivate
    const actionBtn = userRow.locator('button').last();
    await actionBtn.click();
    const deactivateItem = page.getByRole('menuitem', { name: /Deactivate Member/i });
    await expect(deactivateItem).toBeVisible({ timeout: 5000 });
    await deactivateItem.click();

    // Verify toast & Inactive badge
    await expect(page.getByText('Member deactivated')).toBeVisible({ timeout: 10000 });
    await expect(userRow.getByText('Inactive')).toBeVisible({ timeout: 10000 });

    // Click actions menu again and Reactivate
    await actionBtn.click();
    const reactivateItem = page.getByRole('menuitem', { name: /Reactivate Member/i });
    await expect(reactivateItem).toBeVisible({ timeout: 5000 });
    await reactivateItem.click();

    // Verify toast & Active badge
    await expect(page.getByText('Member activated successfully')).toBeVisible({ timeout: 10000 });
    await expect(userRow.getByText('Active')).toBeVisible({ timeout: 10000 });
  });
});
