import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { mockSongbookSession } from '../fixtures/songbook-session';

const publicPages: string[] = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  import { isProductionFile } from './scripts/build-production.mjs';
  import { execFileSync } from 'node:child_process';
  import { readFileSync } from 'node:fs';
  process.stdout.write(JSON.stringify(execFileSync('git', ['ls-files', '-z']).toString().split('\\0')
    .filter(file => file.endsWith('.html') && isProductionFile(file) && !/^(admin|partials)\\//.test(file))
    .filter(file => /<html[ >]/i.test(readFileSync(file, 'utf8')))));
`], { cwd: path.resolve(__dirname, '../..') }).toString());

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('gpbc:logoLoaderSeen', 'true');
    localStorage.setItem('gpbc-lent-visited-2026', '1');
  });
});

for (const route of publicPages) for (const width of [1440, 390]) {
  test(`first heading is not covered at page top: ${route} ${width}px`, async ({ page }) => {
    const protectedTool = route.startsWith('bible-slide-builder/');
    await mockSongbookSession(page, protectedTool);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/' + route, { waitUntil: 'domcontentloaded' });
    if (protectedTool) await expect(page.locator('#builderApp')).toBeVisible();
    const heading = page.locator('h1:visible').first();
    await expect(heading).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (await page.locator('header .mobile-menu-btn').count()) {
      await expect(page.locator('html')).toHaveAttribute('data-drawer-styles', 'ready');
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => heading.evaluate(element => {
      const box = element.getBoundingClientRect();
      const centerY = box.top + box.height / 2;
      if (centerY >= innerHeight) {
        const header = document.querySelector('header');
        return box.top >= (header?.getBoundingClientRect().bottom || 0);
      }
      return element.contains(document.elementFromPoint(box.left + box.width / 2, centerY));
    }), { message: `${route} at ${width}px` }).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
}
