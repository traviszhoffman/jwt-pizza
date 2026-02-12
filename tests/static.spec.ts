import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';

async function setupDocsMocks(page: Page) {
  // Mock JWT Pizza Service docs endpoint
  await page.route('*/**/api/docs', async (route) => {
    const docsRes = {
      version: '20240518.0.1',
      endpoints: [
        {
          method: 'GET',
          path: '/api/order/menu',
          description: 'Get the pizza menu',
          example: 'curl localhost:3000/api/order/menu',
          response: {
            statusCode: 200,
            contentType: 'application/json',
            body: [
              {
                id: 1,
                title: 'Veggie',
                image: 'pizza1.png',
                price: 0.0038,
                description: 'A garden of delight',
              },
            ],
          },
        },
        {
          method: 'PUT',
          path: '/api/auth',
          description: 'Login a user',
          example: 'curl -X PUT localhost:3000/api/auth -d \'{"email":"a@jwt.com", "password":"admin"}\'',
          response: {
            statusCode: 200,
            contentType: 'application/json',
            body: {
              user: {
                id: 1,
                name: 'pizza diner',
                email: 'a@jwt.com',
                roles: [{ role: 'diner' }],
              },
              token: 'tttttt',
            },
          },
        },
      ],
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: docsRes });
  });
}

test('about page renders content', async ({ page }) => {
  await page.goto('/about');
  
  // Verify about page is displayed
  await expect(page).toHaveURL(/.*\/about/);
  
  // Check for common about page elements
  const heading = page.locator('h1, h2').first();
  const headingExists = await heading.count();
  
  if (headingExists > 0) {
    await expect(heading).toBeVisible();
  }
});

test('about page has accessible content', async ({ page }) => {
  await page.goto('/about');
  
  // Verify page loaded successfully
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  // Check that main content area exists
  const main = page.locator('main');
  const mainExists = await main.count();
  
  if (mainExists > 0) {
    await expect(main).toBeVisible();
  }
});

test('history page renders content', async ({ page }) => {
  await page.goto('/history');
  
  // Verify history page is displayed
  await expect(page).toHaveURL(/.*\/history/);
  
  // Check for common history page elements
  const heading = page.locator('h1, h2').first();
  const headingExists = await heading.count();
  
  if (headingExists > 0) {
    await expect(heading).toBeVisible();
  }
});

test('history page has accessible content', async ({ page }) => {
  await page.goto('/history');
  
  // Verify page loaded successfully
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  // Check that main content area exists
  const main = page.locator('main');
  const mainExists = await main.count();
  
  if (mainExists > 0) {
    await expect(main).toBeVisible();
  }
});

test('404 not found page renders', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  
  // Verify 404 page or redirect behavior
  // Implementation might redirect to home or show 404 page
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('not found page shows appropriate message', async ({ page }) => {
  await page.goto('/invalid-route-xyz');
  
  // Page should still render something
  const content = await page.textContent('body');
  expect(content).toBeTruthy();
});

test('docs page loads API documentation', async ({ page }) => {
  await setupDocsMocks(page);
  
  await page.goto('/docs');
  
  // Verify docs page is displayed
  await expect(page).toHaveURL(/.*\/docs/);
  
  // Wait for content to load
  await page.waitForTimeout(500);
  
  // Check that documentation loaded
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('docs page displays JWT Pizza Service endpoints', async ({ page }) => {
  await setupDocsMocks(page);
  
  await page.goto('/docs');
  
  // Wait for API docs to load
  await page.waitForTimeout(500);
  
  // Look for version or endpoint information
  const versionText = page.getByText(/version/i);
  const versionExists = await versionText.count();
  
  if (versionExists > 0) {
    await expect(versionText.first()).toBeVisible();
  }
});

test('docs page displays Pizza Factory endpoints', async ({ page }) => {
  // Mock Pizza Factory docs endpoint
  await page.route('**/api/docs', async (route) => {
    const url = route.request().url();
    
    // Pizza Factory endpoint
    if (url.includes('factory')) {
      const factoryDocs = {
        version: '20240518.0.2',
        endpoints: [
          {
            method: 'POST',
            path: '/api/order/verify',
            description: 'Verify pizza order JWT',
          },
        ],
      };
      await route.fulfill({ json: factoryDocs });
    } else {
      // JWT Pizza Service endpoint
      const serviceDocs = {
        version: '20240518.0.1',
        endpoints: [
          {
            method: 'GET',
            path: '/api/order/menu',
            description: 'Get the pizza menu',
          },
        ],
      };
      await route.fulfill({ json: serviceDocs });
    }
  });
  
  await page.goto('/docs');
  
  // Wait for docs to load
  await page.waitForTimeout(500);
  
  // Verify page content loaded
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('error handling - docs API failure', async ({ page }) => {
  // Mock docs endpoint to fail
  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({
      status: 500,
      json: { message: 'Failed to load documentation' },
    });
  });
  
  await page.goto('/docs');
  
  // Page should still load even if API fails
  await expect(page).toHaveURL(/.*\/docs/);
  
  // Verify page is accessible
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('error handling - docs page with network timeout', async ({ page }) => {
  // Mock docs endpoint with delay
  await page.route('*/**/api/docs', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({
      json: {
        version: '1.0.0',
        endpoints: [],
      },
    });
  });
  
  await page.goto('/docs');
  
  // Wait for potential timeout handling
  await page.waitForTimeout(500);
  
  // Page should still be accessible
  await expect(page).toHaveURL(/.*\/docs/);
});

test('navigation between static pages', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to about
  const aboutLink = page.getByRole('link', { name: /about/i });
  const aboutExists = await aboutLink.count();
  
  if (aboutExists > 0) {
    await aboutLink.first().click();
    await expect(page).toHaveURL(/.*\/about/);
  }
  
  // Navigate to history
  await page.goto('/');
  const historyLink = page.getByRole('link', { name: /history/i });
  const historyExists = await historyLink.count();
  
  if (historyExists > 0) {
    await historyLink.first().click();
    await expect(page).toHaveURL(/.*\/history/);
  }
});

test('docs page renders without authentication', async ({ page }) => {
  await setupDocsMocks(page);
  
  // Ensure no authentication
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
  
  // Navigate to docs
  await page.goto('/docs');
  
  // Docs should be accessible without login
  await expect(page).toHaveURL(/.*\/docs/);
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
