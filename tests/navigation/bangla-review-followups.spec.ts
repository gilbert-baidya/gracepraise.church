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

for (const width of [1440, 1024]) {
  test('Home visit photo matches main dimensions and centers in Bengali at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/index.html?lang=en');
    await expect(page.locator('html')).toHaveAttribute('data-bangla-catalog', 'ready');
    const mainBanglaImage = width === 1440
      ? { width: 652.94, height: 728.67 }
      : { width: 462.52, height: 668.8 };
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
          gapAbove: visual.top - intro.top, gapBelow: details.bottom - visual.bottom };
      });
      expect(geometry.align).toBe('center');
      expect(geometry.fit).toBe('cover');
      expect(geometry.right).toBeLessThanOrEqual(geometry.visualRight);
      expect(Math.abs(geometry.width - mainBanglaImage.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.height - mainBanglaImage.height)).toBeLessThanOrEqual(2);
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
