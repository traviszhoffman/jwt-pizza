import { test, expect } from 'playwright-test-coverage';

//this needs to be set up so that you can't reregister with the same user. test shouldn't be passing its a bug that needs to be fixed.
test('reregister with same user', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('bob');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('bob@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('monkeypie');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('link', { name: 'b', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'b', exact: true }).click();
  await expect(page.getByText('bob@gmail.com')).toBeVisible();
});

test('register new user', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const email = `bob${randomSuffix}@gmail.com`;

  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('bob');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('monkeypie');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('link', { name: 'b', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'b', exact: true }).click();
  await expect(page.getByText(email)).toBeVisible();
});

test('login', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // const randomSuffix = Math.random().toString(36).substring(2, 7);
  // const email = `bob${randomSuffix}@gmail.com`;

  // await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  // await page.getByRole('link', { name: 'Register' }).click();
  // await page.getByRole('textbox', { name: 'Full name' }).click();
  // await page.getByRole('textbox', { name: 'Full name' }).fill('bob');
  // await page.getByRole('textbox', { name: 'Email address' }).click();
  // await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  // await page.getByRole('textbox', { name: 'Password' }).click();
  // await page.getByRole('textbox', { name: 'Password' }).fill('monkeypie');
  // await page.getByRole('button', { name: 'Register' }).click();
  // await expect(page.getByRole('link', { name: 'b', exact: true })).toBeVisible();
  // await page.getByRole('link', { name: 'b', exact: true }).click();
  // await expect(page.getByText(email)).toBeVisible();

  
});