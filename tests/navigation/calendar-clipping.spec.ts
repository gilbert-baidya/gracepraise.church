import { test, expect, type Page } from '@playwright/test';

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
      { date: '11/23/2026', name: 'İrem FELLOWSHIP', category: 'gpbc' },
      { date: '11/24/2026', name: 'COMMUNION প্রার্থনার FELLOWSHIP', category: 'gpbc' },
      { date: '11/28/2026', name: 'SATURDAY FELLOWSHIP', category: 'gpbc' },
    ] },
    headers: { 'access-control-allow-origin': '*' },
  }));
});

test('calendar preserves Unicode words and exposes one unsplit mixed-language title', async ({ page }) => {
  await page.goto('/calendar.html');
  for (const title of ['İrem FELLOWSHIP', 'COMMUNION প্রার্থনার FELLOWSHIP']) {
    const marker = page.getByRole('button', { name: title, exact: true });
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveAccessibleName(title);
    await expect(marker.locator('.calendar-event-text')).toHaveText(title);
    await expect(marker.locator('.calendar-event-visual')).toHaveAttribute('aria-hidden', 'true');
  }
  const marker = page.getByRole('button', { name: 'COMMUNION প্রার্থনার FELLOWSHIP', exact: true });
  for (const selector of ['.calendar-event-title', '.calendar-event-text']) {
    expect(await marker.locator(selector + ' [lang]').evaluateAll(elements =>
      elements.map(element => ({ text: element.textContent, lang: element.lang, hyphens: getComputedStyle(element).hyphens })))).toEqual([
      { text: 'COMMUNION', lang: 'en', hyphens: 'auto' },
      { text: 'প্রার্থনার', lang: 'bn', hyphens: 'manual' },
      { text: 'FELLOWSHIP', lang: 'en', hyphens: 'auto' },
    ]);
  }
  const calls = await page.evaluate(() => {
    const hyphenator = (window as any).GPBCCalendarHyphenator;
    const original = hyphenator.hyphenate;
    const tokens: string[] = [];
    try {
      hyphenator.hyphenate = (token: string) => { tokens.push(token); return original.call(hyphenator, token); };
      (window as any).calendarEventLabel('İrem FELLOWSHIP café Graceপ্রার্থনা');
      return tokens;
    } finally { hyphenator.hyphenate = original; }
  });
  expect(calls).toEqual(['FELLOWSHIP']);
  await page.evaluate(() => {
    (window as any).__openedCalendarTitles = [];
    (window as any).showEventDetail = (event: { name: string }) => (window as any).__openedCalendarTitles.push(event.name);
  });
  await marker.press('Enter');
  await marker.press('Space');
  expect(await page.evaluate(() => (window as any).__openedCalendarTitles)).toEqual([
    'COMMUNION প্রার্থনার FELLOWSHIP', 'COMMUNION প্রার্থনার FELLOWSHIP',
  ]);
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

test('real event dialog traps keyboard focus and restores its opening label', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/calendar.html');
  const opener = page.getByRole('button', { name: 'İrem FELLOWSHIP', exact: true });
  const dialog = page.locator('#eventDetailModal');
  const close = dialog.getByRole('button', { name: 'Close event details modal', exact: true });
  await opener.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  const controls = dialog.locator('button:enabled:visible, a[href]:visible, input:enabled:visible, [tabindex="0"]:visible');
  expect(await controls.count()).toBeGreaterThan(1);
  await close.press('Shift+Tab');
  await expect(controls.last()).toBeFocused();
  await controls.last().press('Tab');
  await expect(close).toBeFocused();
  for (let index = 0; index < await controls.count() + 2; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.press('Space');
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

async function checkSaturdayFocus(page: Page) {
  const marker = page.getByRole('button', { name: 'SATURDAY FELLOWSHIP', exact: true });
  await marker.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(marker).toBeFocused();
  const ring = await marker.evaluate(element => {
    const box = element.getBoundingClientRect(), grid = element.closest('.calendar-grid')!.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { left: box.left, right: box.right, gridLeft: grid.left, gridRight: grid.right,
      offset: parseFloat(style.outlineOffset), width: parseFloat(style.outlineWidth),
      style: style.outlineStyle, shadow: style.boxShadow, visible: element.matches(':focus-visible') };
  });
  expect(ring.visible).toBe(true);
  expect(ring.style).toBe('solid');
  expect(ring.width).toBeGreaterThanOrEqual(2);
  expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
  expect(ring.shadow).toBe('none');
  expect(ring.left).toBeGreaterThanOrEqual(ring.gridLeft);
  expect(ring.right).toBeLessThanOrEqual(ring.gridRight);
}

for (const width of [320, 340, 359, 360, 375]) for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
  test(`narrow marker ink stays inside day content: ${width} ${language} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/calendar.html?lang=' + language);
    await expect(page.locator('.calendar-event-text').filter({ hasText: 'İrem FELLOWSHIP' })).toHaveCount(1);
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    await page.evaluate(() => document.fonts.ready);
    const failures = await page.locator('.calendar-grid .event-marker').evaluateAll(markers => markers.flatMap(marker => {
      const day = marker.closest('.day')!;
      const box = day.getBoundingClientRect(), style = getComputedStyle(day);
      const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
      const visual = marker.querySelector('.calendar-event-visual')!;
      const failures: { text: string; left: number; right: number; cellLeft: number; cellRight: number }[] = [];
      const check = (text: string, start: number, end: number) => {
        if (start < left - .5 || end > right + .5) failures.push({ text, left: start, right: end, cellLeft: left, cellRight: right });
      };
      const label = marker.getBoundingClientRect(), grid = day.closest('.calendar-grid')!.getBoundingClientRect();
      check('label box', label.left, label.right);
      if (label.left < grid.left || label.right > grid.right) failures.push({
        text: 'label outside grid', left: label.left, right: label.right, cellLeft: grid.left, cellRight: grid.right,
      });
      for (const span of visual.querySelectorAll('span')) {
        if (span.children.length || !span.textContent?.trim()) continue;
        for (const rect of span.getClientRects()) if (rect.width > .1) check(span.textContent, rect.left, rect.right);
      }
      const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
      const canvas = document.createElement('canvas').getContext('2d')!;
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      while (walker.nextNode()) {
        const node = walker.currentNode, text = node.textContent || '';
        const font = getComputedStyle(node.parentElement!);
        canvas.font = font.font;
        for (const { segment, index } of segmenter.segment(text)) {
          if (!segment.trim() || segment === '\u00ad') continue;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + segment.length);
          const ink = canvas.measureText(segment);
          for (const rect of range.getClientRects()) if (rect.width > .1) {
            check(segment, rect.left, rect.right);
            check(segment + ' ink', rect.left - ink.actualBoundingBoxLeft, rect.left + ink.actualBoundingBoxRight);
          }
        }
      }
      return failures;
    }));
    expect(failures).toEqual([]);
    await checkSaturdayFocus(page);
  });
}

for (const width of [320, 390, 844, 1024, 1440]) {
  for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
    test(`seven bounded weekdays and wrapping labels: ${width} ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
      await page.goto('/calendar.html?lang=' + language, { waitUntil: 'domcontentloaded' });
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      if (width === 1440) await checkSaturdayFocus(page);
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
      if (width === 320 || width === 390) {
        for (const size of await markers.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).fontSize)))) {
          expect(size).toBeCloseTo(width === 320 ? 8.5 : 10.14, 2);
        }
      }
      await expect(markers.filter({ hasText: 'HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE' })).toHaveAttribute('lang', 'en');
      await expect(markers.filter({ hasText: 'শুক্রবারের বাইবেল শিক্ষা ও প্রার্থনার সভা' })).toHaveAttribute('lang', 'bn');
      const words = await markers.evaluateAll((elements, checkBengaliWords) => elements.flatMap(element => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const checks = [{ text: element.textContent, valid:
          style.wordBreak === 'normal' && style.overflowWrap === 'break-word' && style.hyphens === (element.lang === 'bn' ? 'manual' : 'auto') &&
          style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis' &&
          element.scrollWidth <= element.clientWidth + 1 }];
        if (checkBengaliWords && element.lang === 'bn') {
          const walker = document.createTreeWalker(element.querySelector('.calendar-event-text')!, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            for (const match of (node.textContent || '').matchAll(/\S+/g)) {
              if (!/[\u0980-\u09ff]/.test(match[0])) continue;
              const range = document.createRange();
              range.setStart(node, match.index!);
              range.setEnd(node, match.index! + match[0].length);
              const rects = [...range.getClientRects()].filter(rect => rect.width > .1);
              const tops = rects.map(rect => rect.top);
              checks.push({ text: match[0], valid: tops.length > 0 &&
                Math.max(...tops) - Math.min(...tops) <= 1 &&
                rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) });
            }
          }
        }
        if (!element.textContent?.includes('HOLY COMMUNION SERVICE WITH A VERY LONG FELLOWSHIP TITLE')) return checks;
        for (const run of element.querySelectorAll('.calendar-event-text .calendar-event-run[lang="en"]')) {
          let previous: Element | null = null;
          for (const span of run.children) {
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
        }
        return checks;
      }), [390, 844].includes(width));
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
