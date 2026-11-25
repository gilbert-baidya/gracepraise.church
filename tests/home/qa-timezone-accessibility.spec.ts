import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'Asia/Dhaka', serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: 'light' });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-27T17:29:59-08:00'));
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.abort());
});

test('Dhaka browser keeps Pacific weekly service dates and rollover boundaries', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => !!(window as any).gpbcCountdown);
  for (const [now, key, expected] of [
    ['2026-11-27T00:00:00-08:00', 'friday-connection', '2026-11-28T01:30:00.000Z'],
    ['2026-11-27T17:29:59-08:00', 'friday-connection', '2026-11-28T01:30:00.000Z'],
    ['2026-11-27T17:30:01-08:00', 'fasting-prayer', '2026-11-28T20:00:00.000Z'],
    ['2026-11-28T11:59:59-08:00', 'fasting-prayer', '2026-11-28T20:00:00.000Z'],
    ['2026-11-28T12:00:01-08:00', 'sunday-service', '2026-11-30T01:00:00.000Z'],
    ['2026-11-29T16:59:59-08:00', 'sunday-service', '2026-11-30T01:00:00.000Z'],
    ['2026-11-29T17:00:01-08:00', 'friday-connection', '2026-12-05T01:30:00.000Z'],
  ]) {
    await page.clock.setFixedTime(new Date(now));
    const actual = await page.evaluate(() => {
      const countdown = (window as any).gpbcCountdown;
      const next = countdown.getNextEvent();
      const weekdays = (window as any).eval('events').filter((event: any) => event.serviceKey)
        .every((event: any) => new Date(event.date + 'T12:00:00Z').getUTCDay() ===
          ({ 'friday-connection': 5, 'friday-worship-practice': 5, 'fasting-prayer': 6, 'sunday-service': 0 } as any)[event.serviceKey]);
      return { key: next.serviceKey, next: next.nextTime.toISOString(), weekdays,
        midnightHour: countdown.getTimeZoneParts(new Date('2026-11-27T00:00:00-08:00'), countdown.timeZone).hour };
    });
    expect(actual).toEqual({ key, next: expected, weekdays: true, midnightHour: 0 });
  }
});

test('Dhaka Plan Visit Google, Apple and Outlook exports use Sunday 17:00 Pacific', async ({ page }) => {
  await page.goto('/plan-visit.html');
  const google = page.locator('#addToGoogleCal');
  await expect(google).toHaveAttribute('href', /ctz=America/);
  const params = new URL((await google.getAttribute('href'))!).searchParams;
  expect(params.get('dates')).toBe('20261129T170000/20261129T183000');
  expect(params.get('ctz')).toBe('America/Los_Angeles');
  expect(params.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=SU');
  for (const id of ['addToAppleCal', 'addToOutlookCal']) {
    const ics = await page.locator('#' + id).evaluate(async (link: HTMLAnchorElement) => (await fetch(link.href)).text());
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20261129T170000\r\n');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU\r\n');
    expect(ics).toContain('BEGIN:VTIMEZONE\r\n');
    expect(ics).not.toMatch(/(?<!\r)\n/);
  }
});

for (const width of [360, 390]) {
  test(width + 'px hidden slides cannot receive tab focus and Home text retains gutters and contrast', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 844 });
    await page.goto('/index.html');
    await expect(page.locator('.activity-rail-item')).toHaveCount(6);
    for (const language of ['en', 'bn']) {
      await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
      await page.evaluate(() => document.fonts.ready);
      for (let index = 0; index < 6; index++) {
        await page.locator('.activity-rail-item').nth(index).click();
        const invalid = await page.locator('.activity-slide[aria-hidden="true"]').evaluateAll(slides =>
          slides.flatMap(slide => [...slide.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]')])
            .filter(control => control.tabIndex >= 0).length);
        expect(invalid).toBe(0);
      }
      await expect(page.locator('.activity-fast-copy')).not.toHaveAttribute('tabindex');
      await expect(page.locator('.activity-stage h2')).toHaveCount(0);
      await expect(page.locator('.activity-stage h3')).toHaveCount(2);
      await page.locator('.activity-rail-item').nth(1).click();
      await expect(page.locator('.activity-slide.is-active a')).toHaveCount(0);
      await expect(page.locator('.activity-cta')).not.toHaveAttribute('tabindex');
      const values = await page.evaluate(() => {
        const gutter = [...document.querySelectorAll('.theological-intro, .event-tagline')].map(element => {
          const range = document.createRange(); range.selectNodeContents(element);
          const bounds = range.getBoundingClientRect();
          return Math.min(bounds.left, document.documentElement.clientWidth - bounds.right);
        });
        const gold = [...document.querySelectorAll('.heptagon-wall-label.active, .heptagon-center-item.active .scripture, .stay-connected-v8__eyebrow, .welcome-home-v4__eyebrow, .welcome-home-v4__closing, .flip-card--come .card-step, .flip-card--build .card-step')]
          .map(element => getComputedStyle(element).color);
        return { gutter, gold };
      });
      expect(values.gutter.every(value => value >= 8)).toBe(true);
      expect(values.gold.every(color => color === 'rgb(128, 91, 8)')).toBe(true);
      const linear = (value: number) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      const luminance = .2126 * linear(128 / 255) + .7152 * linear(91 / 255) + .0722 * linear(8 / 255);
      expect((.75 + .05) / (luminance + .05)).toBeGreaterThanOrEqual(4.5);
    }
  });
}
