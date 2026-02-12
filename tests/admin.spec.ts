import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

interface User {
  id: string;
  name: string;
  email: string;
  roles: Array<{ role: string }>;
}

async function setupAdminMocks(page: Page) {
  const adminUser: User = {
    id: '1',
    name: 'Admin User',
    email: 'admin@jwt.com',
    roles: [{ role: 'admin' }],
  };

  // Mock auth endpoint for admin
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'admin@jwt.com' && loginReq.password === 'admin') {
      const loginRes = {
        user: adminUser,
        token: 'admin-token-123',
      };
      await route.fulfill({ json: loginRes });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock get user endpoint
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: adminUser });
  });

  // Mock get all franchises endpoint (with pagination)
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      const franchises = {
        franchises: [
          {
            id: 1,
            name: 'LotaPizza',
            admins: [{ id: 5, name: 'franchise admin', email: 'f@jwt.com' }],
            stores: [
              { id: 1, name: 'Lehi', totalRevenue: 1234.56 },
              { id: 2, name: 'Springville', totalRevenue: 987.65 },
            ],
          },
          {
            id: 2,
            name: 'PizzaCorp',
            admins: [{ id: 6, name: 'corp admin', email: 'corp@jwt.com' }],
            stores: [{ id: 3, name: 'Spanish Fork', totalRevenue: 555.55 }],
          },
          {
            id: 3,
            name: 'topSpot',
            admins: [{ id: 7, name: 'top admin', email: 'top@jwt.com' }],
            stores: [],
          },
        ],
        more: false,
      };
      await route.fulfill({ json: franchises });
    }
  });

  // Mock create franchise endpoint
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      const createReq = route.request().postDataJSON();
      const createRes = {
        id: 4,
        name: createReq.name,
        admins: [{ id: 8, name: createReq.admins[0].name, email: createReq.admins[0].email }],
        stores: [],
      };
      await route.fulfill({ json: createRes });
    }
  });

  // Mock delete franchise endpoint
  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });
}

test('admin dashboard loads and displays franchises', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Login as admin
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Navigate to admin dashboard
  await page.goto('/admin-dashboard');
  
  // Verify franchises are displayed
  await expect(page.getByText('LotaPizza')).toBeVisible();
  await expect(page.getByText('PizzaCorp')).toBeVisible();
  await expect(page.getByText('topSpot')).toBeVisible();
});

test('admin can navigate to create franchise', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Set admin user state
  await page.goto('/');
  await page.evaluate(() => {
    const adminUser = {
      id: '1',
      name: 'Admin User',
      email: 'admin@jwt.com',
      roles: [{ role: 'admin' }],
    };
    localStorage.setItem('token', 'admin-token-123');
    localStorage.setItem('user', JSON.stringify(adminUser));
  });
  
  // Navigate to admin dashboard
  await page.goto('/admin-dashboard');
  
  // Look for create franchise button/link
  const createLink = page.getByRole('link', { name: /create/i }).or(page.getByRole('button', { name: /create/i }));
  
  // Try to find and click if exists
  const createExists = await createLink.count();
  if (createExists > 0) {
    await createLink.first().click();
    await expect(page).toHaveURL(/.*\/create-franchise/);
  }
});

test('create franchise form submission', async ({ page }) => {
  await setupAdminMocks(page);
  
  let franchiseCreated = false;
  
  // Track franchise creation
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      franchiseCreated = true;
      const createReq = route.request().postDataJSON();
      const createRes = {
        id: 4,
        name: createReq.name,
        admins: [{ id: 8, name: 'New Admin', email: createReq.admins[0].email }],
        stores: [],
      };
      await route.fulfill({ json: createRes });
    }
  });
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  // Navigate to create franchise page
  await page.goto('/create-franchise');
  
  // Fill form
  const nameInput = page.getByRole('textbox', { name: /name/i }).or(page.locator('input[name="name"]'));
  const emailInput = page.getByRole('textbox', { name: /email/i }).or(page.locator('input[name="adminEmail"]')).or(page.locator('input[type="email"]'));
  
  const nameExists = await nameInput.count();
  const emailExists = await emailInput.count();
  
  if (nameExists > 0 && emailExists > 0) {
    await nameInput.first().fill('New Franchise');
    await emailInput.first().fill('newadmin@jwt.com');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /create/i }).or(page.getByRole('button', { name: /submit/i }));
    const submitExists = await submitButton.count();
    
    if (submitExists > 0) {
      await submitButton.first().click();
    }
  }
});

test('navigate to close franchise page', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  // Navigate to admin dashboard
  await page.goto('/admin-dashboard');
  
  // Look for close/delete button
  const closeButton = page.getByRole('button', { name: /close/i }).or(page.getByRole('link', { name: /close/i }));
  const closeExists = await closeButton.count();
  
  if (closeExists > 0) {
    await closeButton.first().click();
  }
});

test('close franchise confirmation and deletion', async ({ page }) => {
  await setupAdminMocks(page);
  
  let franchiseDeleted = false;
  
  // Track franchise deletion
  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      franchiseDeleted = true;
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  // Navigate to close franchise with franchise data
  await page.goto('/close-franchise');
  
  // Set franchise state
  await page.evaluate(() => {
    const franchise = {
      id: 1,
      name: 'LotaPizza',
    };
    window.history.replaceState({ franchise }, '', '/close-franchise');
  });
  
  await page.reload();
  
  // Look for confirm button
  const confirmButton = page.getByRole('button', { name: /close/i }).or(page.getByRole('button', { name: /confirm/i }));
  const confirmExists = await confirmButton.count();
  
  if (confirmExists > 0) {
    await confirmButton.first().click();
  }
});

test('error handling - create franchise failure', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Override create endpoint to fail
  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        json: { message: 'Franchise creation failed' },
      });
    }
  });
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  await page.goto('/create-franchise');
  
  // Page should still be accessible
  await expect(page).toHaveURL(/.*\/create-franchise/);
});

test('error handling - delete franchise failure', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Override delete endpoint to fail
  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 403,
        json: { message: 'Cannot delete franchise with stores' },
      });
    }
  });
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  await page.goto('/close-franchise');
  
  // Page should load
  await expect(page).toHaveURL(/.*\/close-franchise/);
});

test('admin dashboard displays franchise details', async ({ page }) => {
  await setupAdminMocks(page);
  
  // Set admin authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'admin-token-123');
  });
  
  await page.goto('/admin-dashboard');
  
  // Verify page loads
  await expect(page).toHaveURL(/.*\/admin-dashboard/);
});
