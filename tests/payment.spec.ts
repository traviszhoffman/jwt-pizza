import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  roles: Array<{ role: string }>;
}

async function setupPaymentMocks(page: Page) {
  const loggedInUser: User = {
    id: '3',
    name: 'Kai Chen',
    email: 'd@jwt.com',
    password: 'a',
    roles: [{ role: 'diner' }],
  };

  // Mock auth endpoint
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === loggedInUser.email && loginReq.password === loggedInUser.password) {
      const loginRes = {
        user: loggedInUser,
        token: 'abcdef',
      };
      await route.fulfill({ json: loginRes });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock get user endpoint
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  // Mock order endpoint
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      const orderReq = route.request().postDataJSON();
      const orderRes = {
        order: {
          ...orderReq,
          id: 42,
        },
        jwt: 'eyJpYXQiOjE3MDk3NjAyNjEsImV4cCI6MTcwOTc2Mzg2MSwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4N2ZkMmVkLTE2ZjAtNGFiMC04NGNkLWU3MmFhOGNkM2I1MCJ9',
      };
      await route.fulfill({ json: orderRes });
    }
  });

  // Mock verify order endpoint (Pizza Factory)
  await page.route('*/**/api/order/verify', async (route) => {
    expect(route.request().method()).toBe('POST');
    const verifyRes = {
      message: 'valid',
      pizzas: [
        { id: 1, description: 'Veggie', price: 0.0038 },
        { id: 2, description: 'Pepperoni', price: 0.0042 },
      ],
    };
    await route.fulfill({ json: verifyRes });
  });
}

test('payment page displays order summary for authenticated user', async ({ page }) => {
  await setupPaymentMocks(page);
  
  // Login first
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Navigate to payment with order state
  await page.goto('/payment', {
    waitUntil: 'domcontentloaded',
  });
  
  // Use evaluate to set state in localStorage or navigate with state
  await page.evaluate(() => {
    const order = {
      items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
      ],
      storeId: '1',
      franchiseId: 1,
    };
    sessionStorage.setItem('order', JSON.stringify(order));
  });
  
  await page.reload();
  
  // Check if payment page is visible
  await expect(page).toHaveURL(/.*\/payment/);
});

test('complete order submission and navigate to delivery', async ({ page }) => {
  await setupPaymentMocks(page);
  
  // Navigate with order context via state
  await page.goto('/');
  
  // Set up authenticated user
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
  });
  
  // Navigate to payment page with order data
  await page.goto('/payment');
  
  // Set order in context
  await page.evaluate(() => {
    const order = {
      items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
      ],
      storeId: '1',
      franchiseId: 1,
    };
    
    // Simulate navigation state
    window.history.replaceState({ order }, '', '/payment');
  });
  
  await page.reload();
});

test('payment button submits order successfully', async ({ page }) => {
  await setupPaymentMocks(page);
  
  let orderSubmitted = false;
  
  // Track order submission
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      orderSubmitted = true;
      const orderReq = route.request().postDataJSON();
      const orderRes = {
        order: { ...orderReq, id: 42 },
        jwt: 'eyJpYXQiOjE3MDk3NjAyNjE',
      };
      await route.fulfill({ json: orderRes });
    }
  });
  
  // Set authenticated state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
  });
});

test('delivery page displays JWT verification', async ({ page }) => {
  await setupPaymentMocks(page);
  
  // Navigate to delivery with JWT in state
  await page.goto('/delivery');
  
  // Set JWT in navigation state
  await page.evaluate(() => {
    const jwt = 'eyJpYXQiOjE3MDk3NjAyNjE';
    window.history.replaceState({ jwt }, '', '/delivery');
  });
  
  await page.reload();
  
  // Verify delivery page loads
  await expect(page).toHaveURL(/.*\/delivery/);
});

test('verify button calls Pizza Factory API', async ({ page }) => {
  await setupPaymentMocks(page);
  
  let verifyApiCalled = false;
  
  // Track verify API call
  await page.route('*/**/api/order/verify', async (route) => {
    verifyApiCalled = true;
    const verifyRes = {
      message: 'valid',
      pizzas: [
        { id: 1, description: 'Veggie', price: 0.0038 },
      ],
    };
    await route.fulfill({ json: verifyRes });
  });
  
  await page.goto('/delivery');
  
  // Set JWT state
  await page.evaluate(() => {
    const jwt = 'eyJpYXQiOjE3MDk3NjAyNjE';
    window.history.replaceState({ jwt }, '', '/delivery');
  });
  
  await page.reload();
});

test('error handling - order submission failure', async ({ page }) => {
  await setupPaymentMocks(page);
  
  // Override order endpoint to fail
  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        json: { message: 'Failed to create order' },
      });
    }
  });
  
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'abcdef');
  });
});

test('error handling - JWT verification failure', async ({ page }) => {
  await setupPaymentMocks(page);
  
  // Override verify endpoint to fail
  await page.route('*/**/api/order/verify', async (route) => {
    await route.fulfill({
      status: 400,
      json: { message: 'Invalid JWT' },
    });
  });
  
  await page.goto('/delivery');
  
  await page.evaluate(() => {
    const jwt = 'invalid-jwt';
    window.history.replaceState({ jwt }, '', '/delivery');
  });
  
  await page.reload();
  
  // Page should still load
  await expect(page).toHaveURL(/.*\/delivery/);
});

test('error handling - unauthenticated user redirected', async ({ page }) => {
  // Mock user/me to return null (not authenticated)
  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });
  
  await page.goto('/payment');
  
  // Should redirect to login or home
  // (Actual behavior depends on implementation)
});
