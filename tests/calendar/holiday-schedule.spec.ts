import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', timezoneId: 'America/Los_Angeles' });

const names = ['Pre-Christmas Celebration Service', 'Gratitude & New Year Celebration'];
const expected = [
  { name: names[0], date: '2026-12-20', eventTime: '5:00 PM', eventDay: 'Sunday' },
  { name: names[1], date: '2026-12-31', eventTime: '7:00 PM', eventDay: 'Thursday' }
];
const stale = [
  { name: names[0], date: '2026-12-13', eventTime: '5:00 PM', category: 'gpbc' },
  { name: names[1], date: '2026-12-31', eventTime: '10:30 PM', category: 'gpbc' }
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

for (const language of ['en', 'bn']) {
  test(`Home and countdown share approved holiday dates in ${language}`, async ({ page }) => {
    await page.goto('/index.html?lang=' + language);
    await expect.poll(() => page.evaluate(() => Boolean((window as any).gpbcCountdown))).toBe(true);
    const schedule = await page.evaluate(`gpbcCountdown.specialEvents
      .filter(event => ${JSON.stringify(names)}.includes(event.name))
      .map(event => ({ name: event.name, date: event.date, eventTime: event.eventTime, eventDay: event.eventDay, instant: event.dateTime.toISOString() }))`);
    expect(schedule).toEqual(expected.map((event, index) => ({
      ...event, instant: index === 0 ? '2026-12-21T01:00:00.000Z' : '2027-01-01T03:00:00.000Z'
    })));
    const preChristmas = page.locator('[data-flyer="pre-christmas-dec20"] img');
    const gratitude = page.locator('[data-flyer="gratitude-dec31"] img');
    await expect(preChristmas).toHaveAttribute('alt', language === 'bn' ? /২০ ডিসেম্বর ২০২৬.*৫টা/ : /20 December 2026, 5 PM/);
    await expect(gratitude).toHaveAttribute('alt', language === 'bn' ? /৩১ ডিসেম্বর ২০২৬.*৭টা/ : /31 December 2026, 7 PM/);
    await page.clock.setFixedTime(new Date('2026-12-31T18:00:00-08:00'));
    await page.evaluate('gpbcCountdown.updateCountdown(); gpbcCountdown.updateInlineCountdown()');
    expect(await page.evaluate('gpbcCountdown.getNextEvent().time')).toBe('19:00');
    await expect(page.locator('#specialEventBanner .event-label')).toContainText(names[1]);
    await expect(page.locator('#specialEventBanner [data-unit="hours"]')).toHaveText('01');
    await expect(page.locator('#specialEventBanner time')).toHaveAttribute('datetime', '2027-01-01T03:00:00.000Z');
    const structured = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
      scripts.map(script => JSON.parse(script.textContent || '{}')).find(value => value['@type'] === 'Event'));
    expect(structured.startDate).toBe('2026-12-31T19:00:00-08:00');
  });
}

for (const source of ['saved', 'sheet', 'empty sheet', 'failed sheet']) {
  test(`Calendar uses approved holidays with ${source} data`, async ({ page }) => {
    const custom = { name: 'Unrelated custom fellowship', date: '2026-12-15', category: 'gpbc', description: 'Keep this event' };
    if (source === 'saved') {
      await page.addInitScript(({ stale, custom }) => {
        localStorage.setItem('gpbcEventsVersion', '3.1');
        localStorage.setItem('gpbcEvents', JSON.stringify([...stale, custom]));
      }, { stale, custom });
    }
    await page.route('https://script.google.com/**', route =>
      source === 'saved' || source === 'failed sheet' ? route.abort() : route.fulfill({
        json: { events: source === 'empty sheet' ? [] : [...stale, ...expected, custom] },
        headers: { 'access-control-allow-origin': '*' }
      }));
    await page.goto('/calendar.html');
    await expect(page.locator('#currentMonth')).toHaveText('December 2026');
    await expect(page.locator('#monthEvents')).toContainText(names[0]);
    const schedule = await page.evaluate(`events.filter(event => ${JSON.stringify(names)}.includes(event.name))
      .map(({ name, date, eventTime, eventDay }) => ({ name, date, eventTime, eventDay }))`);
    expect(schedule).toEqual(expected);
    await expect(page.locator('#monthEvents .event-item').filter({ hasText: names[0] })).toContainText('Dec 20');
    if (source === 'saved' || source === 'sheet') {
      await expect(page.locator('#monthEvents')).toContainText(custom.name);
    }
    if (source === 'saved') {
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbcEvents') || '[]'));
      expect(saved[0]).toMatchObject(expected[0]);
      expect(saved[1]).toMatchObject(expected[1]);
      expect(saved[2]).toEqual(custom);
    }
  });
}
