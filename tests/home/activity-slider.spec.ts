import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function configure(page: Page, code: string) {
  await page.route('**/js/home-activities.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\n' + code });
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

test('theme is first, bilingual and entirely swappable through its config', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.activity-slide')).toHaveCount(5);
  await expect(page.locator('.activity-slide').first()).toContainText('Rooted in Christ');
  await expect(page.locator('.activity-theme-subtitle [data-lang="en"]')).toHaveText('2026 Church Theme');
  await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
  await expect(page.locator('.activity-theme-subtitle [lang="bn"]')).toBeVisible();
  await expect(page.locator('.activity-theme-subtitle [lang="bn"]')).toHaveText('২০২৬ মণ্ডলীর থিম');
  await configure(page, `window.GPBC_HOME_ACTIVITIES[0] = {
    type: 'theme', slug: 'next-theme', year: 2027, title: { en: 'Next approved theme' },
    text: { en: 'Church Theme', bn: 'মণ্ডলীর থিম' }, image: null, showUntil: null
  };`);
  await page.goto('/index.html?lang=en');
  await expect(page.locator('.activity-slide').first()).toContainText('Next approved theme');
  await expect(page.locator('.activity-theme-subtitle [data-lang="en"]')).toHaveText('2027 Church Theme');
});

test('previous, next, dots, keyboard and swipe control one accessible slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  const root = page.locator('.activity-carousel');
  const active = page.locator('.activity-slide.is-active');
  await expect(root).toHaveAttribute('aria-roledescription', 'carousel');
  await root.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await root.getByRole('button', { name: 'Previous slide', exact: true }).click();
  await expect(active).toHaveAttribute('data-activity', 'church-theme');
  await root.getByRole('button', { name: 'Slide 3 of 5: Christmas Day', exact: true }).click();
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
  await expect(page.locator('.activity-dot[aria-current="true"]')).toHaveAccessibleName('Slide 3 of 5: Christmas Day');
  await root.focus();
  await page.keyboard.press('ArrowRight');
  await expect(active).toHaveAttribute('data-activity', 'gratitude-dec31');
  await page.keyboard.press('ArrowLeft');
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
  const stage = page.locator('.activity-stage');
  const swipe = async (start: number, end: number) => stage.evaluate((element, { start, end }) => {
    for (const [type, clientX] of [['touchstart', start], ['touchend', end]] as const) {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientX, clientY: 100 }] });
      element.dispatchEvent(event);
    }
  }, { start, end });
  await swipe(280, 100);
  await expect(active).toHaveAttribute('data-activity', 'gratitude-dec31');
  await swipe(100, 280);
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
  for (const slide of await page.locator('.activity-slide:not(.is-active)').all()) {
    await expect(slide).toHaveAttribute('inert', '');
    await expect(slide).toHaveAttribute('aria-hidden', 'true');
  }
  const artLink = active.locator('a');
  await artLink.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[inert]')))).toBe(false);
});

test('autoplay, explicit pause, hover, focus and live announcements stay synchronized', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-12-01T12:00:00-08:00') });
  await page.goto('/index.html');
  await page.clock.pauseAt(new Date('2026-12-01T12:00:05-08:00'));
  const root = page.locator('.activity-carousel');
  const stage = page.locator('.activity-stage');
  const active = page.locator('.activity-slide.is-active');
  await expect(root).toHaveAttribute('data-playing', 'true');
  await expect(stage).toHaveAttribute('aria-live', 'off');
  await page.clock.fastForward(7000);
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await root.hover();
  await expect(root).toHaveAttribute('data-playing', 'false');
  await expect(stage).toHaveAttribute('aria-live', 'polite');
  await page.clock.fastForward(14000);
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await page.mouse.move(0, 0);
  await root.focus();
  await page.clock.fastForward(14000);
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await root.getByRole('button', { name: 'Pause slideshow', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Play slideshow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await page.clock.fastForward(14000);
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await root.getByRole('button', { name: 'Play slideshow', exact: true }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await expect(root).toHaveAttribute('data-playing', 'true');
  await page.clock.fastForward(7000);
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await expect(root.getByRole('button', { name: 'Slideshow paused for reduced motion' })).toBeDisabled();
  expect(await active.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.clock.fastForward(14000);
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
});

test('theme plus one flyer has controls, theme alone does not, and zero removes the carousel', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00-08:00'));
  await page.goto('/index.html');
  await expect(page.locator('.activity-slide')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Next slide', exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date('2027-01-02T00:00:00-08:00'));
  await page.reload();
  await expect(page.locator('.activity-slide')).toHaveCount(1);
  await expect(page.locator('.activity-controls button')).toHaveCount(0);
  await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
  await configure(page, "window.GPBC_HOME_ACTIVITIES[0].showUntil = '2026-12-31';");
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00-08:00'));
  await page.reload();
  await expect(page.locator('.activity-slide')).toHaveCount(1);
  await expect(page.locator('.activity-slide')).toHaveAttribute('data-activity', 'new-year-jan1');
  await expect(page.locator('.activity-controls button')).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2027-01-02T00:00:00-08:00'));
  await page.reload();
  await expect(page.locator('.activity-carousel')).toHaveCount(0);
});

for (const width of [390, 1440]) {
  test(`${width}px keeps the frame and following content fixed across every slide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.locator('.activity-carousel').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + .5);
    expect(await page.locator('.activity-theme').evaluate(element => getComputedStyle(element).backgroundImage)).toContain('gradient');
    expect(await page.locator('.activity-theme h2').evaluate(element => getComputedStyle(element).color)).toBe('rgb(255, 245, 222)');
    const geometry = () => page.evaluate(() => {
      const stage = document.querySelector('.activity-stage')!.getBoundingClientRect();
      return { width: stage.width, height: stage.height, following: document.getElementById('featured-events')!.getBoundingClientRect().top + scrollY };
    });
    const before = await geometry();
    expect(before.width / before.height).toBeCloseTo(width < 768 ? .8 : 8 / 3, 2);
    for (let index = 0; index < 5; index++) {
      await page.locator('.activity-dot').nth(index).click();
      const after = await geometry();
      expect(Math.abs(after.height - before.height)).toBeLessThan(.5);
      expect(Math.abs(after.following - before.following)).toBeLessThan(.5);
    }
  });
}
