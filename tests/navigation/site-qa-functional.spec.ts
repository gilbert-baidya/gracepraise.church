import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.abort());
});

test('monthly giving preserves Bengali on both missing-query links', async ({ page }) => {
  await page.goto('/give-monthly.html?lang=bn');
  for (const selector of ['header a', 'a[href*="frequency=once"]:not([href*="lang=bn"])']) {
    if (selector.startsWith('header')) await expect(page.locator(selector)).toHaveAttribute('href', /lang=bn/);
    else await expect(page.locator(selector)).toHaveCount(0);
  }
  await expect(page.locator('a[href*="frequency=once"]')).toHaveCount(2);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(2);
});

test('calendar has seven-cell ARIA rows before and after month changes, and Escape closes event details', async ({ page }) => {
  await page.goto('/calendar.html');
  await expect(page.locator('.calendar-grid [role="gridcell"]')).not.toHaveCount(0);
  for (const changeMonth of [false, true]) {
    if (changeMonth) await page.locator('#nextMonth').click();
    const rows = page.locator('.calendar-grid > [role="row"]');
    expect(await rows.count()).toBeGreaterThanOrEqual(5);
    expect(await rows.evaluateAll(nodes => nodes.every(node => node.children.length === 7))).toBe(true);
    await expect(rows.first().locator('[role="columnheader"]')).toHaveCount(7);
    expect(await page.locator('[role="gridcell"], [role="columnheader"]').evaluateAll(nodes =>
      nodes.every(node => node.parentElement?.getAttribute('role') === 'row'))).toBe(true);
    expect(await rows.evaluateAll(nodes => nodes.every(node => {
      const bounds = node.getBoundingClientRect();
      const cells = [...node.children].map(child => child.getBoundingClientRect());
      const heights = cells.map(cell => cell.height);
      return Math.max(...heights) - Math.min(...heights) <= 1 &&
        cells.every((cell, index) => cell.right <= bounds.right + 1 &&
          (index === cells.length - 1 || cell.right <= cells[index + 1].left + 1));
    }))).toBe(true);
  }
  await page.evaluate(() => (window as any).showEventDetail({
    date: '2026-11-25', name: 'Escape regression', category: 'gpbc', description: 'Test event'
  }));
  await expect(page.locator('#eventDetailModal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#eventDetailModal')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.calendar-grid')).toBeVisible();
});

test('Bengali gratitude selection is safe while the data request is pending', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/gratitude-fasting-devotions.json', async route => {
    await pending;
    if (!page.isClosed()) await route.continue();
  });
  try {
    await page.goto('/gratitude-fasting.html?lang=bn', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#langBn')).toHaveAttribute('aria-checked', 'true');
  } finally { release(); }
  await expect(page.locator('#devotionContent')).toBeVisible();
  await expect(page.locator('#verseText')).not.toBeEmpty();
  await expect(page.locator('#verseText')).toHaveAttribute('lang', 'bn');
  await page.locator('#langEn').click();
  await expect(page.locator('#verseText')).not.toBeEmpty();
  expect(errors.filter(error => /devotionalData|devotions/.test(error))).toEqual([]);
});

test('all Pastor live and message links use the existing canonical YouTube destination', async ({ page }) => {
  await page.goto('/pastor/index.html?lang=bn');
  await expect(page.locator('a[href*="index.html#live"]')).toHaveCount(0);
  for (const link of [
    page.locator('.nav-links a').filter({ hasText: /^LIVE$/ }),
    page.getByRole('link', { name: 'Watch Messages', exact: true }),
    page.locator('.pastor-link-card').filter({ hasText: 'Messages' })
  ]) {
    await expect(link).toHaveAttribute('href', 'https://www.youtube.com/@GracePraise.Church');
  }
});

test('desktop dropdown Escape dismisses hover and focus menus and synchronizes expanded state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await expect(page.locator('#darkModeToggle')).toHaveAttribute('data-theme-init', 'true');
  const dropdowns = page.locator('.nav-links > .nav-dropdown');
  expect(await dropdowns.count()).toBeGreaterThanOrEqual(3);
  for (const dropdown of await dropdowns.all()) {
    const toggle = dropdown.locator(':scope > a');
    const menu = dropdown.locator(':scope > .dropdown-menu');
    await toggle.hover();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await menu.locator('a').first().focus();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await page.mouse.move(0, 899);
    await toggle.hover();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
  }
});

test('late partial header binds its theme control once and survives a page hop', async ({ page }) => {
  await page.route('**/partials/header.html', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (!page.isClosed()) await route.continue();
  });
  for (const path of ['/contact.html', '/about.html']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('#darkModeToggle');
    await expect(toggle).toHaveAttribute('data-theme-init', 'true');
    const before = await page.locator('html').getAttribute('data-theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', before === 'dark' ? 'light' : 'dark');
    await (page.evaluate(() => {
      (window as any).GPBC_initNav();
      (window as any).GPBC_initNav();
    }));
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', before!);
  }
});

test('devotion fallback prayer link reaches the real prayer page', async ({ page }) => {
  await page.goto('/daily-devotion.html?lang=bn');
  const link = page.locator('#devotionFallback a').first();
  await expect(link).toHaveJSProperty('pathname', '/prayer-request.html');
  await expect(link).toHaveJSProperty('hash', '');
  await expect(link).toHaveAttribute('href', /lang=bn/);
});

test('Habakkuk atlas search shows the correctly tagged English and Bengali names', async ({ page }) => {
  await page.goto('/bible-reader.html');
  await page.locator('#smartSearch').fill('Habakkuk');
  const book = page.locator('.book-card');
  await expect(book).toHaveCount(1);
  await expect(book.locator('.book-name[lang="en"]')).toHaveText('Habakkuk');
  await expect(book.locator('.book-name-bn[lang="bn"]')).toHaveText('হবক্‌কূক');
  await page.locator('#smartSearch').fill('হবক্‌কূক');
  await expect(book).toHaveCount(1);
});
