import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const paypalUrl = 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME';

test('one-time is the only offered frequency, with one exact PayPal destination', async ({ page }) => {
  await page.goto('/give.html');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Gift frequency' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'One time', exact: true })).toBeChecked();
  await expect(page.getByRole('radio')).toHaveCount(1);
  await expect(page.locator('#giving-card').getByText(/monthly/i)).toHaveCount(0);
  await expect(page.locator('#giving-card input:not([type="radio"]), #giving-card select, #giving-card textarea')).toHaveCount(0);
  await expect(page.locator('#give-paypal')).toHaveAttribute('href', paypalUrl);
  await expect(page.locator('#give-paypal')).not.toHaveAttribute('target');
  await expect(page.locator('#give-confirmation')).toHaveText('You’ll review and confirm your gift on PayPal.');
  await expect(page.getByRole('link', { name: 'Receipts & giving help' })).toHaveAttribute('href', 'mailto:info@gracepraise.church');
  await expect(page.locator('.give-action-column > .give-receipts')).toBeVisible();
  await expect(page.locator('#stripePaymentBtn, #paypalQR')).toHaveCount(0);
});

test('PayPal handoff is intercepted in the same tab with no invented parameters', async ({ page, context }) => {
  const requests: string[] = [];
  await context.route('https://www.paypal.com/**', async route => {
    requests.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<h1>Intercepted provider handoff; no payment</h1>' });
  });
  await page.goto('/give.html');
  await page.getByRole('link', { name: 'Continue to PayPal' }).click();
  await expect(page).toHaveURL(paypalUrl);
  expect(requests).toEqual([paypalUrl]);
  expect(context.pages()).toHaveLength(1);
  await page.goBack();
  await expect(page.locator('#give-status')).toContainText('Check PayPal before retrying');
  await expect(page.getByRole('radio')).toBeChecked();
  await expect(page.locator('#give-return')).toHaveAttribute('href', '/give.html?frequency=once&lang=en#giving-card');
  await page.reload();
  await expect(page.locator('#give-status')).toContainText('Check PayPal before retrying');
});

test('opening prevents duplicates and restores an unconfirmed action if handoff fails', async ({ page, context }) => {
  let requests = 0;
  await context.route('https://www.paypal.com/**', async route => {
    requests++;
    await route.fulfill({ status: 204, body: '' });
  });
  await page.goto('/give.html');
  await page.clock.install();
  const state = await page.locator('#give-paypal').evaluate(link => {
    (link as HTMLAnchorElement).click();
    (link as HTMLAnchorElement).click();
    return { disabled: link.getAttribute('aria-disabled'), label: link.textContent };
  });
  expect(state.disabled).toBe('true');
  expect(state.label).toContain('Opening PayPal…');
  await expect.poll(() => requests).toBe(1);
  await expect(page.locator('#give-paypal')).toHaveAttribute('aria-disabled', 'true');
  await page.clock.fastForward(8100);
  await expect(page.locator('#give-paypal')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('#give-action-label')).toHaveText('Continue to PayPal');
  await expect(page.locator('#give-status')).toContainText('Check PayPal before retrying');
  expect(requests).toBe(1);
  await expect(page).toHaveURL(/\/give\.html$/);
});

test('unconfirmed return survives blocked storage and a fresh reload', async ({ page, context }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await context.route('https://www.paypal.com/**', route => route.fulfill({
    contentType: 'text/html', body: '<h1>Intercepted; no payment</h1>'
  }));
  await page.goto('/give.html');
  await page.getByRole('link', { name: 'Continue to PayPal' }).click();
  await expect(page).toHaveURL(paypalUrl);
  await page.goBack();
  await page.reload();
  await expect(page.locator('#give-status')).toContainText('Check PayPal before retrying');
  await expect(page.getByRole('radio')).toBeChecked();
});

test('legacy saved monthly intent never silently reaches one-time checkout', async ({ page, context }) => {
  const requests: string[] = [];
  await context.route('https://www.paypal.com/**', async route => {
    requests.push(route.request().url());
    await route.fulfill({ body: 'Intercepted; no payment' });
  });
  await page.addInitScript(() => sessionStorage.setItem('gpbc-give-handoff', JSON.stringify({ frequency: 'monthly' })));
  await page.goto('/give.html?lang=en');
  await expect(page.getByRole('radio')).not.toBeChecked();
  await expect(page.locator('#give-cadence-title')).toHaveText('Monthly giving is being set up');
  await expect(page.locator('#give-paypal')).toHaveAttribute('href', 'mailto:info@gracepraise.church');
  await expect(page.locator('#give-action-label')).toHaveText('Ask about monthly giving');
  await page.locator('#give-language').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('#give-paypal')).toHaveAttribute('href', 'mailto:info@gracepraise.church');
  await page.locator('#darkModeToggle').click();
  await page.reload();
  await expect(page.locator('#give-paypal')).toHaveAttribute('href', 'mailto:info@gracepraise.church');
  await expect(page.getByRole('radio')).not.toBeChecked();
  await page.getByRole('radio').check();
  await expect(page.locator('#give-paypal')).toHaveAttribute('href', paypalUrl);
  expect(requests).toEqual([]);
});

test('Netlify routes monthly intent to contact for every Give URL', () => {
  const rules = readFileSync('netlify.toml', 'utf8').split('[[redirects]]').slice(1);
  for (const path of ['/give.html', '/give', '/give/']) {
    const rule = rules.find(block => block.match(/^\s*from\s*=\s*"([^"]+)"/m)?.[1] === path);
    expect(rule, `Missing monthly rule for ${path}`).toBeDefined();
    expect(rule).toMatch(/^\s*to\s*=\s*"\/give-monthly\.html"\s*$/m);
    expect(rule).toMatch(/^\s*status\s*=\s*302\s*$/m);
    expect(rule).toMatch(/^\s*force\s*=\s*true\s*$/m);
    expect(rule).toMatch(/^\s*query\s*=\s*\{\s*frequency\s*=\s*"monthly"\s*\}\s*$/m);
  }
});

test('monthly contact destination works without JavaScript on a static server', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests: string[] = [];
  await context.route('https://www.paypal.com/**', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  const response = await page.goto('/give-monthly.html?frequency=monthly&lang=bn');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/give-monthly\.html(?:\?|$)/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Monthly giving is being set up');
  await expect(page.getByRole('link', { name: 'Ask about monthly giving' })).toHaveAttribute('href', 'mailto:info@gracepraise.church');
  await expect(page.locator('a[href*="paypal.com"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Make a one-time gift instead' })).toHaveAttribute('href', 'give.html?frequency=once');
  expect(requests).toEqual([]);
  await context.close();
});

test('untrusted success, pending and cancel parameters do not confirm a payment', async ({ page }) => {
  for (const query of ['status=completed', 'pending=1', 'cancel=1']) {
    await page.goto('/give.html?' + query);
    await expect(page.locator('#give-status')).toHaveText(/could not be confirmed.*Check PayPal before retrying/);
    await expect(page.locator('#give-return')).toBeVisible();
    await expect(page.locator('#give-paypal')).toHaveAttribute('href', paypalUrl);
  }
});

test('locale works with blocked storage and preserves focus, URL and theme', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/give.html?source=church&lang=invalid#giving-card');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#darkModeToggle').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  const toggle = page.locator('#give-language');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toBeFocused();
  await expect(page).toHaveURL(/source=church&lang=bn#giving-card$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  await expect(page.locator('#give-action-label')).toHaveText('পেপ্যালে এগিয়ে যান');
  await expect(page.locator('#give-confirmation')).toHaveAttribute('lang', 'bn');
  await expect(page.getByRole('radio')).toBeChecked();
});

test('saved locale fallback, corrupt session state and native keyboard controls are safe', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gpbc-language', 'bn');
    sessionStorage.setItem('gpbc-give-handoff', '{bad-json');
  });
  await page.goto('/give.html?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/give.html?lang=invalid');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  const radio = page.getByRole('radio');
  await radio.focus();
  await radio.press('ArrowRight');
  await expect(radio).toBeChecked();
  await expect(radio).toHaveCSS('outline-width', '3px');
  await expect(radio).toHaveCSS('outline-offset', '3px');
  await radio.press('Tab');
  await expect(page.locator('#give-paypal')).toBeFocused();
});

test('giving reflows in both languages/themes and keeps the phone action above the fold', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const language of ['en', 'bn']) {
      await page.goto('/give.html?lang=' + language);
      await page.evaluate(() => document.fonts.ready);
      if (language === 'bn') {
        for (const selector of ['#give-cadence-title', '#gift-title', '.give-note blockquote p']) {
          await expect(page.locator(selector)).toHaveCSS('font-family', '"Noto Sans Bengali", sans-serif');
        }
      }
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => {
          document.documentElement.dataset.theme = value;
          document.body.dataset.theme = value;
          document.body.classList.toggle('dark', value === 'dark');
        }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), width + language + theme).toBeLessThanOrEqual(1);
        if (width === 390) {
          const action = await page.locator('#give-paypal').boundingBox();
          expect(action!.y + action!.height, language + theme).toBeLessThanOrEqual(844);
        }
        await expect(page.locator('#give-paypal')).toHaveCSS('color', 'rgb(16, 32, 51)');
        await expect(page.locator('#give-paypal')).toHaveCSS('background-color', 'rgb(230, 184, 78)');
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/give.html?lang=bn');
  await page.addStyleTag({ content: 'main { zoom: 2; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('#give-paypal').focus();
  await expect(page.locator('#give-paypal')).toBeInViewport();
});

test('without JavaScript the one-time provider link and help remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/give.html');
  await expect(page.getByRole('radio')).toBeChecked();
  await expect(page.getByRole('link', { name: 'Continue to PayPal' })).toHaveAttribute('href', paypalUrl);
  await expect(page.getByRole('link', { name: 'Receipts & giving help' })).toBeVisible();
  await context.close();
});
