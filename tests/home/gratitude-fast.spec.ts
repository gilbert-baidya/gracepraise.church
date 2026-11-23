import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', timezoneId: 'Asia/Dhaka' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

const slug = 'gratitude-fast-2027';
const en = 'A season of fasting only to thank God and bring Him joy for all He did in the past year — not to ask Him for anything.';
const bn = 'বিগত বছরে ঈশ্বর আমাদের জন্য যা কিছু করেছেন, তার জন্য কেবল তাঁকে ধন্যবাদ জানাতে ও সন্তুষ্ট করতে এই উপবাসপর্ব — তাঁর কাছে কিছু চাওয়ার জন্য নয়।';

for (const [now, english, bengali] of [
  ['2026-12-27T12:00:00-08:00', 'Starts in 5 days', 'শুরু হতে আর ৫ দিন'],
  ['2026-12-31T23:59:59-08:00', 'Starts tomorrow', 'আগামীকাল শুরু'],
  ['2027-01-01T00:00:00-08:00', 'Day 1 of 27', 'উপবাসের দিন ১ / ২৭'],
  ['2027-01-14T12:00:00-08:00', 'Day 14 of 27', 'উপবাসের দিন ১৪ / ২৭'],
  ['2027-01-27T23:59:59.999-08:00', 'Day 27 of 27', 'উপবাসের দিন ২৭ / ২৭'],
]) {
  test('Pacific fast chip at ' + now, async ({ page }) => {
    await page.clock.setFixedTime(new Date(now));
    await page.goto('/index.html');
    await page.locator('[data-activity-focus="dot:' + slug + '"]').click();
    const tools = page.locator('[data-activity-tools="' + slug + '"]');
    await expect(tools).toHaveAttribute('aria-live', 'off');
    await expect(tools.locator('.activity-countdown [lang="en"]')).toHaveText(english);
    await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
    await expect(tools.locator('.activity-countdown [lang="bn"]')).toBeVisible();
    await expect(tools.locator('.activity-countdown [lang="bn"]')).toHaveText(bengali);
  });
}

test('upcoming fast follows New Year with bilingual text, date rail and controlled shared CTA', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
  await page.goto('/index.html');
  await expect(page.locator('.activity-slide').nth(4)).toHaveAttribute('data-activity', 'new-year-jan1');
  await expect(page.locator('.activity-slide').nth(5)).toHaveAttribute('data-activity', slug);
  const rail = page.locator('[data-activity-focus="dot:' + slug + '"]');
  await expect(rail.locator('[lang="en"]')).toHaveText('Jan 1–27');
  await rail.click();
  const fast = page.locator('.activity-fast');
  await expect(fast).toBeVisible();
  await expect(fast.locator('h3 [lang="en"]')).toHaveText('Gratitude Fast 2027');
  await expect(fast.locator('.activity-fast-dates [lang="en"]')).toHaveText('January 1 – 27, 2027');
  await expect(fast.locator('.activity-fast-message [lang="en"]')).toHaveText(en);
  const cta = page.locator('.activity-cta');
  await expect(cta).toHaveAttribute('data-gpbc-feature-link', 'pages.planVisit');
  await expect(cta).toHaveAttribute('data-gpbc-surface', 'homepage-cta');
  await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
  await expect(fast).toHaveAttribute('lang', 'bn');
  await expect(fast).toHaveAccessibleName(/কৃতজ্ঞতার উপবাস ২০২৭/);
  await expect(fast.locator('h3 [lang="bn"]')).toHaveText('কৃতজ্ঞতার উপবাস ২০২৭');
  await expect(fast.locator('.activity-fast-message [lang="bn"]')).toBeVisible();
  await expect(fast.locator('.activity-fast-message [lang="bn"]')).toHaveText(bn);
  await expect(fast.locator('.activity-fast-dates [lang="bn"]')).toHaveText('১–২৭ জানুয়ারি, ২০২৭');
  await expect(rail.locator('[lang="bn"]')).toHaveText('১–২৭ জানু');
  await expect(cta).toHaveJSProperty('href', new URL('/plan-visit.html?lang=bn', page.url()).href);
});

test('midnight tick advances the day then expires the fast after January 27 Pacific', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-01-26T23:58:00-08:00') });
  await page.goto('/index.html');
  await page.locator('[data-activity-focus="dot:' + slug + '"]').click();
  const chip = page.locator('[data-activity-tools="' + slug + '"] .activity-countdown [lang="en"]');
  await expect(chip).toHaveText('Day 26 of 27');
  await page.clock.pauseAt(new Date('2027-01-26T23:59:59-08:00'));
  await page.clock.fastForward(1100);
  await expect(chip).toHaveText('Day 27 of 27');
  await page.clock.fastForward(86_400_000);
  await expect(page.locator('.activity-fast')).toHaveCount(0);
  await expect(page.locator('.activity-slide')).toHaveCount(1);
  await expect(page.locator('.activity-controls button')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.activity-fast')).toHaveCount(0);
});

test('a fast alone keeps its localized text and CTA without playback controls', async ({ page }) => {
  await page.route('**/js/home-activities.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() +
      "\nwindow.GPBC_HOME_ACTIVITIES = window.GPBC_HOME_ACTIVITIES.filter(entry => entry.type === 'fast');" });
  });
  await page.clock.setFixedTime(new Date('2027-01-02T12:00:00-08:00'));
  await page.goto('/index.html?lang=bn');
  await expect(page.locator('.activity-slide')).toHaveCount(1);
  await expect(page.locator('.activity-fast')).toHaveAccessibleName(/কৃতজ্ঞতার উপবাস ২০২৭/);
  await expect(page.locator('.activity-rail-item, .activity-pause')).toHaveCount(0);
  await expect(page.locator('.activity-cta')).toBeVisible();
});

test('fast downloads an inclusive all-day calendar event locally', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-02T12:00:00-08:00'));
  await page.goto('/index.html');
  await page.locator('[data-activity-focus="dot:' + slug + '"]').click();
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-activity-tools="' + slug + '"] .activity-calendar').click(),
  ]);
  expect(download.suggestedFilename()).toBe(slug + '.ics');
  const ics = (await fs.readFile((await download.path())!, 'utf8')).replace(/\r\n /g, '');
  expect(ics).toContain('DTSTART;VALUE=DATE:20270101\r\n');
  expect(ics).toContain('DTEND;VALUE=DATE:20270128\r\n');
  expect(ics).toContain('UID:gratitude-fast-2027-2027-01-01@gracepraise.church');
  expect(ics).toContain(en);
  expect(requests).toEqual([]);
});
