import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
});

for (const theme of ['light', 'dark']) {
  test('Calendar Bengali markers retain anywhere wrapping in ' + theme, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
    await page.route('https://script.google.com/**', route => route.fulfill({
      json: { events: [
        { date: '11/25/2026', name: 'Holy Communion Service', category: 'gpbc' },
        { date: '11/27/2026', name: 'Friday Instrument Lesson', category: 'gpbc' },
      ] }, headers: { 'access-control-allow-origin': '*' },
    }));
    await page.goto('/calendar.html?lang=bn');
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
    for (const name of ['Holy Communion Service', 'Friday Instrument Lesson']) {
      await expect(page.locator('.calendar-grid .event-marker').filter({ hasText: name }).first()).toBeAttached();
    }
    await page.evaluate(() => document.fonts.ready);
    const markers = await page.locator('.calendar-grid .event-marker').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      return { wrap: getComputedStyle(element).overflowWrap,
        fits: element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1,
        readable: [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) };
    }));
    expect(markers.length).toBeGreaterThanOrEqual(2);
    for (const marker of markers) {
      expect(marker.wrap).toBe('anywhere');
      expect(marker.fits).toBe(true);
      expect(marker.readable).toBe(true);
    }
  });
}

for (const route of ['about', 'contact', 'ministries', 'index']) {
  test(route + ' Bengali copy uses bundled glyphs without non-bundled fonts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.route('**/*', request => request.request().resourceType() === 'font' &&
      !request.request().url().includes('/assets/fonts/notosansbengali/')
      ? request.abort() : request.fallback());
    await page.goto('/' + route + '.html?lang=bn');
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    await expect(page.locator('.sacred-footer .footer-nav-title').first()).toHaveAttribute('lang', 'bn');
    await page.locator('.about-beliefs details').evaluateAll(elements =>
      elements.forEach(element => (element as HTMLDetailsElement).open = true));
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(async () => {
      const weights = new Set([...document.fonts].filter(face =>
        face.family.replace(/['"]/g, '') === 'Noto Sans Bengali').map(face => face.weight));
      for (const weight of weights) {
        const probe = new FontFace('GPBC Bundled Bengali Probe',
          'url(/assets/fonts/notosansbengali/notosansbengali-' + weight + '.woff2)', { weight });
        document.fonts.add(await probe.load());
      }
      const areas = ['main', '.sacred-footer', 'header nav', '.about-beliefs'];
      return areas.filter(area => document.querySelector(area)).map(area => {
        const elements = [...document.querySelector(area)!.querySelectorAll('*')].filter(element =>
          element.getClientRects().length > 0 && parseFloat(getComputedStyle(element).fontSize) > 0 &&
          [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && /[\u0980-\u09ff]/.test(node.textContent || '')));
        return { area, count: elements.length, glyphs: elements.map(element => {
          const style = getComputedStyle(element);
          const text = (element.textContent || '').match(/[\u0980-\u09ff]+/g)!.join('');
          const canvas = document.createElement('canvas').getContext('2d')!;
          const prefix = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ';
          canvas.font = prefix + style.fontFamily;
          const actual = canvas.measureText(text).width;
          canvas.font = prefix + '"GPBC Bundled Bengali Probe"';
          return { family: style.fontFamily, actual, reference: canvas.measureText(text).width,
            loaded: document.fonts.check(style.fontWeight + ' ' + style.fontSize + ' "Noto Sans Bengali"', text) };
        }) };
      });
    });
    for (const area of result) {
      expect(area.count, area.area).toBeGreaterThan(0);
      for (const glyphs of area.glyphs) {
        expect(glyphs.family, area.area).toMatch(/^"Noto Sans Bengali"/);
        expect(glyphs.loaded, area.area).toBe(true);
        expect(glyphs.actual, area.area).toBeGreaterThan(0);
        expect(glyphs.actual, area.area).toBeCloseTo(glyphs.reference, 1);
      }
    }
  });
}

// Rendered EN/BN baselines from main 6a11402, with non-bundled font requests blocked.
for (const baseline of [
  { width: 865, minimumWidth: 396.89, ratios: [396.89 / 608] },
  { width: 900, minimumWidth: 413.80, ratios: [413.80 / 608] },
  { width: 960, minimumWidth: 441.55, ratios: [441.55 / 608] },
  { width: 961, minimumWidth: 433.92, ratios: [433.92 / 668.8, 433.92 / 611.19] },
  { width: 1024, minimumWidth: 462.52, ratios: [462.52 / 668.8, 462.52 / 621.44] },
  { width: 1200, minimumWidth: 542.33, ratios: [542.33 / 680.98, 542.33 / 630.27] },
  { width: 1440, minimumWidth: 652.94, ratios: [652.94 / 728.67, 620.95 / 692.97] },
]) {
  const { width } = baseline;
  test('Home visit photo matches main dimensions and centers in Bengali at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/index.html?lang=en');
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    const fixedImage = width === 1440
      ? { width: 652.94, height: 728.67 }
      : width === 1024 ? { width: 462.52, height: 668.8 } : null;
    const sizes: { width: number; height: number }[] = [];
    for (const language of ['en', 'bn', 'en']) {
      await page.evaluate(language => (window as any).GPBCLanguage.set(language), language);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.locator('.visit-v3__visual').evaluate(element => {
        const visual = element.getBoundingClientRect();
        const image = element.querySelector('img')!;
        const box = image.getBoundingClientRect();
        const intro = element.parentElement!.querySelector('.visit-v3__intro')!.getBoundingClientRect();
        const details = element.parentElement!.querySelector('.visit-v3__details')!.getBoundingClientRect();
        return { width: box.width, height: box.height, align: getComputedStyle(element).alignSelf,
          fit: getComputedStyle(image).objectFit, right: box.right, visualRight: visual.right,
          gridColumns: getComputedStyle(element.parentElement!).gridTemplateColumns.split(' ').length,
          pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
          gapAbove: visual.top - intro.top, gapBelow: details.bottom - visual.bottom };
      });
      expect(geometry.align).toBe('center');
      expect(geometry.fit).toBe('cover');
      expect(geometry.right).toBeLessThanOrEqual(geometry.visualRight);
      expect(geometry.gridColumns).toBe(2);
      expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.width).toBeGreaterThanOrEqual(baseline.minimumWidth - 2);
      expect(geometry.width / geometry.height).toBeGreaterThanOrEqual(Math.min(...baseline.ratios) - 0.005);
      expect(geometry.width / geometry.height).toBeLessThanOrEqual(Math.max(...baseline.ratios) + 0.005);
      if (fixedImage) {
        expect(Math.abs(geometry.width - fixedImage.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(geometry.height - fixedImage.height)).toBeLessThanOrEqual(2);
      }
      if (language === 'bn') {
        expect(geometry.gapAbove).toBeGreaterThan(0);
        expect(geometry.gapBelow).toBeGreaterThan(0);
        expect(Math.abs(geometry.gapAbove - geometry.gapBelow)).toBeLessThanOrEqual(2);
      }
      sizes.push(geometry);
    }
    for (const dimension of ['width', 'height'] as const) {
      expect(Math.max(...sizes.map(size => size[dimension])) - Math.min(...sizes.map(size => size[dimension]))).toBeLessThanOrEqual(2);
    }
  });
}

function mainVisitImageWidth(width: number, rootFont: number) {
  const clamp = (minimum: number, value: number, maximum: number) => Math.max(minimum, Math.min(value, maximum));
  const tablet = width <= 960;
  const padding = tablet ? clamp(1.75 * rootFont, .04 * width, 2.5 * rootFont) : clamp(1.25 * rootFont, .05 * width, 4 * rootFont);
  const inner = Math.min(77.5 * rootFont, width - 2 * padding);
  const gap = tablet ? clamp(2.25 * rootFont, .04 * width, 3.5 * rootFont) : clamp(3 * rootFont, .06 * width, 5.5 * rootFont);
  const space = inner - gap;
  const left = tablet ? .475 : .46;
  return (space * left < 22 * rootFont ? space - 22 * rootFont : space) * (1 - left) - 2;
}

for (const [start, end] of [[865, 1056], [1056, 1248], [1248, 1440]]) for (const language of ['en', 'bn']) {
  test(`Home visit photo has no crop cliff in a 1px sweep: ${language} ${start}-${end}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: start, height: 1000 });
    await page.goto('/index.html?lang=' + language);
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    await page.locator('.visit-v3__image').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.visit-v3__image').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.locator('.visit-v3__image').evaluate(async image => {
      await (image as HTMLImageElement).decode();
      await document.fonts.ready;
    });
    let previous = 0, minimumRatio = Infinity, largestDrop = 0;
    for (let width = start; width <= end; width++) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await page.locator('.visit-v3__image').evaluate(image => ({
        width: image.getBoundingClientRect().width,
        pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      }));
      const reference = Math.max(mainVisitImageWidth(width, 16), mainVisitImageWidth(width, 17.6));
      expect(geometry.width, language + '/' + width + ' versus main').toBeGreaterThanOrEqual(.9 * reference);
      expect(geometry.pageWidth, language + '/' + width + ' overflow').toBeLessThanOrEqual(geometry.viewport);
      if (previous) expect(geometry.width, language + '/' + width + ' width drop').toBeGreaterThanOrEqual(.9 * previous);
      minimumRatio = Math.min(minimumRatio, geometry.width / reference);
      largestDrop = Math.max(largestDrop, previous - geometry.width);
      previous = geometry.width;
    }
    console.log('visit-photo sweep', language, JSON.stringify({ start, end, widths: end - start + 1, minimumRatio, largestDrop }));
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
