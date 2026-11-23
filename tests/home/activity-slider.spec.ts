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

test('unchanged tab return retains nodes, focused control and focus-pause', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/index.html');
  const next = page.locator('.activity-rail-item').nth(1);
  await next.focus();
  const state = await page.evaluate(() => {
    const root = document.querySelector('.activity-carousel');
    const card = document.querySelector('#dynamic-events-container > .special-event-details');
    const focus = document.activeElement;
    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return { root: root === document.querySelector('.activity-carousel'),
      card: card === document.querySelector('#dynamic-events-container > .special-event-details'),
      focus: focus === document.activeElement };
  });
  expect(state).toEqual({ root: true, card: true, focus: true });
  await expect(next).toBeFocused();
  await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
});

test('expiry restores an equivalent control and preserves explicit and focus pause', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date('2026-12-20T23:59:00-08:00'));
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Pause slideshow', exact: true }).click();
  await page.locator('.activity-dot').nth(2).click();
  await page.clock.setFixedTime(new Date('2026-12-21T00:00:00-08:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.activity-slide')).toHaveCount(5);
  await expect(page.locator('[data-activity-focus="dot:christmas-day"]')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Play slideshow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play slideshow', exact: true }).click();
  await page.locator('[data-activity-focus="dot:church-theme"]').focus();
  await page.clock.setFixedTime(new Date('2026-12-26T00:00:00-08:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.activity-slide')).toHaveCount(4);
  await expect(page.locator('[data-activity-focus="dot:church-theme"]')).toBeFocused();
  await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
  await expect(page.getByRole('button', { name: 'Pause slideshow', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('390px flyer fills the card and has one visit action and a visible calendar label in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await page.locator('.activity-dot').nth(1).click();
  const active = page.locator('.event-flyer.is-active');
  const cta = page.locator('.activity-cta');
  const calendar = page.locator('.activity-event-tools:not([hidden]) .activity-calendar');
  expect(await active.locator('img').evaluate(image => {
    const card = image.closest('.activity-carousel')!;
    const style = getComputedStyle(card);
    const insets = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'] as const;
    const contentWidth = card.getBoundingClientRect().width - insets.reduce((sum, edge) => sum + parseFloat(style[edge]), 0);
    return Math.abs(contentWidth - image.getBoundingClientRect().width);
  })).toBeLessThan(0.5);
  await expect(active.getByRole('link')).toHaveCount(0);
  await expect(page.locator('#home-service-line a')).toBeHidden();
  for (const language of ['en', 'bn']) {
    await page.evaluate(lang => (window as any).GPBCLanguage.set(lang), language);
    await expect(cta).toHaveJSProperty('href', new URL('/plan-visit.html?lang=' + language, page.url()).href);
    for (const control of [cta, calendar]) {
      const label = control.locator('[data-lang="' + language + '"]');
      await expect(label).toBeVisible();
      expect((await label.boundingBox())!.width).toBeGreaterThan(20);
      await expect(control).toHaveCSS('text-decoration-line', 'none');
    }
  }
});

for (const script of ['events.js', 'js/home-activities.js', 'js/activity-carousel.js', 'homepage-events.js']) {
  test(`delayed ${script} does not block parsing and keeps the reserved frame stable`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/' + script + '*', async route => { await gate; await route.continue(); });
    const navigation = page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    try {
      await expect(page.locator('#featured-events')).toBeAttached();
      await expect(page.locator('#home-activities .activity-theme')).toContainText('Rooted in Christ');
      await expect(page.locator('.activity-carousel')).toHaveAttribute('data-enhanced', 'false');
      const firstTheme = await page.locator('.activity-theme').elementHandle();
      const cta = page.locator('.activity-cta');
      const initialCTA = await cta.isVisible() ? cta : page.locator('#home-service-line a');
      await initialCTA.focus();
      await expect(initialCTA).toBeFocused();
      const scripts = await page.locator('head script[src]').evaluateAll(nodes => nodes
        .filter(node => /\/(events|home-activities|activity-carousel|homepage-events)\.js(?:\?|$)/.test((node as HTMLScriptElement).src))
        .map(node => ({ path: new URL((node as HTMLScriptElement).src).pathname, defer: (node as HTMLScriptElement).defer })));
      expect(scripts).toEqual(['events.js', 'js/home-activities.js', 'js/activity-carousel.js', 'homepage-events.js']
        .map(path => ({ path: '/' + path, defer: true })));
      const geometry = () => page.evaluate(() => {
        const container = document.getElementById('home-activities')!.getBoundingClientRect();
        const following = document.getElementById('home')!.getBoundingClientRect();
        return { height: container.height, following: following.top - container.top };
      });
      const before = await geometry();
      expect(before.height).toBeGreaterThan(300);
      release();
      await navigation;
      await expect(page.locator('.activity-carousel')).toHaveAttribute('data-enhanced', 'true');
      await expect(page.locator('.activity-slide')).toHaveCount(6);
      expect(await firstTheme!.evaluate(element => element === document.querySelector('.activity-theme'))).toBe(true);
      await expect(page.locator('.activity-cta')).toBeFocused();
      await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
      const after = await geometry();
      expect(Math.abs(after.height - before.height)).toBeLessThan(.5);
      expect(Math.abs(after.following - before.following)).toBeLessThan(.5);
    } finally { release(); await navigation; }
  });
}

test('phone keeps visit focus when the carousel replaces the service-line action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/homepage-events.js?*', async route => { await gate; await route.continue(); });
  const navigation = page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  const serviceLink = page.locator('#home-service-line a');
  try {
    await expect(serviceLink).toBeVisible();
    await serviceLink.focus();
    await expect(serviceLink).toBeFocused();
    release();
    await navigation;
    await expect(serviceLink).toBeHidden();
    await expect(page.locator('.activity-cta')).toBeFocused();
  } finally { release(); await navigation; }
});

test('activities lead main, followed by the slim service line and unchanged welcome', async ({ page }) => {
  await page.goto('/index.html');
  expect(await page.locator('main').evaluate(main => [...main.children].slice(0, 3).map(child => child.id)))
    .toEqual(['home-activities', 'home-service-line', 'home']);
  await expect(page.locator('#dynamic-events-container .activity-carousel')).toHaveCount(0);
  await expect(page.locator('#home #hero-heading')).toContainText('A place to belong.');
  await expect(page.locator('#home .visit-summary-time [data-lang="en"]')).toContainText('Sunday · 5:00 PM');
});

test.describe('static Home activities', () => {
  test.use({ javaScriptEnabled: false });
  test('theme and Visit link paint without JS; skip link targets main', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#home-activities .activity-theme h3')).toBeVisible();
    await expect(page.locator('#home-activities .activity-theme h3')).toContainText('Rooted in Christ');
    await expect(page.locator('.activity-carousel')).toHaveAttribute('data-enhanced', 'false');
    await expect(page.locator('.activity-cta')).toHaveAttribute('href', 'plan-visit.html?lang=en');
    await expect(page.locator('.activity-controls button')).toHaveCount(0);
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('mobile service-line visit link is the only visible CTA without JavaScript', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await expect(page.locator('#home-service-line a')).toBeVisible();
    await expect(page.locator('.activity-cta')).toBeHidden();
  });
});

for (const language of ['en', 'bn']) {
  test('mobile service-line CTA falls back without changing height: ' + language, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/homepage-events.js?*', async route => { await gate; await route.continue(); });
    const navigation = page.goto('/index.html?lang=' + language);
    const line = page.locator('#home-service-line');
    const service = line.locator('a');
    const carousel = page.locator('.activity-carousel');
    const cta = carousel.locator('.activity-cta');
    try {
      await expect(carousel).toHaveAttribute('data-enhanced', 'false');
      await expect(service).toBeVisible();
      await expect(cta).toBeHidden();
      const before = (await line.boundingBox())!.height;
      release();
      await navigation;
      await expect(carousel).toHaveAttribute('data-enhanced', 'true');
      await expect(cta).toBeVisible();
      await expect(service).toBeHidden();
      expect((await line.boundingBox())!.height).toBeCloseTo(before, 1);
      await cta.evaluate((button: HTMLElement) => { button.hidden = true; });
      await expect(cta).toBeHidden();
      await expect(service).toBeVisible();
      expect((await line.boundingBox())!.height).toBeCloseTo(before, 1);
      await expect(service).toHaveJSProperty('href', new URL('/plan-visit.html?lang=' + language, page.url()).href);
    } finally { release(); await navigation; }
  });
}

test('theme is first, bilingual and entirely swappable through its config', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.activity-slide')).toHaveCount(6);
  await expect(page.locator('.activity-slide').first()).toContainText('Rooted in Christ');
  await expect(page.locator('.activity-theme-subtitle [data-lang="en"]')).toHaveText('2026 Church Theme');
  await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
  await expect(page.locator('.activity-theme-subtitle [lang="bn"]')).toBeVisible();
  await expect(page.locator('.activity-theme-subtitle [lang="bn"]')).toHaveText('২০২৬ মণ্ডলীর থিম');
  expect(await page.locator('.activity-heading h2').evaluate(heading => {
    const bounds = heading.getBoundingClientRect();
    const frame = document.querySelector('.activity-carousel')!.getBoundingClientRect();
    const stage = document.querySelector('.activity-stage')!.getBoundingClientRect();
    return bounds.top >= frame.top && bounds.bottom <= stage.top;
  })).toBe(true);
  await configure(page, `window.GPBC_HOME_ACTIVITIES[0] = {
    type: 'theme', slug: 'next-theme', year: 2027, title: { en: 'Next approved theme' },
    text: { en: 'Church Theme', bn: 'মণ্ডলীর থিম' }, image: null, showUntil: null
  };`);
  await page.goto('/index.html?lang=en');
  await expect(page.locator('.activity-slide').first()).toContainText('Next approved theme');
  await expect(page.locator('.activity-theme-subtitle [data-lang="en"]')).toHaveText('2027 Church Theme');
});

test('timeline, keyboard and swipe control one accessible slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  const root = page.locator('.activity-carousel');
  const active = page.locator('.activity-slide.is-active');
  await expect(root).toHaveAttribute('aria-roledescription', 'carousel');
  await root.locator('.activity-rail-item').nth(1).click();
  await expect(active).toHaveAttribute('data-activity', 'pre-christmas-dec20');
  await root.locator('.activity-rail-item').first().click();
  await expect(active).toHaveAttribute('data-activity', 'church-theme');
  await root.getByRole('button', { name: 'Slide 3 of 6: Dec 25 · Christmas Day', exact: true }).click();
  await expect(active).toHaveAttribute('data-activity', 'christmas-day');
  await expect(page.locator('.activity-dot[aria-current="true"]')).toHaveAccessibleName('Slide 3 of 6: Dec 25 · Christmas Day');
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
  const calendar = root.getByRole('button', { name: 'Add to calendar' });
  await calendar.focus();
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
  await configure(page, "window.GPBC_HOME_ACTIVITIES = window.GPBC_HOME_ACTIVITIES.filter(entry => entry.type !== 'fast');");
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00-08:00'));
  await page.goto('/index.html');
  await expect(page.locator('.activity-slide')).toHaveCount(2);
  await expect(page.locator('.activity-rail-item')).toHaveCount(2);
  await page.clock.setFixedTime(new Date('2027-01-02T00:00:00-08:00'));
  await page.reload();
  await expect(page.locator('.activity-slide')).toHaveCount(1);
  await expect(page.locator('.activity-controls button')).toHaveCount(0);
  await expect(page.locator('.activity-carousel')).toHaveAttribute('data-playing', 'false');
  await configure(page, "window.GPBC_HOME_ACTIVITIES = window.GPBC_HOME_ACTIVITIES.filter(entry => entry.type !== 'fast'); window.GPBC_HOME_ACTIVITIES[0].showUntil = '2026-12-31';");
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
    expect(await page.locator('.activity-theme h3').evaluate(element => getComputedStyle(element).color)).toBe('rgb(255, 245, 222)');
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
