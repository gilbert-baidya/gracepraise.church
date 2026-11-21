import { test, expect } from '@playwright/test';
import { CalendarPage } from '../../pages/generated/calendar.page';

test.use({ timezoneId: 'America/Los_Angeles' });

const cspWithoutResponseOrigin = "connect-src 'self' https://script.google.com";
const pr6Csp = `${cspWithoutResponseOrigin} https://script.googleusercontent.com`;
const sheetEvent = { date: '11/25/2026', name: 'Mock Sheets fellowship', category: 'gpbc', description: 'Mock event only' };

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://script.google.com/**', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ action: 'getEvents' });
    await route.fulfill({
      json: { events: [sheetEvent] },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.route(url => url.pathname === '/calendar.html', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': pr6Csp } });
  });
});

test('opens in the current local month and highlights today', async ({ page }) => {
  await page.goto('/calendar.html');
  await new CalendarPage(page).assertCoreReady();
  await expect(page.locator('#currentMonth')).toHaveText('November 2026');
  await expect(page.locator('.calendar-grid .day:not(.other-month)')).toHaveCount(30);
  await expect(page.locator('.calendar-grid .today .day-number')).toHaveText('21');
  await page.reload();
  await expect(page.locator('#currentMonth')).toHaveText('November 2026');
});

test('previous and next months cross the year boundary in both directions', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-21T12:00:00Z'));
  await page.goto('/calendar.html');
  await expect(page.locator('#currentMonth')).toHaveText('December 2026');
  await page.locator('#nextMonth').click();
  await expect(page.locator('#currentMonth')).toHaveText('January 2027');
  await expect(page.locator('.calendar-grid .day:not(.other-month)')).toHaveCount(31);
  await page.locator('#prevMonth').click();
  await expect(page.locator('#currentMonth')).toHaveText('December 2026');
  await page.locator('#prevMonth').click();
  await expect(page.locator('#currentMonth')).toHaveText('November 2026');
  await page.locator('#nextMonth').click();
  await expect(page.locator('#currentMonth')).toHaveText('December 2026');
});

test('heading and metadata stay year-agnostic outside 2026', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-21T12:00:00Z'));
  await page.goto('/calendar.html');
  await expect(page.locator('#currentMonth')).toHaveText('January 2027');
  await expect(page.locator('h1')).toHaveText('Church Calendar');
  await expect(page).toHaveTitle(/^Calendar - /);
  const metadata = await page.locator('meta[name="title"], meta[property="og:title"], meta[name="twitter:title"], meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('content')));
  expect(metadata.every(value => value && !value.includes('2026'))).toBe(true);
});

test('renders mocked Sheets events in the calendar and monthly list', async ({ page }) => {
  await page.goto('/calendar.html');
  await expect(page.locator('.calendar-grid')).toContainText(sheetEvent.name);
  await expect(page.locator('#monthEvents')).toContainText(sheetEvent.name);
});

test('sheet event HTML stays literal in calendar markers, monthly lists and upcoming cards', async ({ page }) => {
  const name = 'Stored-XSS regression <img src=x onerror="window.__calendarXssExecuted=true">';
  await page.addInitScript(() => { (window as any).__calendarXssExecuted = false; });
  await page.route('**/x', route => route.fulfill({ status: 404, body: 'Not an image' }));
  await page.route('https://script.google.com/**', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ action: 'getEvents' });
    await route.fulfill({
      json: { events: [{ ...sheetEvent, name }] },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('/calendar.html');
  for (const selector of ['.calendar-grid .event-marker', '#monthEvents .event-item', '#upcomingEventsList .upcoming-event-card']) {
    const surface = page.locator(selector).filter({ hasText: 'Stored-XSS regression' });
    await expect(surface).toHaveCount(1);
    await expect(surface).toBeVisible();
    await expect(surface).toContainText(name);
    await expect(surface.locator('img')).toHaveCount(0);
    await expect(surface.locator('[onerror]')).toHaveCount(0);
  }
  expect(await page.evaluate(() => (window as any).__calendarXssExecuted)).toBe(false);
});

for (const allowed of [false, true]) {
  test(`Sheets response origin is ${allowed ? 'allowed with PR #6' : 'blocked without PR #6'}`, async ({ page }) => {
    let responseRequests = 0;
    await page.addInitScript(() => {
      (window as any).GOOGLE_SHEETS_URL = 'https://script.googleusercontent.com/calendar-events-test';
    });
    await page.route(url => url.pathname === '/calendar.html', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': allowed ? pr6Csp : cspWithoutResponseOrigin } });
    });
    await page.route('https://script.googleusercontent.com/**', async route => {
      if (['GET', 'POST'].includes(route.request().method())) responseRequests++;
      await route.fulfill({ json: { events: [sheetEvent] }, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': '*',
      } });
    });
    await page.goto('/calendar.html');
    await expect(page.locator('.calendar-grid .day').first()).toBeAttached();
    if (allowed) {
      await expect(page.locator('#upcomingEventsList')).toContainText(sheetEvent.name);
    } else {
      await expect(page.locator('#upcomingEventsList')).not.toContainText(sheetEvent.name);
    }
    expect(responseRequests).toBe(allowed ? 1 : 0);
  });
}

for (const response of ['empty', 'network-error']) {
  test(`current-month calendar remains usable with ${response} Sheets data`, async ({ page }) => {
    await page.route('https://script.google.com/**', route => response === 'empty'
      ? route.fulfill({ json: { events: [] }, headers: { 'access-control-allow-origin': '*' } })
      : route.abort());
    await page.goto('/calendar.html');
    await expect(page.locator('#currentMonth')).toHaveText('November 2026');
    await expect(page.locator('.calendar-grid .day:not(.other-month)')).toHaveCount(30);
    await expect(page.locator('#monthEvents')).not.toContainText(sheetEvent.name);
    await page.locator('#nextMonth').click();
    await expect(page.locator('#currentMonth')).toHaveText('December 2026');
  });
}
