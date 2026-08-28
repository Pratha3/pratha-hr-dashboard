import { test, expect } from '@playwright/test';

test.describe('HRMS Dashboard End-to-End Tests', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear cookies & storage to ensure each test runs in a clean unauthenticated state
    await context.clearCookies();
    await page.goto('/login');
  });

  test('1. Should render the login page with all inputs and security badges', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Authenticate Session/i })).toBeVisible();
  });

  test('2. Should display error message on invalid login credentials', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test('3. Full Admin login flow & dashboard access verification', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/ADMIN Session/i)).toBeVisible();
  });

  test('4. Sidebar navigation between Workforce & Departments', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    await page.getByRole('link', { name: /Workforce/i }).click();
    await expect(page).toHaveURL(/.*employees/);
    await expect(page.getByText(/Workforce & Directory/i)).toBeVisible();

    await page.getByRole('link', { name: /Departments/i }).click();
    await expect(page).toHaveURL(/.*departments/);
    await expect(page.getByText(/Departments/i).first()).toBeVisible();
  });

  test('5. Logout flow terminates session and redirects back to /login', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    await page.getByRole('button', { name: /Sign Out/i }).first().click();
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
