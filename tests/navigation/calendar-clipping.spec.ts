import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('**/upload-widget.cloudinary.com/**', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.cloudinary={createUploadWidget:()=>({open(){}})};',
  }));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://script.google.com/**', route => route.fulfill({
    json: { events: [
      { date: '11/25/2026', name: 'HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE', category: 'gpbc' },
      { date: '11/26/2026', name: 'শুক্রবারের বাইবেল শিক্ষা ও প্রার্থনার সভা', category: 'gpbc' },
      { date: '11/27/2026', name: 'FELLOWSHIP'.repeat(10), category: 'gpbc' },
    ] },
    headers: { 'access-control-allow-origin': '*' },
  }));
});

test('calendar preserves labels and empty names if discretionary hyphenation is unavailable', async ({ page }) => {
  await page.route('**/assets/vendor/calendar-hyphenation.js', route => route.abort());
  await page.goto('/calendar.html');
  await expect(page.locator('.calendar-grid .event-marker').filter({
    hasText: 'HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE',
  })).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).calendarEventLabel('').textContent)).toBe('');
  expect(await page.evaluate(() => (window as any).calendarEventLabel(null).textContent)).toBe('');
});

for (const width of [320, 390, 844, 1024, 1440]) {
  for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
    test(`seven bounded weekdays and wrapping labels: ${width} ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
      await page.goto('/calendar.html?lang=' + language, { waitUntil: 'domcontentloaded' });
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      await expect(page.locator('#monthEvents')).toContainText('HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE');
      await page.evaluate(() => document.fonts.ready);
      const grid = page.locator('.calendar-grid[role="grid"]');
      const assertGrid = async () => {
        await expect(grid.locator(':scope > .day:not(.other-month)')).toHaveCount(30);
        await expect(grid.locator('.calendar-row')).toHaveCount(0);
        const geometry = await grid.evaluate(element => {
          const box = element.getBoundingClientRect();
          const clips = [];
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            if (getComputedStyle(parent).overflowX !== 'visible') clips.push(parent.getBoundingClientRect());
          }
          return {
            width: element.clientWidth, scrollWidth: element.scrollWidth,
            pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
            days: [...element.querySelectorAll(':scope > .day')].map(day => {
              const rect = day.getBoundingClientRect();
              return { top: rect.top, height: rect.height, dateTop: day.querySelector('.day-number')!.getBoundingClientRect().top };
            }),
            weekdays: [...element.querySelectorAll(':scope > .weekday')].map(day => {
              const rect = day.getBoundingClientRect();
              return { left: rect.left - box.left, right: rect.right - box.left, width: rect.width, top: rect.top,
                unclipped: clips.every(clip => rect.left >= clip.left - 1 && rect.right <= clip.right + 1) };
            }),
          };
        });
        expect(geometry.weekdays).toHaveLength(7);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
        expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
        for (let index = 0; index < geometry.days.length; index += 7) {
          const heights = geometry.days.slice(index, index + 7).map(day => day.height);
          expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
          const dates = geometry.days.slice(index, index + 7).map(day => day.dateTop);
          expect(Math.max(...dates) - Math.min(...dates)).toBeLessThanOrEqual(1);
        }
        for (const day of geometry.weekdays) {
          expect(day.left).toBeGreaterThanOrEqual(-1);
          expect(day.right).toBeLessThanOrEqual(geometry.width + 1);
          expect(day.width).toBeGreaterThan(0);
          expect(Math.abs(day.top - geometry.weekdays[0].top)).toBeLessThanOrEqual(1);
          expect(day.unclipped).toBe(true);
        }
      };
      await assertGrid();
      const markers = page.locator('.calendar-grid .event-marker');
      await expect(markers.filter({ hasText: 'HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE' })).toHaveAttribute('lang', 'en');
      await expect(markers.filter({ hasText: 'শুক্রবারের বাইবেল শিক্ষা ও প্রার্থনার সভা' })).toHaveAttribute('lang', 'bn');
      const words = await markers.evaluateAll(elements => elements.flatMap(element => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const checks = [{ text: element.textContent, valid:
          style.wordBreak === 'normal' && style.overflowWrap === 'break-word' && style.hyphens === 'auto' &&
          style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis' &&
          element.scrollWidth <= element.clientWidth + 1 }];
        if (!element.textContent?.includes('HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE')) return checks;
        let previous: Element | null = null;
        for (const span of element.children) {
          if (!/^[A-Za-z]+$/.test(span.textContent || '')) { previous = null; continue; }
          const range = document.createRange();
          range.selectNodeContents(span);
          const rects = [...range.getClientRects()].filter(rect => rect.width > .1);
          const tops = rects.map(rect => rect.top);
          checks.push({ text: span.textContent, valid: tops.length > 0 &&
            Math.max(...tops) - Math.min(...tops) <= 1 &&
            rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) });
          if (previous && Math.abs(previous.getBoundingClientRect().top - span.getBoundingClientRect().top) > 1) {
            checks.push({ text: previous.textContent + ' / ' + span.textContent, valid:
              previous.classList.contains('calendar-word-break') &&
              getComputedStyle(previous, '::after').content === '"\u00ad"' });
          }
          previous = span;
        }
        return checks;
      }));
      for (const word of words) expect(word.valid, word.text || 'empty marker').toBe(true);
      const labels = await page.locator('#monthEvents .event-name').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        return { fits: element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1,
          overflow: getComputedStyle(element).overflow, ellipsis: getComputedStyle(element).textOverflow,
          wraps: [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) };
      }));
      expect(labels.length).toBeGreaterThanOrEqual(3);
      for (const label of labels) {
        expect(label.fits).toBe(true);
        expect(label.wraps).toBe(true);
        expect(label.overflow).not.toBe('hidden');
        expect(label.ellipsis).not.toBe('ellipsis');
      }
      await page.evaluate(() => {
        (window as any).eval('events').splice(0);
        (window as any).renderCalendar();
        (window as any).renderMonthEvents();
      });
      await expect(page.locator('#monthEvents .event-name')).toHaveCount(0);
      await assertGrid();
    });
  }
}
