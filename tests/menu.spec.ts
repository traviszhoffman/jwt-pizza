import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

async function setupMenuMocks(page: Page) {
  // Mock menu endpoint
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      {
        id: 1,
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight',
      },
      {
        id: 2,
        title: 'Pepperoni',
        image: 'pizza2.png',
        price: 0.0042,
        description: 'Spicy treat',
      },
      {
        id: 3,
        title: 'Margarita',
        image: 'pizza3.png',
        price: 0.0014,
        description: 'Essential classic',
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  // Mock franchise endpoint
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 1,
          name: 'LotaPizza',
          stores: [
            { id: 1, name: 'Lehi' },
            { id: 2, name: 'Springville' },
            { id: 3, name: 'American Fork' },
          ],
        },
        {
          id: 2,
          name: 'PizzaCorp',
          stores: [{ id: 4, name: 'Spanish Fork' }],
        },
        {
          id: 3,
          name: 'topSpot',
          stores: [],
        },
      ],
      more: false,
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });
}

test('menu page loads and displays pizzas', async ({ page }) => {
  await setupMenuMocks(page);
  await page.goto('/');
  
  // Navigate to menu
  await page.getByRole('button', { name: 'Order now' }).click();
  
  // Verify menu items are displayed
  await expect(page.getByText('Awesome is a click away')).toBeVisible();
  await expect(page.getByText('Veggie')).toBeVisible();
  await expect(page.getByText('Pepperoni')).toBeVisible();
  await expect(page.getByText('Margarita')).toBeVisible();
  await expect(page.getByText('A garden of delight')).toBeVisible();
});

test('select store and add pizzas to order', async ({ page }) => {
  await setupMenuMocks(page);
  await page.goto('/');
  
  // Navigate to menu
  await page.getByRole('button', { name: 'Order now' }).click();
  
  // Select a store
  await page.getByRole('combobox').selectOption('1');
  await expect(page.getByRole('combobox')).toHaveValue('1');
  
  // Add pizzas to cart
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 1');
  
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  
  // Verify checkout button is enabled
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeEnabled();
});

test('checkout navigates to login when not authenticated', async ({ page }) => {
  await setupMenuMocks(page);
  await page.goto('/');
  
  // Navigate to menu and build order
  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  
  // Click checkout
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Should navigate to payment/login page
  await expect(page).toHaveURL(/.*\/(payment|login)/);
});

test('menu displays franchises with stores', async ({ page }) => {
  await setupMenuMocks(page);
  
  // Wait for franchise API call to complete
  const franchisePromise = page.waitForResponse(/\/api\/franchise/);
  
  await page.goto('/menu');
  
  // Wait for API response
  await franchisePromise;
  
  // Wait for store selector
  const storeSelect = page.getByRole('combobox');
  await expect(storeSelect).toBeVisible();
  
  // Wait a bit for React to render the options
  await page.waitForTimeout(100);
  
  // Verify stores are populated
  const options = await storeSelect.locator('option').all();
  expect(options.length).toBeGreaterThan(1); // At least placeholder + stores
});

test('franchise with no stores shows in dropdown', async ({ page }) => {
  await setupMenuMocks(page);
  await page.goto('/menu');
  
  // The topSpot franchise has no stores, but franchises should still load
  await expect(page.getByRole('combobox')).toBeVisible();
});

test('error handling - menu API failure', async ({ page }) => {
  // Mock menu endpoint to fail
  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({ 
      status: 500, 
      json: { message: 'Internal server error' } 
    });
  });

  // Mock franchise endpoint normally
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto('/menu');
  
  // The page should still load even if menu fails
  // (The actual error handling depends on implementation)
  await expect(page.getByRole('combobox')).toBeVisible();
});

test('error handling - franchise API failure', async ({ page }) => {
  // Mock menu endpoint normally
  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({ json: [] });
  });

  // Mock franchise endpoint to fail
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({ 
      status: 500, 
      json: { message: 'Failed to load franchises' } 
    });
  });

  await page.goto('/menu');
  
  // Page should still be accessible
  await expect(page).toHaveURL(/.*\/menu/);
});
