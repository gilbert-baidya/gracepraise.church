import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

for (const route of ['index.html', 'plan-visit.html', 'daily-devotion.html']) {
  for (const width of [390, 844, 820, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      test(`drawer containment, stacking and contrast: ${route} ${width} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 844 ? 390 : width === 390 ? 844 : 900 });
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme as 'light' | 'dark' });
        await page.addInitScript(theme => {
          localStorage.setItem('theme', theme);
          localStorage.setItem('site-theme', theme);
          localStorage.setItem('gpbc:logoLoaderSeen', 'true');
        }, theme);
        await page.route('https://script.google.com/**', route => route.abort());
        for (const language of ['en', 'bn']) {
          await page.goto('/' + route + '?lang=' + language, { waitUntil: 'domcontentloaded' });
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          const menu = page.locator('header .nav-links').first();
          const burger = page.locator('.mobile-menu-btn').first();
          if (width > 1024) {
            await expect(burger).toBeHidden();
            await expect(menu).toBeVisible();
            await expect(menu).not.toHaveClass(/mobile-open/);
            continue;
          }
          await expect(burger).toHaveAttribute('aria-controls', 'nav-links');
          await burger.click();
          await expect(menu).toHaveClass(/mobile-open/);
          await expect(burger).toHaveAttribute('aria-expanded', 'true');
          await expect.poll(async () => menu.evaluate(element => {
            const r = element.getBoundingClientRect();
            return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
          })).toBe(true);
          await expect.poll(() => menu.evaluate(element =>
            [innerHeight / 2, Math.min(110, innerHeight / 3)].every(y =>
              element.contains(document.elementFromPoint(innerWidth / 2, y))))).toBe(true);
          const visual = await menu.evaluate(element => {
            const topmost = [innerHeight / 2, Math.min(110, innerHeight / 3)].every(y =>
              element.contains(document.elementFromPoint(innerWidth / 2, y)));
            const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
            const luminance = (color: number[]) => color.slice(0, 3).map(channel => {
              const c = channel / 255;
              return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
            }).reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
            const samples = [...element.querySelectorAll('a, a span'), ...document.querySelectorAll('header .visit-brand-copy strong, header .visit-brand-copy small')];
            const ratios = samples.filter(node => {
              const r = node.getBoundingClientRect();
              return r.width && r.height && r.top >= 0 && r.top < innerHeight && node.textContent?.trim();
            }).map(node => {
              const style = getComputedStyle(node);
              const foreground = rgb(style.webkitTextFillColor || style.color);
              let background = [15, 23, 42];
              const layers = [];
              for (let parent: Element | null = node; parent && parent !== element.parentElement; parent = parent.parentElement) {
                layers.unshift(rgb(getComputedStyle(parent).backgroundColor));
              }
              for (const layer of layers) {
                const alpha = layer[3] ?? 1;
                background = background.map((channel, i) => channel * (1 - alpha) + layer[i] * alpha);
              }
              const a = luminance(foreground), b = luminance(background);
              return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            });
            return { topmost, minimum: Math.min(...ratios), count: ratios.length };
          });
          expect(visual.topmost).toBe(true);
          expect(visual.count).toBeGreaterThan(0);
          expect(visual.minimum).toBeGreaterThanOrEqual(4.5);
          await page.keyboard.press('Escape');
          await expect(menu).not.toHaveClass(/mobile-open/);
          await expect(burger).toHaveAttribute('aria-expanded', 'false');
        }
      });
    }
  }
}
