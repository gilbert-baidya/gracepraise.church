import { test, expect } from '@playwright/test';

const layouts = [
  ['index', 'liturgical-tokens.css', '#about'],
  ['index', 'hero-upgrade.css', '#home'],
  ['index', 'community-carousel-v5.css', '.community-v5'],
  ['index', 'event-flip-cards.css', '#featured-events'],
  ['index', 'shape-system.css', '.heptagon-wheel-section'],
  ['index', 'heptagon-wheel-sacred.css', '.heptagon-wheel-section'],
  ['index', 'assets/css/homepage-readability-upgrade.css', '#about'],
  ['index', 'css/footer-v3.css', 'footer.site-footer'],
  ['index', 'plan-your-visit-v3.css', '#plan-your-visit'],
  ['index', 'welcome-home-v4.css', '#about'],
  ['index', 'stay-connected-v8.css', '#stay-connected'],
  ['plan-visit', 'redesign-styles.css', 'main'],
  ['plan-visit', 'countdown.css', 'main'],
  ['plan-visit', 'shape-system.css', 'main'],
  ['plan-visit', 'heptagon-wheel-sacred.css', 'main'],
  ['plan-visit', 'css/footer-v3.css', 'footer.site-footer'],
  ['give', 'redesign-styles.css', 'main'],
  ['give', 'css/footer-v3.css', 'footer.site-footer'],
  ['calendar', 'css/footer-v3.css', 'footer.site-footer'],
] as const;

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.route('https://**/*', route => {
    const url = route.request().url();
    if (url.startsWith('https://script.google.com/')) return route.fulfill({ json: { events: [] } });
    if (url.includes('email.min.js')) return route.fulfill({
      contentType: 'application/javascript', body: 'window.emailjs = { init() {}, send() { return Promise.resolve({}); } };',
    });
    if (url.includes('upload-widget.cloudinary.com')) return route.fulfill({
      contentType: 'application/javascript', body: 'window.cloudinary = { createUploadWidget() { return { open() {} }; } };',
    });
    return route.abort();
  });
});

for (const [path, asset, owner] of layouts) {
  test(`${path}: delayed ${asset} cannot paint an unstyled section`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let requested = false;
    await page.route(url => url.pathname === '/' + asset, async route => {
      requested = true;
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    });
    const navigation = page.goto('/' + path + '.html', { waitUntil: 'domcontentloaded' });
    try {
      await expect.poll(() => requested).toBe(true);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => performance.getEntriesByType('paint').filter(entry => entry.name === 'first-contentful-paint').length)).toBe(0);
    } finally {
      release();
      await navigation;
    }
    await expect(page.locator('[data-lazy-href]')).toHaveCount(0);
    await expect(page.locator(`head link[rel="stylesheet"][href^="${asset}"], head link[rel="stylesheet"][href^="./${asset}"]`)).toHaveCount(1);
    await expect(page.locator('.site-footer .sacred-footer__brand-text')).toBeVisible();
    const section = page.locator(owner);
    await expect(section).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations()
        .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map(animation => animation.finished.catch(() => {})));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    const geometry = () => page.locator('header, main > section, footer.site-footer').evaluateAll(nodes =>
      nodes.map(node => {
        const bounds = node.getBoundingClientRect();
        return { height: bounds.height, top: bounds.top + scrollY };
      }));
    const before = await geometry();
    await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    const after = await geometry();
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(after[i].height).toBeCloseTo(before[i].height, 1);
      expect(after[i].top).toBeCloseTo(before[i].top, 1);
    }
  });
}
