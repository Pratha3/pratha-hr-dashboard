# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> HRMS Dashboard End-to-End Tests >> 3. Full Admin login flow & dashboard access verification
- Location: e2e/auth.spec.ts:25:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="email"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('input[type="email"]')

```

```yaml
- text: Internal Server Error
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('HRMS Dashboard End-to-End Tests', () => {
  4  |   test.beforeEach(async ({ context, page }) => {
  5  |     // Clear cookies & storage to ensure each test runs in a clean unauthenticated state
  6  |     await context.clearCookies();
  7  |     await page.goto('/login');
  8  |   });
  9  | 
  10 |   test('1. Should render the login page with all inputs and security badges', async ({ page }) => {
  11 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  12 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  13 |     await expect(page.getByRole('button', { name: /Authenticate Session/i })).toBeVisible();
  14 |   });
  15 | 
  16 |   test('2. Should display error message on invalid login credentials', async ({ page }) => {
  17 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  18 |     await page.locator('input[type="email"]').fill('admin@pratha.com');
  19 |     await page.locator('input[type="password"]').fill('WrongPassword123!');
  20 |     await page.getByRole('button', { name: /Authenticate Session/i }).click();
  21 | 
  22 |     await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10000 });
  23 |   });
  24 | 
  25 |   test('3. Full Admin login flow & dashboard access verification', async ({ page }) => {
> 26 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  27 |     await page.locator('input[type="email"]').fill('admin@pratha.com');
  28 |     await page.locator('input[type="password"]').fill('Admin@123456');
  29 |     await page.getByRole('button', { name: /Authenticate Session/i }).click();
  30 | 
  31 |     await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  32 |     await expect(page.getByText(/Executive Overview/i)).toBeVisible({ timeout: 10000 });
  33 |     await expect(page.getByText(/ADMIN Session/i)).toBeVisible();
  34 |   });
  35 | 
  36 |   test('4. Sidebar navigation between Workforce & Departments', async ({ page }) => {
  37 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  38 |     await page.locator('input[type="email"]').fill('admin@pratha.com');
  39 |     await page.locator('input[type="password"]').fill('Admin@123456');
  40 |     await page.getByRole('button', { name: /Authenticate Session/i }).click();
  41 |     await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  42 | 
  43 |     await page.getByRole('link', { name: /Workforce/i }).click();
  44 |     await expect(page).toHaveURL(/.*employees/);
  45 |     await expect(page.getByText(/Workforce & Directory/i)).toBeVisible();
  46 | 
  47 |     await page.getByRole('link', { name: /Departments/i }).click();
  48 |     await expect(page).toHaveURL(/.*departments/);
  49 |     await expect(page.getByText(/Departments/i).first()).toBeVisible();
  50 |   });
  51 | 
  52 |   test('5. Logout flow terminates session and redirects back to /login', async ({ page }) => {
  53 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  54 |     await page.locator('input[type="email"]').fill('admin@pratha.com');
  55 |     await page.locator('input[type="password"]').fill('Admin@123456');
  56 |     await page.getByRole('button', { name: /Authenticate Session/i }).click();
  57 |     await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  58 | 
  59 |     await page.getByRole('button', { name: /Sign Out/i }).first().click();
  60 |     await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
  61 |     await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  62 |   });
  63 | });
  64 | 
```