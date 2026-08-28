import { test, expect } from '@playwright/test';

test.describe('Authentication & Route Guarding Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies & storage to ensure each test runs in a clean unauthenticated state
    await context.clearCookies();
  });

  test('1. Should render the login page with all inputs, security badges, and quick fill pills', async ({
    page
  }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Authenticate Session/i })).toBeVisible();
    await expect(page.getByText(/Quick Dev Credentials/i)).toBeVisible();
    await expect(page.getByText(/256-bit Argon2id/i)).toBeVisible();
  });

  test('2. Should display validation errors on empty or invalid inputs', async ({ page }) => {
    await page.goto('/login');

    // Click submit without entering anything
    await page.getByRole('button', { name: /Authenticate Session/i }).click();
    await expect(page.getByText(/Invalid email address/i).first()).toBeVisible({ timeout: 5000 });

    // Enter invalid email format
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();
    await expect(page.getByText(/Invalid email address/i).first()).toBeVisible();
  });

  test('3. Should display error message on wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('IncorrectPassword123!');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page.getByText(/Invalid email or password/i).first()).toBeVisible({
      timeout: 10000
    });
  });

  test('4. Quick Dev Credentials auto-fill buttons work', async ({ page }) => {
    await page.goto('/login');

    // Click Quick fill Admin
    await page.getByRole('button', { name: /Admin Full admin@pratha.com/i }).click();
    await expect(page.locator('input[type="email"]')).toHaveValue('admin@pratha.com');

    // Click Quick fill HR
    await page.getByRole('button', { name: /HR User Restricted hr@pratha.com/i }).click();
    await expect(page.locator('input[type="email"]')).toHaveValue('hr@pratha.com');
  });

  test('5. Unauthenticated user is redirected to /login when attempting to access protected routes', async ({
    page
  }) => {
    // Attempt accessing dashboard directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

    // Attempt accessing employees directly
    await page.goto('/employees');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

    // Attempt accessing departments directly
    await page.goto('/departments');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

    // Attempt accessing audit logs directly
    await page.goto('/audit-logs');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('6. Successful login redirects to /dashboard and persists across page reloads', async ({
    page
  }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/ADMIN Session/i)).toBeVisible();

    // Reload page to verify session persistence
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Executive Overview/i)).toBeVisible({ timeout: 15000 });
  });

  test('7. Authenticated user visiting /login is redirected back to /dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Try navigating back to /login
    await page.goto('/login');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('8. Logout flow terminates session and redirects back to /login', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('admin@pratha.com');
    await page.locator('input[type="password"]').fill('Admin@123456');
    await page.getByRole('button', { name: /Authenticate Session/i }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Click Sign Out in sidebar
    await page.getByRole('button', { name: /Sign Out/i }).first().click();

    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    // Ensure user cannot navigate back to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
