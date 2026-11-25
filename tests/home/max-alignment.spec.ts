import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

for (const width of [360, 390, 490, 1440]) {
  test(width + 'px component geometry stays aligned in English and Bengali', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 360 ? 800 : width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
    await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
    await page.route('https://script.google.com/**', route => route.abort());
    await page.goto('/index.html');
    await expect(page.locator('.activity-rail-item')).toHaveCount(6);
    for (const language of ['en', 'bn']) {
      await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.activity-rail-item').first().click();
      const result = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const center = (selector: string) => { const b = box(selector); return b.left + b.width / 2; };
        const theme = center('.activity-theme h3');
        const footer = center('.activity-footer');
        const header = document.querySelector('.activity-heading h2 [data-lang="' + document.documentElement.lang + '"]')!;
        const headerRange = document.createRange(); headerRange.selectNodeContents(header);
        const link = document.querySelector('.activity-cta')!;
        const label = link.querySelector('[data-lang]:not([hidden])')!;
        const labelRange = document.createRange();
        labelRange.selectNodeContents(label);
        const headings = [...document.querySelectorAll('.sacred-footer .footer-nav-title')].map(element => {
          const range = document.createRange(); range.selectNodeContents(element);
          return range.getClientRects().length;
        });
        const footerFits = [...document.querySelectorAll('.sacred-footer__column .footer-link')].every(element => {
          const bounds = element.getBoundingClientRect();
          const column = element.closest('.sacred-footer__column')!.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return bounds.left >= column.left && bounds.right <= column.right + 1 &&
            text.left >= bounds.left && text.right <= bounds.right + 1;
        });
        const numberAlignment = [...document.querySelectorAll('.visit-v3__expectation-item')].map(item => {
          const title = item.querySelector('h4')!.getBoundingClientRect();
          const copy = item.querySelector('p')!.getBoundingClientRect();
          const mark = item.querySelector('.visit-v3__expectation-mark')!.getBoundingClientRect();
          return Math.max(Math.abs(title.left - copy.left), Math.abs(mark.top - title.top));
        });
        const welcome = box('#about');
        const copy = box('.welcome-home-v4__copy');
        const quote = box('.heptagon-center-item.active');
        const wheel = box('.heptagon-wheel-container');
        return {
          themeDeltas: ['.activity-theme-year', '.activity-theme-subtitle'].map(selector => Math.abs(center(selector) - theme)),
          headerLines: headerRange.getClientRects().length,
          headerFits: headerRange.getBoundingClientRect().right <= box('.activity-counter').left - 2,
          captionDelta: Math.abs(center('.activity-theme-caption') - footer),
          ctaDelta: Math.abs(center('.activity-cta') - footer),
          welcomeDelta: Math.abs(center('.welcome-home-v4__eyebrow') - center('.welcome-home-v4__title')),
          welcomeGutter: Math.min(copy.left - welcome.left, welcome.right - copy.right),
          linkLines: labelRange.getClientRects().length,
          lineBelowCard: box('#home-service-line').top >= box('.activity-carousel').bottom,
          headings, footerFits, numberAlignment,
          wheelFits: quote.top >= wheel.top + 10 && quote.bottom <= wheel.bottom - 20,
        };
      });
      for (const delta of [...result.themeDeltas, result.captionDelta, result.ctaDelta, result.welcomeDelta, ...result.numberAlignment]) {
        expect(delta).toBeLessThanOrEqual(2);
      }
      expect(result.footerFits).toBe(true);
      expect(result.headerLines).toBe(1);
      expect(result.headerFits).toBe(true);
      expect(result.headings.every(lines => lines === 1)).toBe(true);
      expect(result.linkLines).toBe(1);
      expect(result.lineBelowCard).toBe(true);
      if (width < 768) {
        expect(result.welcomeGutter).toBeGreaterThanOrEqual(19);
        expect(result.wheelFits).toBe(true);
        await expect(page.locator('#sacred-focus .eyebrow')).toHaveCSS('white-space', 'nowrap');
        await expect(page.locator('#sacred-focus a[href*="prayer-request.html"]')).toHaveCSS('white-space', 'nowrap');
      }
      await expect(page.locator('.event-header-section .event-detail-icon')).toHaveCount(1);
      await expect(page.locator('.event-info-item .event-detail-icon')).toHaveCount(4);
      await page.locator('[data-activity-focus="dot:gratitude-fast-2027"]').click();
      const fastFits = await page.locator('.activity-fast-copy').evaluate(element => element.scrollHeight <= element.clientHeight + 1);
      expect(fastFits).toBe(true);
    }
  });
}
