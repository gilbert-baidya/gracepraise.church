import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { get as httpGet } from 'node:http';
import { once } from 'node:events';

const directions = 'https://www.google.com/maps/dir/?api=1&destination=1325+Richardson+Street%2C+San+Bernardino%2C+CA+92408';
const test = base.extend<{}, { visitOrigin: string }>({
  visitOrigin: [async ({}, use) => {
    const server = spawn(process.execPath, ['scripts/serve-local-review.mjs'], {
      env: { ...process.env, GPBC_LOCAL_REVIEW_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      const origin = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Visit review server did not start')), 10000);
        server.once('error', reject);
        server.stdout.on('data', data => {
          const url = String(data).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
          if (url) { clearTimeout(timeout); resolve(url); }
        });
      });
      await use(origin);
    } finally {
      if (server.exitCode === null) { server.kill(); await once(server, 'exit'); }
    }
  }, { scope: 'worker' }],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('gpbc:logoLoaderSeen', 'true'); } catch {}
  });
  await page.route('https://script.google.com/**', route => route.fulfill({
    json: { events: [] }, headers: { 'access-control-allow-origin': '*' },
  }));
});

for (const route of ['index', 'plan-visit']) for (const width of [360, 390]) {
  test(`${route} essentials fit at ${width}px in both languages and themes`, async ({ page, visitOrigin }) => {
    const height = width === 360 ? 800 : 844;
    await page.setViewportSize({ width, height });
    for (const language of ['en', 'bn']) for (const theme of ['light', 'dark']) {
      await page.goto(`${visitOrigin}/${route}.html?lang=${language}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (window as any).GPBCLanguage?.language !== undefined);
      await page.evaluate(theme => (window as any).Platform.applyTheme(theme), theme);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      const summary = page.locator('.visit-summary');
      await expect(summary).toContainText(language === 'en' ? 'Ask a greeter when you arrive.' : 'এসে স্বাগতকারীকে জিজ্ঞেস করুন।');
      const geometry = await summary.evaluate(element => {
        const rectangle = element.getBoundingClientRect();
        const button = element.querySelector('.visit-summary-directions')!;
        const box = button.getBoundingClientRect();
        return { top: rectangle.top, bottom: rectangle.bottom,
          overflow: document.documentElement.scrollWidth - innerWidth,
          unobstructed: button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
          clipping: Array.from(element.querySelectorAll<HTMLElement>('p, strong, address, a')).some(node =>
            getComputedStyle(node).overflow === 'hidden' || !['none', 'auto'].includes(getComputedStyle(node).webkitLineClamp)),
        };
      });
      expect(geometry.top).toBeGreaterThanOrEqual(136);
      expect(geometry.bottom).toBeLessThanOrEqual(height);
      expect(geometry.overflow).toBe(0);
      expect(geometry.unobstructed).toBe(true);
      expect(geometry.clipping).toBe(false);
      const address = summary.locator('address');
      await expect(address).toHaveAttribute('lang', 'en');
      await expect(address).toHaveText('1325 Richardson StreetSan Bernardino, CA 92408');
      const action = summary.locator('.visit-summary-directions');
      await expect(action).toHaveAttribute('href', directions);
      await expect(action).toHaveAttribute('target', '_blank');
      await expect(action).toHaveAttribute('rel', /noopener/);
      await expect(action).toHaveAccessibleName(language === 'en' ? /Get directions.*opens map in a new tab/ : /দিকনির্দেশনা নিন.*নতুন ট্যাবে মানচিত্র খুলবে/);
      const choices = page.locator('[data-site-language]');
      for (const choice of await choices.all()) {
        const box = await choice.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(48);
        expect(box!.height).toBeGreaterThanOrEqual(48);
      }
    }
  });
}

test('Home to Visit, refresh and history preserve page, language and theme', async ({ page, visitOrigin }) => {
  await page.goto(`${visitOrigin}/index.html?lang=en`);
  await page.evaluate(() => (window as any).Platform.applyTheme('dark', { persist: true }));
  await page.locator('[data-site-language="bn"]').click();
  await page.locator('.visit-expect-link').click();
  await expect(page).toHaveURL(/plan-visit\.html\?lang=bn$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.locator('[data-site-language="en"]').click();
  await page.locator('[data-site-language="bn"]').click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => location.reload())]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.goBack();
  await expect(page).toHaveURL(/index\.html\?lang=bn$/);
  await page.goForward();
  await expect(page).toHaveURL(/plan-visit\.html\?lang=bn$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('desktop navigation remains unobstructed in both languages', async ({ page, visitOrigin }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ['index', 'plan-visit']) for (const language of ['en', 'bn']) {
    await page.goto(`${visitOrigin}/${route}.html?lang=${language}`);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    const links = page.locator('header .nav-links > li > a:visible');
    expect(await links.count()).toBeGreaterThan(5);
    for (const link of await links.all()) {
      expect(await link.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
    }
  }
});

test('URL variants retain query and hash, canonical identity and English fallback', async ({ page, visitOrigin }) => {
  const origin = new URL(visitOrigin);
  const malformedStatus = await new Promise<number>((resolve, reject) => {
    httpGet({ hostname: origin.hostname, port: origin.port, path: '//[' }, response => {
      response.resume();
      resolve(response.statusCode ?? 0);
    }).on('error', reject);
  });
  expect(malformedStatus).toBe(404);
  expect((await page.request.post(`${visitOrigin}/plan-visit`, { maxRedirects: 0 })).status()).toBe(405);
  const config = readFileSync('netlify.toml', 'utf8');
  for (const name of ['plan-visit', 'gallery']) for (const suffix of ['', '/', '.html']) {
    if (suffix !== '.html') expect(config).toContain(`from = "/${name}${suffix}"\n  to = "/${name}.html"\n  status = 301`);
    await page.goto(`${visitOrigin}/${name}${suffix}?campaign=a%20b&lang=bn#language-proof`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.locator('header').first()).toHaveAttribute('lang', 'en');
    await page.evaluate(() => (window as any).Platform.applyTheme('dark', { persist: true }));
    await page.keyboard.press('Tab');
    await page.locator('[data-site-language="bn"]').focus();
    await expect(page.locator('[data-site-language="bn"]')).toHaveCSS('outline-color', 'rgb(143, 188, 255)');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://gracepraise.church/${name}.html`);
    const bengaliTitle = await page.title();
    await page.locator('[data-site-language="en"]').click();
    const url = new URL(page.url());
    expect(url.pathname).toBe(`/${name}.html`);
    expect(url.searchParams.get('campaign')).toBe('a b');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.hash).toBe('#language-proof');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.title()).not.toBe(bengaliTitle);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (name === 'gallery') await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  }
});

test('query overrides saved language; invalid values fall back to saved language then English', async ({ page, visitOrigin }) => {
  await page.goto(`${visitOrigin}/index.html`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.evaluate(() => localStorage.setItem('gpbc-language', 'bn'));
  await page.goto(`${visitOrigin}/index.html?lang=en`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.evaluate(() => localStorage.setItem('gpbc-language', 'bn'));
  await page.goto(`${visitOrigin}/index.html?lang=invalid`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('header a[href*="gallery.html"]').first()).toHaveAttribute('href', /lang=bn/);
});

test('explicit language works with storage blocked', async ({ page, visitOrigin }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Storage disabled', 'SecurityError'); },
  }));
  await page.goto(`${visitOrigin}/plan-visit/?lang=bn&campaign=blocked#language-proof`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.locator('[data-site-language="en"]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(new URL(page.url()).searchParams.get('campaign')).toBe('blocked');
  expect(new URL(page.url()).hash).toBe('#language-proof');
});

test('keyboard switching retains focus, scroll and theme, with visible selected state', async ({ page, visitOrigin }) => {
  await page.goto(`${visitOrigin}/index.html?lang=en&campaign=keyboard#language-proof`);
  const english = page.locator('[data-site-language="en"]');
  const bengali = page.locator('[data-site-language="bn"]');
  await english.focus();
  await page.keyboard.press('Tab');
  await expect(bengali).toBeFocused();
  await expect(bengali).toHaveCSS('outline-width', '3px');
  await page.evaluate(() => scrollTo({ top: 300, behavior: 'instant' }));
  expect(await page.evaluate(() => scrollY)).toBe(300);
  await page.keyboard.press('Space');
  await expect(bengali).toBeFocused();
  await expect(bengali).toHaveAttribute('aria-pressed', 'true');
  await expect(english).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(300, 0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(new URL(page.url()).hash).toBe('#language-proof');
});

test('language and directions controls are ordinary working links without JavaScript', async ({ browser, visitOrigin }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of ['index', 'plan-visit']) {
    await page.goto(`${visitOrigin}/${route}.html`);
    await page.getByRole('link', { name: 'বাংলা', exact: true }).click();
    await expect(page.locator('.visit-summary-time [lang="bn"]')).toBeVisible();
    await expect(page.locator('.visit-summary-time [lang="en"]')).toBeHidden();
    await expect(page.locator('.visit-summary-directions')).toHaveAttribute('href', directions);
    await expect(page.locator('.visit-summary-directions')).toHaveAccessibleName(/নতুন ট্যাবে মানচিত্র খুলবে/);
    await page.getByRole('link', { name: 'English', exact: true }).click();
    await expect(page.locator('.visit-summary-time [lang="en"]')).toBeVisible();
  }
  await context.close();
});

test('200% text and 400%-equivalent viewport reflow keep directions reachable', async ({ page, visitOrigin }) => {
  for (const route of ['index', 'plan-visit']) for (const language of ['en', 'bn']) {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${visitOrigin}/${route}.html?lang=${language}`);
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.visit-essentials h1, .visit-summary p, .visit-summary strong, .visit-summary address, .visit-summary a'));
      const sizes = elements.map(element => [element, parseFloat(getComputedStyle(element).fontSize), parseFloat(getComputedStyle(element).lineHeight)] as const);
      for (const [element, size, leading] of sizes) {
        element.style.setProperty('font-size', `${size * 2}px`, 'important');
        element.style.setProperty('line-height', `${leading * 2}px`, 'important');
      }
    });
    const action = page.locator('.visit-summary-directions');
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.setViewportSize({ width: 360, height: 200 });
    await page.goto(`${visitOrigin}/${route}.html?lang=${language}`);
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(await action.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('a') === element;
    })).toBe(true);
  }
});

test('late-loading devotion content follows the selected language without relabeling English fallback', async ({ page, visitOrigin }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.route(url => url.pathname === '/devotions-data.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.GPBC_INITIAL_DEVOTION_DATE = '2026-11-20';
      setTimeout(() => {
        window.DEVOTIONS = [{date:'2026-11-20',title:'English title',titleBn:'বাংলা শিরোনাম',
          verse:'John 3:16',verseText:'English verse',verseTextBn:'বাংলা শাস্ত্রের পদ',
          reflection:'English reflection',reflectionBn:'বাংলা ভাবনা',prayer:'English fallback prayer'}];
        window.dispatchEvent(new Event('devotionsLoaded'));
      }, 100);`,
  }));
  await page.goto(`${visitOrigin}/daily-devotion.html?lang=bn`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('#devotionTitle')).toHaveText('বাংলা শিরোনাম');
  await expect(page.locator('#langBn')).toHaveClass(/active/);
  await expect(page.locator('#bibleText')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('[data-devotion-prayer]')).toHaveAttribute('lang', 'en');
  expect(await page.locator('#bibleGatewayLink').evaluate(element => element.matches(':lang(en)'))).toBe(true);
  await page.locator('[data-site-language="en"]').click();
  await expect(page.locator('#devotionTitle')).toHaveText('English title');
  await expect(page.locator('#bibleText')).toHaveAttribute('lang', 'en');
});
