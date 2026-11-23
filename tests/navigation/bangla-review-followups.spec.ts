import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

for (const width of [1440, 1024]) {
  test('Home visit crop is language-independent at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/index.html?lang=en');
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    const heights: number[] = [];
    for (const language of ['en', 'bn', 'en']) {
      await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.locator('.visit-v3__visual').evaluate(element => {
        const visual = element.getBoundingClientRect();
        const image = element.querySelector('img')!;
        const box = image.getBoundingClientRect();
        return { height: box.height, ratio: visual.width / visual.height, align: getComputedStyle(element).alignSelf,
          fit: getComputedStyle(image).objectFit, right: box.right, visualRight: visual.right };
      });
      expect(geometry.align).toBe('start');
      expect(geometry.ratio).toBeCloseTo(6 / 7, 2);
      expect(geometry.fit).toBe('cover');
      expect(geometry.right).toBeLessThanOrEqual(geometry.visualRight);
      if (width === 1440) {
        expect(geometry.height).toBeGreaterThan(720);
        expect(geometry.height).toBeLessThan(740);
      }
      heights.push(geometry.height);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  });
}

for (const route of ['about', 'contact', 'ministries']) {
  test(route + ' footer uses bundled Bengali fonts without clipped columns', async ({ page }) => {
    for (const width of [1024, 1025]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/' + route + '.html?lang=bn');
      await expect(page.locator('.sacred-footer .footer-nav-title').first()).toHaveAttribute('lang', 'bn');
      await page.evaluate(() => document.fonts.ready);
      const result = await page.locator('.sacred-footer').evaluate(footer => {
        const elements = [...footer.querySelectorAll('.sacred-footer__column :is(.footer-nav-title, .footer-link)')];
        return {
          loaded: document.fonts.check('600 16px "Noto Sans Bengali"', 'বাংলা'),
          families: elements.map(element => getComputedStyle(element).fontFamily),
          overflow: elements.filter(element => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const column = element.closest('.sacred-footer__column')!.getBoundingClientRect();
            return [...range.getClientRects()].some(rect => rect.width && (rect.left < column.left - 1 || rect.right > column.right + 1));
          }).map(element => element.textContent),
          width: document.documentElement.scrollWidth,
        };
      });
      expect(result.loaded).toBe(true);
      expect(result.families.length).toBeGreaterThan(10);
      expect(result.families.every(family => family.startsWith('"Noto Sans Bengali"'))).toBe(true);
      expect(result.overflow).toEqual([]);
      expect(result.width).toBeLessThanOrEqual(width);
    }
  });
}

test('About labels retain main English size and ink after a Bengali round trip', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/about.html?lang=en');
    const summary = page.locator('.about-beliefs summary').first();
    const label = summary.locator('[data-bangla-text]');
    await expect(label).toHaveText('The Bible');
    for (const language of ['en', 'bn', 'en']) {
      await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
      await expect(label).toHaveAttribute('lang', language);
      const styles = await summary.evaluate(element => {
        const label = element.querySelector('[data-bangla-text]')!;
        const number = element.querySelector('.about-belief-number')!;
        return { labelSize: getComputedStyle(label).fontSize, color: getComputedStyle(label).color,
          numberSize: getComputedStyle(number).fontSize };
      });
      expect(parseFloat(styles.labelSize)).toBeCloseTo(width === 390 ? 16 : 17.28, 2);
      expect(styles.color).toBe('rgb(16, 38, 59)');
      expect(parseFloat(styles.numberSize)).toBeCloseTo(11.52, 2);
    }
  }
});
