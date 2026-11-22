import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.route('https://script.google.com/**', route => route.fulfill({ json: { events: [] } }));
});

for (const width of [390, 1440]) {
  test(`calendar weeks align in seven columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/calendar.html');
    await page.locator('#calendar-month-view').click();
    await expect(page.locator('#calendar-month-region')).toHaveCSS('position', 'relative');
    await expect(page.locator('.calendar-grid tbody tr').first().locator('td')).toHaveCount(7);
    const rows = await page.locator('.calendar-grid tbody tr').evaluateAll(rows => rows.map(row =>
      Array.from(row.querySelectorAll('td'), cell => {
        const bounds = cell.getBoundingClientRect();
        return { x: bounds.x, top: bounds.top, width: bounds.width, display: getComputedStyle(cell).display };
      })));
    for (const row of rows) {
      expect(row).toHaveLength(7);
      for (let i = 0; i < row.length; i++) {
        expect(row[i].display).toBe('table-cell');
        expect(Math.abs(row[i].top - row[0].top)).toBeLessThan(1);
        if (i) expect(Math.abs(row[i].x - row[i - 1].x - row[i - 1].width)).toBeLessThan(1);
      }
    }
    await page.locator('.calendar-grid').screenshot({ path: `/home/ubuntu/gpbc-audit/design4/pr18/calendar-columns-${width}.png` });
  });
}

test('both event lists distinguish pending, unavailable, retrying and loaded-empty feed', async ({ page }) => {
  let release!: () => void;
  let gate = new Promise<void>(resolve => { release = resolve; });
  let failed = true;
  await page.route('https://script.google.com/**', async route => {
    await gate;
    if (failed) await route.abort();
    else await route.fulfill({ json: { events: [] } });
  });
  await page.goto('/calendar.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#calendar-list-view').click();
  const month = page.locator('#monthEvents');
  const upcoming = page.locator('#upcomingEventsList');
  await expect(month).toContainText('Loading events for this month');
  await expect(upcoming).toContainText('Loading upcoming events');
  await page.locator('#nextMonth').click();
  await expect(month).toContainText('Loading events for this month');
  release();
  await expect(month).toContainText('unavailable');
  await expect(upcoming).toContainText('unavailable');
  await expect(month).not.toContainText('No events');
  gate = new Promise<void>(resolve => { release = resolve; });
  failed = false;
  await page.locator('#calendarFeedRetry').click();
  await expect(month).toContainText('Loading events for this month');
  await expect(upcoming).toContainText('Loading upcoming events');
  release();
  await expect(month).toHaveAttribute('aria-busy', 'false');
  await page.locator('[data-preset="sunday-services"]').click();
  await expect(month).toHaveText('No events this month');
  await expect(upcoming).toContainText('No other gatherings are scheduled yet');
});

test('sacred focus has its final layout before first visibility even with a slow bundle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/styles.bundle.css*', async route => {
    await new Promise(resolve => setTimeout(resolve, 450));
    await route.continue();
  });
  await page.addInitScript(() => {
    (window as any).focusShifts = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as any;
        if (!shift.hadRecentInput && shift.sources?.some((source: any) =>
          source.node?.closest?.('#sacred-focus') || source.node?.id === 'sacred-focus')) {
          (window as any).focusShifts.push(shift.value);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/index.html');
  const section = page.locator('#sacred-focus');
  await expect(page.locator('link[href^="styles.bundle.css"]')).toHaveCount(1);
  await expect(page.locator('link[data-lazy-href^="styles.bundle.css"]')).toHaveCount(0);
  await expect(section).toHaveCSS('min-height', '600px');
  const height = await section.evaluate(node => node.getBoundingClientRect().height);
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  expect(await section.evaluate(node => node.getBoundingClientRect().height)).toBe(height);
  expect(await page.evaluate(() => (window as any).focusShifts.reduce((sum: number, value: number) => sum + value, 0))).toBe(0);
});

for (const state of ['saved', 'empty', 'malformed', 'blocked']) {
  test(`sermon player on initial load: ${state}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(state => {
      localStorage.removeItem('gpbc_sermon_player_state');
      if (state === 'saved') localStorage.setItem('gpbc_sermon_player_state', JSON.stringify({
        title: 'Saved sermon', speaker: 'Test speaker', audioUrl: '/test-sermon.mp3', position: 42,
      }));
      if (state === 'malformed') localStorage.setItem('gpbc_sermon_player_state', '{invalid');
      if (state === 'blocked') Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    }, state);
    await page.route('**/test-sermon.mp3', route => route.fulfill({ status: 204 }));
    await page.goto('/index.html');
    if (state === 'saved') {
      await expect(page.locator('#gpbc-sermon-player')).toBeVisible();
      await expect(page.locator('.gpbc-sp-title').first()).toHaveText('Saved sermon');
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => (document.querySelector('#gpbc-sermon-player audio') as HTMLAudioElement).paused)).toBe(true);
    } else {
      await expect(page.locator('script[data-resume-playback]')).toHaveCount(1);
      await expect(page.locator('#gpbc-sermon-player')).toHaveCount(0);
    }
  });
}
