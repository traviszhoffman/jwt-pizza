import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

interface User {
  id: string;
  name: string;
  email: string;
  roles: Array<{ role: string }>;
}

async function setupLogoutMocks(page: Page) {
  const loggedInUser: User = {
    id: '3',
    name: 'Kai Chen',
    email: 'd@jwt.com',
    roles: [{ role: 'diner' }],
  };

  // Mock auth login endpoint
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      const loginReq = route.request().postDataJSON();
      if (loginReq.email === loggedInUser.email && loginReq.password === 'a') {
        const loginRes = {
          user: loggedInUser,
          token: 'abcdef',
        };
        await route.fulfill({ json: loginRes });
      } else {
        await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      }
    } else if (route.request().method() === 'DELETE') {
      // Logout endpoint
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  // Mock get user endpoint
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });
}

test('logout clears user state and redirects', async ({ page }) => {
  await setupLogoutMocks(page);
  
  // Login first
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Verify logged in - should see user initials
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  
  // Navigate to logout
  await page.goto('/logout');
  
  // Should redirect to home after logout
  await expect(page).toHaveURL(/.*\/(home|\/)?$/);
  
  // Verify user is no longer logged in
  const loginLink = page.getByRole('link', { name: 'Login' });
  await expect(loginLink).toBeVisible();
});

test('logout removes token from localStorage', async ({ page }) => {
  await setupLogoutMocks(page);
  
  // Set logged in state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
    const user = {
      id: '3',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      roles: [{ role: 'diner' }],
    };
    localStorage.setItem('user', JSON.stringify(user));
  });
  
  // Verify token exists
  const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
  expect(tokenBefore).toBeTruthy();
  
  // Logout
  await page.goto('/logout');
  
  // Wait a moment for logout to process
  await page.waitForTimeout(100);
  
  // Verify token is removed
  const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
  expect(tokenAfter).toBeNull();
});

test('logout calls DELETE /api/auth endpoint', async ({ page }) => {
  await setupLogoutMocks(page);
  
  let logoutApiCalled = false;
  
  // Track logout API call
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      logoutApiCalled = true;
      await route.fulfill({ json: { message: 'logout successful' } });
    } else if (route.request().method() === 'PUT') {
      const loginReq = route.request().postDataJSON();
      const loginRes = {
        user: {
          id: '3',
          name: 'Kai Chen',
          email: 'd@jwt.com',
          roles: [{ role: 'diner' }],
        },
        token: 'abcdef',
      };
      await route.fulfill({ json: loginRes });
    }
  });
  
  // Set logged in state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
  });
  
  // Navigate to logout
  await page.goto('/logout');
  
  // Wait for API call to complete
  await page.waitForTimeout(200);
  
  // Verify logout API was called
  expect(logoutApiCalled).toBe(true);
});

test('error handling - logout API failure still clears local state', async ({ page }) => {
  await setupLogoutMocks(page);
  
  // Override logout endpoint to fail
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        json: { message: 'Server error' },
      });
    } else if (route.request().method() === 'PUT') {
      const loginRes = {
        user: {
          id: '3',
          name: 'Kai Chen',
          email: 'd@jwt.com',
          roles: [{ role: 'diner' }],
        },
        token: 'abcdef',
      };
      await route.fulfill({ json: loginRes });
    }
  });
  
  // Set logged in state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
  });
  
  // Logout
  await page.goto('/logout');
  
  // Wait for logout to process
  await page.waitForTimeout(200);
  
  // Even if API fails, local token should be cleared
  const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
  expect(tokenAfter).toBeNull();
});

test('logout from different user roles', async ({ page }) => {
  // Test with admin user
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });
  
  // Set admin user
  await page.goto('/');
  await page.evaluate(() => {
    const adminUser = {
      id: '1',
      name: 'Admin User',
      email: 'admin@jwt.com',
      roles: [{ role: 'admin' }],
    };
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('user', JSON.stringify(adminUser));
  });
  
  // Logout
  await page.goto('/logout');
  
  // Wait for logout
  await page.waitForTimeout(100);
  
  // Verify logged out
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeNull();
});

test('logout button click workflow', async ({ page }) => {
  await setupLogoutMocks(page);
  
  // Login first
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Wait for login to complete
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  
  // Click on user menu
  await page.getByRole('link', { name: 'KC' }).click();
  
  // Look for logout link
  const logoutLink = page.getByRole('link', { name: /logout/i });
  const logoutExists = await logoutLink.count();
  
  if (logoutExists > 0) {
    await logoutLink.click();
    
    // Should redirect after logout
    await page.waitForTimeout(200);
    
    // Verify logged out state
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  }
});
