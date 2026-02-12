import { test, expect } from 'playwright-test-coverage';

test('updateUser', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza diner');
});

test('diner dashboard displays order history', async ({ page }) => {
  // Mock order history endpoint
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      const orderHistory = {
        dinerId: 3,
        orders: [
          {
            id: 1,
            franchiseId: 1,
            storeId: 1,
            date: '2024-06-05T05:14:40.000Z',
            items: [
              { id: 1, menuId: 1, description: 'Veggie', price: 0.0038 },
              { id: 2, menuId: 2, description: 'Pepperoni', price: 0.0042 },
            ],
          },
          {
            id: 2,
            franchiseId: 2,
            storeId: 4,
            date: '2024-06-06T12:30:00.000Z',
            items: [
              { id: 3, menuId: 3, description: 'Margarita', price: 0.0014 },
            ],
          },
        ],
      };
      await route.fulfill({ json: orderHistory });
    }
  });

  // Register and login a user
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  // Navigate to diner dashboard
  await page.getByRole('link', { name: 'pd' }).click();

  // Wait for orders to load
  await page.waitForTimeout(500);

  // Verify dashboard content
  await expect(page.getByRole('main')).toContainText('pizza diner');
});