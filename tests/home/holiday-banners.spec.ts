import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const flyers = [
  { slug: 'pre-christmas-dec20', date: '2026-12-20', time: '17:00', en: ['Pre-Christmas Celebration', 'Sunday 20 December 2026', '5 PM'], bn: ['প্রাক-বড়দিনের উৎসব', '২০ ডিসেম্বর ২০২৬', '৫টা'] },
  { slug: 'christmas-day', date: '2026-12-25', time: '11:00', en: ['Christmas Day worship', 'Friday 25 December 2026', '10 AM', '11 AM', 'fellowship meal'], bn: ['বড়দিনের উপাসনা', '২৫ ডিসেম্বর ২০২৬', '১০টায়', '১১টায়', 'ভোজ'] },
  { slug: 'gratitude-dec31', date: '2026-12-31', time: '19:00', en: ['Year-end gratitude service', 'Thursday 31 December 2026', '7 PM'], bn: ['বর্ষশেষের কৃতজ্ঞতা উপাসনা', '৩১ ডিসেম্বর ২০২৬', '৭টা'] },
  { slug: 'new-year-jan1', date: '2027-01-01', time: '11:00', en: ['New Year worship', 'Friday 1 January 2027', '10 AM', '11 AM'], bn: ['নববর্ষের উপাসনা', '১ জানুয়ারি ২০২৭', '১০টায়', '১১টায়'] }
];

async function expectFlyers(page: Page, slugs: string[]) {
  await expect.poll(() => page.locator('.event-flyer').evaluateAll(
    cards => cards.map(card => (card as HTMLElement).dataset.flyer)
  )).toEqual(slugs);
  const fastActive = await page.evaluate(() => Date.now() < Date.parse('2027-01-28T00:00:00-08:00'));
  await expect(page.locator('.activity-slide')).toHaveCount(slugs.length + 1 + Number(fastActive));
  await expect(page.locator('.activity-slide').first()).toHaveAttribute('data-activity', 'church-theme');
}

async function loadFlyerImages(page: Page) {
  await page.locator('.event-flyer img').evaluateAll(images => {
    images.forEach(image => (image as HTMLImageElement).loading = 'eager');
  });
  await expect.poll(() => page.locator('.event-flyer img').evaluateAll(
    images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
  )).toBe(true);
  await page.locator('.event-flyer img').evaluateAll(images =>
    Promise.all(images.map(image => (image as HTMLImageElement).decode()))
  );
}

async function prepareHome(page: Page) {
  await page.addInitScript(() => localStorage.setItem('gpbc:logoLoaderSeen', 'true'));
  await page.route('https://script.google.com/**', route => route.fulfill({
    json: { events: [] }, headers: { 'access-control-allow-origin': '*' }
  }));
}

test.describe('Holiday flyers', () => {
  test.use({ timezoneId: 'UTC' });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-12-01T12:00:00-08:00'));
    await prepareHome(page);
  });

  test('all four upcoming flyers are ordered before the holidays', async ({ page }) => {
    await page.goto('/index.html');
    await expectFlyers(page, flyers.map(flyer => flyer.slug));
  });

  for (const flyer of flyers) {
    for (const phase of ['before', 'during', 'last minute', 'after'] as const) {
      test(`${flyer.slug}: ${phase} its Los Angeles event window`, async ({ page }) => {
        const day = new Date(flyer.date + 'T12:00:00-08:00');
        day.setUTCDate(day.getUTCDate() - 1);
        const time = phase === 'before' ? day
          : phase === 'during' ? new Date(flyer.date + 'T' + flyer.time + ':00-08:00')
          : new Date(flyer.date + 'T23:59:59.999-08:00');
        if (phase === 'after') time.setTime(time.getTime() + 1);
        await page.clock.setFixedTime(time);
        await page.goto('/index.html');
        await expectFlyers(page, flyers.filter(item => time <= new Date(item.date + 'T23:59:59.999-08:00')).map(item => item.slug));
      });
    }
  }

  test('after the flyers the fast and original event card remain', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2027-01-02T00:00:00-08:00'));
    await page.goto('/index.html');
    await expectFlyers(page, []);
    await expect(page.locator('#dynamic-events-container > .special-event-details')).toHaveCount(1);
    await expect(page.locator('#dynamic-events-container > .special-event-details')).toHaveAttribute('id', 'event-2027-01-03');
    await expect(page.locator('.activity-rail-item')).toHaveCount(2);
    await expect(page.locator('.activity-slide').last()).toHaveAttribute('data-activity', 'gratitude-fast-2027');
  });

  for (const [width, device] of [[390, 'phone'], [767, 'phone'], [768, 'desktop'], [1440, 'desktop']] as const) {
    test(`${width}px selects the ${device} WebP artwork`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/index.html');
      await loadFlyerImages(page);
      for (const flyer of flyers) {
        const image = page.locator(`[data-flyer="${flyer.slug}"] img`);
        await expect(image).toHaveJSProperty('currentSrc', new URL('images/events/holiday-2026/' + flyer.slug + '-' + device + '.webp', page.url()).href);
        await expect(image).toHaveAttribute('width', '1600');
        await expect(image).toHaveAttribute('height', '600');
      }
    });
  }

  for (const [width, device] of [[390, 'phone'], [1440, 'desktop']] as const) {
    test(`${width}px supplies a ${device} PNG fallback`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/homepage-events.js?*', async route => {
        const response = await route.fetch();
        const source = (await response.text()).replace("source.type = 'image/' + type;", "source.type = type === 'webp' ? 'image/x-unsupported' : 'image/png';");
        await route.fulfill({ response, body: source });
      });
      await page.goto('/index.html');
      await loadFlyerImages(page);
      for (const flyer of flyers) {
        await expect(page.locator(`[data-flyer="${flyer.slug}"] img`)).toHaveJSProperty(
          'currentSrc', new URL('images/events/holiday-2026/' + flyer.slug + '-' + device + '.png', page.url()).href
        );
      }
    });
  }

  for (const format of ['webp', 'png'] as const) {
    test('pre-Christmas portrait selects Bangla ' + format + ' artwork only in Bangla', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      if (format === 'png') {
        await page.route('**/homepage-events.js?*', async route => {
          const response = await route.fetch();
          const source = (await response.text()).replace("source.type = 'image/' + type;", "source.type = type === 'webp' ? 'image/x-unsupported' : 'image/png';");
          await route.fulfill({ response, body: source });
        });
      }
      await page.goto('/index.html?lang=bn');
      const image = page.locator('[data-flyer="pre-christmas-dec20"] img');
      const artwork = (device: string) => new URL('images/events/holiday-2026/pre-christmas-dec20-' + device + '.' + format, page.url()).href;
      await expect(image).toHaveJSProperty('currentSrc', artwork('phone-bn'));
      await expect(image).toHaveAttribute('alt', /বিশেষ পরিবেশনা: গোয়ালঘরের রাজা/);
      await loadFlyerImages(page);
      await page.evaluate(() => (window as any).GPBCLanguage.set('en'));
      await expect(image).toHaveJSProperty('currentSrc', artwork('phone'));
      await page.evaluate(() => (window as any).GPBCLanguage.set('bn'));
      await expect(image).toHaveJSProperty('currentSrc', artwork('phone-bn'));
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(image).toHaveJSProperty('currentSrc', artwork('desktop'));
    });
  }

  test('full English and Bengali information, language attributes and visit links stay synchronized', async ({ page }) => {
    await page.goto('/index.html?lang=bn');
    for (const language of ['bn', 'en', 'bn'] as const) {
      await page.evaluate(lang => (window as any).GPBCLanguage.set(lang), language);
      for (const flyer of flyers) {
        const card = page.locator(`[data-flyer="${flyer.slug}"]`);
        await expect(card).toHaveAttribute('lang', language);
        await expect(card.locator('img')).toHaveAttribute('lang', language);
        const alt = await card.locator('img').getAttribute('alt');
        for (const information of flyer[language]) expect(alt).toContain(information);
        await expect(card.locator('a')).toHaveCount(0);
      }
      await expect(page.locator('.activity-cta')).toHaveJSProperty('href', new URL('/plan-visit.html?lang=' + language, page.url()).href);
      await expect(page.locator(`.activity-cta [data-lang="${language}"]`)).toBeVisible();
      await expect(page.locator(`.activity-cta [data-lang="${language === 'bn' ? 'en' : 'bn'}"]`)).toBeHidden();
    }
    await page.locator('.activity-cta').click();
    await expect(page).toHaveURL(/\/plan-visit\.html\?lang=bn$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  });

  for (const width of [390, 1440]) {
    test(`${width}px reserves flyer and following-section geometry while artwork is delayed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      let release!: () => void;
      const imagesReady = new Promise<void>(resolve => { release = resolve; });
      let held = 0;
      await page.route('**/images/events/holiday-2026/*', async route => {
        held++;
        await imagesReady;
        await route.continue();
      });
      try {
        await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
        await expectFlyers(page, flyers.map(flyer => flyer.slug));
        await page.locator('.event-flyer img').evaluateAll(images => {
          images.forEach(image => (image as HTMLImageElement).loading = 'eager');
        });
        await page.evaluate(async () => {
          const fonts = new Set([...document.querySelectorAll('main *, header *')].map(element => {
            const style = getComputedStyle(element);
            return style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
          }));
          await Promise.all([...fonts].map(font => document.fonts.load(font)));
        });
        await expect.poll(() => held).toBeGreaterThanOrEqual(4);
        const geometry = () => page.evaluate(() => ({
          pictures: [...document.querySelectorAll('.event-flyer picture')].map(element => {
            const { width, height } = element.getBoundingClientRect();
            return { width, height };
          }),
          following: document.getElementById('featured-events')!.getBoundingClientRect().top + scrollY
        }));
        const before = await geometry();
        for (const picture of before.pictures) {
          expect(picture.width).toBeGreaterThan(0);
          expect(picture.width / picture.height).toBeCloseTo(width < 768 ? 4 / 5 : 8 / 3, 2);
        }
        release();
        await loadFlyerImages(page);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await geometry();
        expect(Math.abs(after.following - before.following)).toBeLessThan(0.5);
        for (const [index, picture] of after.pictures.entries()) {
          expect(Math.abs(picture.height - before.pictures[index].height)).toBeLessThan(0.5);
          expect(Math.abs(picture.width - before.pictures[index].width)).toBeLessThan(0.5);
        }
      } finally {
        release();
      }
    });
  }

  test('flyers and their accessible information survive a failed content feed and broken artwork', async ({ page }) => {
    await page.route('**/content.json*', route => route.abort());
    await page.route('**/images/events/holiday-2026/*', route => route.fulfill({ status: 404, body: '' }));
    await page.goto('/index.html?lang=bn');
    await expectFlyers(page, flyers.map(flyer => flyer.slug));
    for (const flyer of flyers) {
      const card = page.locator(`[data-flyer="${flyer.slug}"]`);
      await expect(card.locator('img')).toHaveAttribute('alt', new RegExp(flyer.bn[0]));
      await expect(page.locator('.activity-cta')).toHaveAttribute('href', /plan-visit\.html\?lang=bn$/);
      const picture = await card.locator('picture').boundingBox();
      expect(picture!.height).toBeGreaterThan(0);
    }
  });
});

test.describe('Holiday flyers live expiry', () => {
  test.use({ timezoneId: 'UTC' });

  test('an open page expires its flyer at Pacific midnight without a reload', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-12-20T23:58:00-08:00') });
    await prepareHome(page);
    await page.goto('/index.html');
    await page.clock.pauseAt(new Date('2026-12-20T23:59:50-08:00'));
    await expectFlyers(page, flyers.map(flyer => flyer.slug));
    await page.clock.fastForward(11_000);
    await expectFlyers(page, flyers.slice(1).map(flyer => flyer.slug));
  });
});
