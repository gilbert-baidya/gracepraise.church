import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });

const root = path.resolve(__dirname, '../..');
const publicPages: string[] = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  import { isProductionFile } from './scripts/build-production.mjs';
  import { execFileSync } from 'node:child_process';
  import { readFileSync } from 'node:fs';
  const pages = execFileSync('git', ['ls-files', '-z']).toString().split('\\0')
    .filter(file => file.endsWith('.html') && isProductionFile(file) && !/^(admin|partials)\\//.test(file))
    .filter(file => /mobile-menu-btn|id="(?:site-header|header-placeholder)"|data-partial="site-header"/.test(readFileSync(file, 'utf8')));
  process.stdout.write(JSON.stringify(pages));
`], { cwd: root }).toString());

async function sharedHeader(page: import('@playwright/test').Page, open: boolean) {
  await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
  const toggle = page.locator('header #darkModeToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect(toggle).toHaveCSS('border-color', 'rgb(148, 163, 184)');
  if (open) await expect(page.locator('header .mobile-menu-btn')).toHaveCSS('color', 'rgb(245, 241, 232)');
  await expect(toggle.locator('svg:visible')).toHaveCount(1);
  await expect(toggle).toHaveText('');
  const geometry = await page.evaluate(open => {
    const toggle = document.querySelector('header #darkModeToggle')!;
    const rect = toggle.getBoundingClientRect();
    const brand = document.querySelector('header .visit-brand-copy')!;
    const brandRange = document.createRange(); brandRange.selectNodeContents(brand);
    const text = brandRange.getBoundingClientRect();
    const item = document.querySelector('header .nav-links > li:not([data-drawer-language])')!.getBoundingClientRect();
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const style = getComputedStyle(toggle);
    const closeStyle = getComputedStyle(document.querySelector('header .mobile-menu-btn')!);
    const closeRGB = (closeStyle.color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const ink = luminance(closeRGB), navy = luminance([15, 23, 42]);
    return { logo: brand.textContent, logoOverlap: intersects(rect, text), itemOverlap: open && intersects(rect, item),
      width: rect.width, height: rect.height, left: rect.left, right: rect.right,
      background: style.backgroundColor, border: style.borderColor, radius: style.borderRadius,
      firstOffset: item.top, closeContrast: (Math.max(ink, navy) + .05) / (Math.min(ink, navy) + .05) };
  }, open);
  expect(geometry.logo).toContain('GRACE & PRAISE');
  expect(geometry.logo).toContain('Bangladeshi Church');
  await expect(page.locator('header .visit-brand-copy')).toBeVisible();
  await expect(page.locator('header .logo')).toHaveCSS('text-decoration-line', 'none');
  expect(geometry.logoOverlap).toBe(false);
  expect(geometry.itemOverlap).toBe(false);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(geometry.width).toBeCloseTo(48, 2);
  expect(geometry.height).toBeCloseTo(48, 2);
  expect(geometry.background).toBe('rgb(15, 23, 42)');
  expect(geometry.border).toBe('rgb(148, 163, 184)');
  expect(geometry.radius).toBe('12px');
  if (open) {
    expect(Math.abs(geometry.firstOffset - 148)).toBeLessThanOrEqual(2);
    expect(geometry.closeContrast).toBeGreaterThanOrEqual(3);
    const rows = await page.locator('header .nav-links a:not([data-site-language])').evaluateAll(links => links.map(link => ({
      underline: getComputedStyle(link).textDecorationLine.includes('underline'),
      background: getComputedStyle(link).backgroundColor, border: getComputedStyle(link).borderTopWidth,
      shadow: getComputedStyle(link).boxShadow, current: link.hasAttribute('data-drawer-current'),
      href: (link as HTMLAnchorElement).href,
    })));
    expect(rows.every(row => !row.underline)).toBe(true);
    expect(rows.filter(row => row.current).length).toBeLessThanOrEqual(1);
    const normalize = (url: URL) => url.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    const here = new URL(page.url());
    const matches = rows.filter(row => {
      const url = new URL(row.href);
      return url.origin === here.origin && normalize(url) === normalize(here) && (!url.hash || url.hash === '#home');
    });
    expect(rows.filter(row => row.current)).toHaveLength(matches.length ? 1 : 0);
    for (const row of rows) {
      expect(row.border).toBe('0px');
      expect(row.shadow).toBe('none');
      expect(row.background).toBe(row.current ? 'rgb(38, 59, 86)' : 'rgba(0, 0, 0, 0)');
      if (row.current) expect(matches.some(match => match.href === row.href)).toBe(true);
    }
  }
}

for (const route of ['index.html', 'plan-visit.html', 'daily-devotion.html', 'about.html', 'calendar.html', 'bible-reader.html', 'give.html']) {
  for (const width of [320, 390, 844, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      test(`drawer containment, stacking and contrast: ${route} ${width} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 844 ? 390 : width === 390 ? 844 : width === 320 ? 568 : 900 });
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
          await sharedHeader(page, false);
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
          await sharedHeader(page, true);
          if (width === 390) {
            await page.locator('header .nav-dropdown > a').first().click();
            await sharedHeader(page, true);
            await page.keyboard.press('Tab');
            await expect(page.locator('header .nav-links a:focus-visible')).toHaveCSS('outline-style', 'solid');
            await expect(page.locator('header .nav-links a:focus-visible')).toHaveCSS('outline-width', '3px');
          }
          await page.keyboard.press('Escape');
          await expect(menu).not.toHaveClass(/mobile-open/);
          await expect(burger).toHaveAttribute('aria-expanded', 'false');
        }
      });
    }
  }
}

for (const route of publicPages) {
  test('shared drawer component on every public burger page: ' + route, async ({ page }) => {
    for (const [width, height, language, theme] of [
      [390, 844, 'en', 'light'], [390, 844, 'bn', 'dark'],
      [844, 390, 'bn', 'light'], [844, 390, 'en', 'dark'],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('site-theme', theme);
        localStorage.setItem('gpbc:logoLoaderSeen', 'true');
      }, theme);
      await page.goto('/' + route + '?lang=' + language, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('header .mobile-menu-btn')).toHaveAttribute('aria-controls', 'nav-links');
      await sharedHeader(page, false);
      await page.locator('header .mobile-menu-btn').click();
      await expect(page.locator('.nav-links')).toHaveClass(/mobile-open/);
      await sharedHeader(page, true);
      await page.keyboard.press('Escape');
      await expect(page.locator('.nav-links')).not.toHaveClass(/mobile-open/);
    }
  });
}
