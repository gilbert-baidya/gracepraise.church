import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

const cases = [
  ['2026-12-15T12:00:00-08:00', 'pre-christmas-dec20', 'In 5 days', 'আর ৫ দিন'],
  ['2026-12-19T12:00:00-08:00', 'pre-christmas-dec20', 'Tomorrow', 'আগামীকাল'],
  ['2026-12-25T08:00:00-08:00', 'christmas-day', 'Today · 10 AM', 'আজ · সকাল ১০টা'],
  ['2026-12-31T08:00:00-08:00', 'gratitude-dec31', 'Tonight · 7 PM', 'আজ রাতে · সন্ধ্যা ৭টা'],
  ['2026-12-31T19:00:00-08:00', 'gratitude-dec31', 'Today · started 7 PM', 'আজ · সন্ধ্যা ৭টায় শুরু হয়েছে'],
  ['2026-12-31T21:00:00-08:00', 'gratitude-dec31', 'Today · started 7 PM', 'আজ · সন্ধ্যা ৭টায় শুরু হয়েছে'],
  ['2026-12-31T23:59:59-08:00', 'gratitude-dec31', 'Today · started 7 PM', 'আজ · সন্ধ্যা ৭টায় শুরু হয়েছে'],
  ['2026-12-20T17:00:00-08:00', 'pre-christmas-dec20', 'Today · started 5 PM', 'আজ · বিকেল ৫টায় শুরু হয়েছে'],
  ['2026-12-25T10:00:00-08:00', 'christmas-day', 'Today · started 10 AM', 'আজ · সকাল ১০টায় শুরু হয়েছে'],
  ['2027-01-01T12:30:00-08:00', 'new-year-jan1', 'Today · started 10 AM', 'আজ · সকাল ১০টায় শুরু হয়েছে'],
  ['2026-12-20T01:00:00Z', 'pre-christmas-dec20', 'Tomorrow', 'আগামীকাল'],
];

for (const [now, slug, en, bn] of cases) {
  test('Pacific countdown at ' + now, async ({ page }) => {
    await page.clock.setFixedTime(new Date(now));
    await page.goto('/index.html');
    await expect(page.locator('.activity-event-tools:not([hidden]) .activity-countdown')).toHaveCount(0);
    const index = await page.locator('.activity-slide').evaluateAll((slides, slug) => slides.findIndex(slide => (slide as HTMLElement).dataset.activity === slug), slug);
    await page.locator('.activity-rail-item').nth(index).click();
    const tools = page.locator('[data-activity-tools="' + slug + '"]');
    await expect(tools.locator('.activity-countdown [lang="en"]')).toHaveText(en);
    await expect(tools).toHaveAttribute('aria-live', 'off');
    await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
    await expect(tools.locator('.activity-countdown [lang="bn"]')).toBeVisible();
    await expect(tools.locator('.activity-countdown [lang="bn"]')).toHaveText(bn);
    const selected = page.locator('.activity-rail-item[aria-current="true"]');
    const visibleDate = await selected.locator('[data-lang="bn"]').textContent();
    await expect(selected).toHaveAccessibleName(new RegExp(visibleDate!));
  });
}

test('existing boundary timer updates chips and preserves the focused calendar action', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-31T18:59:59-08:00') });
  await page.goto('/index.html');
  await page.locator('.activity-rail-item').nth(1).click();
  const tools = page.locator('[data-activity-tools="gratitude-dec31"]');
  const button = tools.locator('button');
  await button.focus();
  await page.clock.fastForward(1100);
  await expect(tools.locator('.activity-countdown [lang="en"]')).toHaveText('Today · started 7 PM');
  await expect(button).toBeFocused();
  await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
});

test('date rail is the only item selector, scrolls horizontally and supports keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-12-20T09:00:00-08:00'));
  await page.goto('/index.html');
  const rail = page.getByRole('group', { name: 'Activity date timeline' });
  await expect(page.getByRole('button', { name: /^(Previous|Next) slide$/ })).toHaveCount(0);
  await expect(rail.locator('button')).toHaveCount(6);
  await expect(rail.locator('[data-lang="en"]')).toHaveText(['Theme', 'Dec 20', 'Dec 25', 'Dec 31', 'Jan 1', 'Jan 1–27']);
  await expect(rail.locator('button.is-today')).toHaveCount(1);
  await expect(rail.locator('button.is-today [data-lang="en"]')).toHaveText('Dec 20');
  await rail.locator('button').nth(4).click();
  await expect(rail.locator('[aria-current="true"] [data-lang="en"]')).toHaveText('Jan 1');
  expect(await rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press('ArrowLeft');
  await expect(rail.locator('[aria-current="true"]')).toBeFocused();
  await expect(page.locator('.activity-slide.is-active')).toHaveAttribute('data-activity', 'gratitude-dec31');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.clock.setFixedTime(new Date('2026-12-26T09:00:00-08:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(rail.locator('button')).toHaveCount(4);
  await expect(rail.locator('[data-lang="en"]')).toHaveText(['Theme', 'Dec 31', 'Jan 1', 'Jan 1–27']);
});

for (const [index, date, start, title] of [
  [1, '20261220', '170000', 'Pre-Christmas Celebration'],
  [2, '20261225', '100000', 'Christmas Day Worship'],
  [3, '20261231', '190000', 'Year-end Gratitude Service'],
  [4, '20270101', '100000', 'New Year Worship'],
] as const) {
  test('local ICS download: ' + title, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
    await page.route('**/content.json', route => route.fulfill({ json: { church: { address: {
      fullAddress: '1325 Richardson Street, San Bernardino, CA 92408',
    } } } }));
    await page.goto('/index.html');
    await page.locator('.activity-rail-item').nth(index).click();
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.activity-event-tools:not([hidden]) button').click(),
    ]);
    const data = await fs.readFile((await download.path())!, 'utf8');
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    expect(data).not.toMatch(/(?<!\r)\n/);
    expect(data.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
    const unfolded = data.replace(/\r\n /g, '');
    expect(unfolded).toContain('DTSTART;TZID=America/Los_Angeles:' + date + 'T' + start);
    expect(unfolded).not.toMatch(/^(DTEND|DURATION)[;:]/m);
    expect(unfolded).toContain('BEGIN:VTIMEZONE');
    expect(unfolded).toContain('SUMMARY:' + title);
    expect(unfolded).toContain('LOCATION:1325 Richardson Street\\, San Bernardino\\, CA 92408');
    expect(unfolded).toContain('plan-visit.html?lang=en');
    expect(requests).toEqual([]);
  });
}
