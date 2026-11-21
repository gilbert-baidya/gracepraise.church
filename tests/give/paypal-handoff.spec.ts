import { test, expect } from '@playwright/test';

const paypalUrl = 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME';

test('giving card explains the PayPal handoff without local amount or purpose controls', async ({ page }) => {
  await page.goto('/give.html');
  const card = page.locator('.give-v14-gift-card');
  await expect(card.locator('input, select, label, [data-amount]')).toHaveCount(0);
  await expect(card.getByText("You'll enter your gift amount securely on PayPal.", { exact: false })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Continue with PayPal', exact: true })).toBeVisible();
  await expect(page.locator('#stripePaymentBtn')).toBeHidden();
  await expect(page.locator('#paypalQR')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bank Transfer / Zelle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy Zelle email' })).toBeVisible();
});

test('PayPal opens the unchanged URL directly without any selection', async ({ page, context }) => {
  const requests: string[] = [];
  const dialogs: string[] = [];
  await context.route('https://www.paypal.com/**', async route => {
    if (route.request().isNavigationRequest() && route.request().resourceType() === 'document') {
      requests.push(route.request().url());
    }
    await route.fulfill({ contentType: 'text/html', body: '<h1>PayPal navigation intercepted</h1>' });
  });
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.goto('/give.html');
  const popupPromise = page.waitForEvent('popup', { timeout: 5000 });
  await page.getByRole('button', { name: 'Continue with PayPal', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(paypalUrl);
  expect(requests).toEqual([paypalUrl]);
  expect(dialogs).toEqual([]);
  await expect(page).toHaveURL(/\/give\.html$/);
  await popup.close();
});

test('mobile note styling stays scoped to the giving card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/give.html');
  const outsideSize = await page.evaluate(() => {
    const parent = document.createElement('div');
    parent.style.fontSize = '40px';
    const note = document.createElement('div');
    note.className = 'give-v14-method-note';
    note.textContent = 'Other method';
    parent.appendChild(note);
    document.body.appendChild(parent);
    return getComputedStyle(note).fontSize;
  });
  expect(outsideSize).toBe('40px');
  await expect(page.locator('.give-v14-gift-card .give-v14-method-note')).toBeVisible();
});

test('configured Stripe button still opens its own intercepted payment link', async ({ page, context }) => {
  const stripeUrl = 'https://buy.stripe.com/review-placeholder';
  await page.route(url => url.pathname === '/donations.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('https://buy.stripe.com/YOUR_LIVE_STRIPE_LINK_HERE', stripeUrl) });
  });
  await context.route('https://buy.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stripe navigation intercepted</h1>' }));
  await page.goto('/give.html');
  const button = page.locator('#stripePaymentBtn');
  await expect(button).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await button.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(stripeUrl);
  await popup.close();
});
