import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

for (const width of [360, 390, 490, 1440]) {
  test(width + 'px rail displays six readable date labels and keeps pause in the header', async ({ page }) => {
    const height = width === 360 ? 800 : width === 390 ? 844 : 1000;
    await page.setViewportSize({ width, height });
    await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
    await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
    await page.goto('/index.html');
    await expect(page.locator('.activity-rail-item')).toHaveCount(6);
    await expect(page.locator('.activity-heading .activity-pause')).toHaveCount(1);
    for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
      await page.evaluate(({ language, theme }) => {
        (window as any).GPBCLanguage.set(language);
        (window as any).Platform.applyTheme(theme);
      }, { language, theme });
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.locator('.activity-rail').evaluate((rail, language) => {
        const box = rail.getBoundingClientRect();
        return {
          fits: rail.scrollWidth <= rail.clientWidth + 1,
          overflow: document.documentElement.scrollWidth > innerWidth,
          items: [...rail.querySelectorAll('button')].map(button => {
            const item = button.getBoundingClientRect();
            const label = button.querySelector('[data-lang="' + language + '"]')!.getBoundingClientRect();
            return { height: item.height, width: item.width,
              centered: getComputedStyle(button).textAlign === 'center',
              fits: button.scrollWidth <= button.clientWidth + 1 && label.left >= item.left && label.right <= item.right + 1,
              inRail: item.left >= box.left && item.right <= box.right + 1 };
          }),
          captionCentered: getComputedStyle(document.querySelector('.activity-theme-caption')!).textAlign === 'center',
          ctaCentered: getComputedStyle(document.querySelector('.activity-cta')!).textAlign === 'center',
        };
      }, language);
      if (width <= 390) expect(geometry.fits).toBe(false);
      if (width === 1440) expect(geometry.fits).toBe(true);
      expect(geometry.overflow).toBe(false);
      expect(geometry.captionCentered && geometry.ctaCentered).toBe(true);
      for (const item of geometry.items) {
        expect(item.fits && item.centered).toBe(true);
        expect(item.height).toBeGreaterThanOrEqual(44);
        if (width === 1440) {
          expect(item.inRail).toBe(true);
          expect(Math.abs(item.width - geometry.items[0].width)).toBeLessThan(1);
        } else {
          expect(item.width).toBeGreaterThanOrEqual(76);
        }
      }
      if (!geometry.fits) {
        const last = page.locator('.activity-rail-item').last();
        await page.locator('.activity-rail-item').first().focus();
        await page.keyboard.press('ArrowLeft');
        await expect(last).toBeFocused();
        await expect(last).toHaveAttribute('aria-current', 'true');
        expect(await last.evaluate(item => {
          const rail = item.parentElement!;
          return rail.scrollLeft > 0 && item.getBoundingClientRect().right <= rail.getBoundingClientRect().right + 1;
        })).toBe(true);
        await page.keyboard.press('ArrowRight');
      }
    }
  });
}
