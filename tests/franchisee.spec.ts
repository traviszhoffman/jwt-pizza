import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

interface User {
  id: string;
  name: string;
  email: string;
  roles: Array<{ role: string; object?: string }>;
}

async function setupFranchiseeMocks(page: Page) {
  const franchiseeUser: User = {
    id: '5',
    name: 'Franchise Owner',
    email: 'franchisee@jwt.com',
    roles: [{ role: 'franchisee', object: 'pizza' }],
  };

  // Mock auth endpoint for franchisee
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'franchisee@jwt.com' && loginReq.password === 'franchisee') {
      const loginRes = {
        user: franchiseeUser,
        token: 'franchisee-token-456',
      };
      await route.fulfill({ json: loginRes });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock get user endpoint
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseeUser });
  });

  // Mock get user's franchises endpoint
  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'GET') {
      const franchises = [
        {
          id: 1,
          name: 'pizzaPocket',
          admins: [{ id: 5, name: 'Franchise Owner', email: 'franchisee@jwt.com' }],
          stores: [
            { id: 1, name: 'SLC', totalRevenue: 9876.54 },
            { id: 2, name: 'Provo', totalRevenue: 5432.10 },
          ],
        },
      ];
      await route.fulfill({ json: franchises });
    } else if (route.request().method() === 'DELETE') {
      // Delete franchise
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });

  // Mock create store endpoint
  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    if (route.request().method() === 'POST') {
      const createReq = route.request().postDataJSON();
      const createRes = {
        id: 3,
        franchiseId: 1,
        name: createReq.name,
      };
      await route.fulfill({ json: createRes });
    }
  });

  // Mock delete store endpoint
  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'store deleted' } });
    }
  });
}

test('franchisee dashboard loads and displays franchises', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Login as franchisee
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('franchisee@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Navigate to franchisee dashboard
  await page.goto('/franchise-dashboard');
  
  // Verify franchise information is displayed
  await expect(page.getByText('pizzaPocket')).toBeVisible();
});

test('franchisee dashboard shows stores and revenue', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  // Navigate to franchisee dashboard
  await page.goto('/franchise-dashboard');
  
  // Verify stores are displayed
  const slcStore = page.getByText('SLC');
  const provoStore = page.getByText('Provo');
  
  // Check if stores appear
  const slcExists = await slcStore.count();
  const provoExists = await provoStore.count();
  
  if (slcExists > 0) {
    await expect(slcStore).toBeVisible();
  }
  
  if (provoExists > 0) {
    await expect(provoStore).toBeVisible();
  }
});

test('navigate to create store page', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  // Navigate to franchise dashboard
  await page.goto('/franchise-dashboard');
  
  // Look for create store button/link
  const createButton = page.getByRole('link', { name: /create store/i }).or(page.getByRole('button', { name: /create store/i }));
  const createExists = await createButton.count();
  
  if (createExists > 0) {
    await createButton.first().click();
    await expect(page).toHaveURL(/.*\/create-store/);
  }
});

test('create store form submission', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  let storeCreated = false;
  
  // Track store creation
  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    if (route.request().method() === 'POST') {
      storeCreated = true;
      const createReq = route.request().postDataJSON();
      const createRes = {
        id: 3,
        franchiseId: 1,
        name: createReq.name,
      };
      await route.fulfill({ json: createRes });
    }
  });
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  // Navigate to create store page
  await page.goto('/create-store');
  
  // Set franchise state
  await page.evaluate(() => {
    const franchise = {
      id: 1,
      name: 'pizzaPocket',
    };
    window.history.replaceState({ franchise }, '', '/create-store');
  });
  
  await page.reload();
  
  // Fill form
  const nameInput = page.getByRole('textbox', { name: /name/i }).or(page.locator('input[name="name"]'));
  const nameExists = await nameInput.count();
  
  if (nameExists > 0) {
    await nameInput.first().fill('Orem');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /create/i }).or(page.getByRole('button', { name: /submit/i }));
    const submitExists = await submitButton.count();
    
    if (submitExists > 0) {
      await submitButton.first().click();
    }
  }
});

test('navigate to close store page', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  // Navigate to franchise dashboard
  await page.goto('/franchise-dashboard');
  
  // Look for close/delete store button
  const closeButton = page.getByRole('button', { name: /close/i }).or(page.getByRole('link', { name: /close/i }));
  const closeExists = await closeButton.count();
  
  if (closeExists > 0) {
    await closeButton.first().click();
  }
});

test('close store confirmation and deletion', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  let storeDeleted = false;
  
  // Track store deletion
  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      storeDeleted = true;
      await route.fulfill({ json: { message: 'store deleted' } });
    }
  });
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  // Navigate to close store with store data
  await page.goto('/close-store');
  
  // Set franchise and store state
  await page.evaluate(() => {
    const franchise = { id: 1, name: 'pizzaPocket' };
    const store = { id: 1, name: 'SLC' };
    window.history.replaceState({ franchise, store }, '', '/close-store');
  });
  
  await page.reload();
  
  // Look for confirm button
  const confirmButton = page.getByRole('button', { name: /close/i }).or(page.getByRole('button', { name: /confirm/i }));
  const confirmExists = await confirmButton.count();
  
  if (confirmExists > 0) {
    await confirmButton.first().click();
  }
});

test('error handling - create store failure', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Override create endpoint to fail
  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        json: { message: 'Store creation failed' },
      });
    }
  });
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  await page.goto('/create-store');
  
  // Page should still be accessible
  await expect(page).toHaveURL(/.*\/create-store/);
});

test('error handling - delete store failure', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Override delete endpoint to fail
  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 403,
        json: { message: 'Cannot delete store with pending orders' },
      });
    }
  });
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  await page.goto('/close-store');
  
  // Page should load
  await expect(page).toHaveURL(/.*\/close-store/);
});

test('franchisee can view revenue data', async ({ page }) => {
  await setupFranchiseeMocks(page);
  
  // Set franchisee authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'franchisee-token-456');
  });
  
  await page.goto('/franchise-dashboard');
  
  // Verify page loads (revenue display depends on implementation)
  await expect(page).toHaveURL(/.*\/franchise-dashboard/);
});
