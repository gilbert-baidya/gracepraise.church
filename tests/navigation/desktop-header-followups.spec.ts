import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
});

for (const width of [1025, 1440]) {
  for (const route of ['about', 'bible-reader']) {
    test(`desktop ${route} header follows the standard theme and layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
        await page.goto(`/${route}.html?lang=${language}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.dataset.drawerStyles === 'ready');
        const header = page.locator('header[data-gpbc-drawer]');
        const toggle = header.locator('#darkModeToggle');
        await expect(toggle.locator('svg')).toHaveCount(2);
        await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        if (route === 'about') {
          const palette = await header.evaluate(element => {
            const probe = document.createElement('span');
            element.append(probe);
            probe.style.backgroundColor = 'var(--theme-bg-page)';
            probe.style.color = 'var(--theme-text-primary)';
            const expected = { background: getComputedStyle(probe).backgroundColor, text: getComputedStyle(probe).color };
            probe.remove();
            return expected;
          });
          await expect(header).toHaveCSS('background-color', palette.background);
          await expect(header.locator('.nav-links > li > a').first()).toHaveCSS('color', palette.text);
        } else {
          const geometry = await header.evaluate(element => {
            const box = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
            const toggle = box('#darkModeToggle'), logo = box('.logo');
            const intersects = (a: DOMRect, b: DOMRect) =>
              a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            return {
              rightGap: innerWidth - toggle.right, top: toggle.top, logoTop: logo.top,
              width: toggle.width, height: toggle.height, logoOverlap: intersects(toggle, logo),
              linkOverlap: [...element.querySelectorAll('.nav-links > li > a')]
                .some(link => intersects(toggle, link.getBoundingClientRect())),
            };
          });
          expect(geometry.rightGap).toBeGreaterThanOrEqual(0);
          expect(geometry.rightGap).toBeLessThanOrEqual(100);
          expect(geometry.top).toBeLessThanOrEqual(geometry.logoTop);
          expect(geometry.width).toBeGreaterThanOrEqual(44);
          expect(geometry.height).toBeGreaterThanOrEqual(44);
          expect(geometry.logoOverlap).toBe(false);
          expect(geometry.linkOverlap).toBe(false);
        }
      }
    });
  }
}
