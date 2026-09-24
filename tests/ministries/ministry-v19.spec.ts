import { test, expect } from '@playwright/test';

const ROUTES = [
  '/ministries.html', '/ministries/bible-study.html', '/ministries/community-development.html',
  '/ministries/homeless-ministry.html', '/ministries/hospital-ministry.html', '/ministries/kids-ministry.html',
  '/ministries/men-fellowship.html', '/ministries/mission-outreach.html', '/ministries/prison-ministry.html',
  '/ministries/support-missionaries.html', '/ministries/worship-ministry.html', '/ministries/youth-ministry.html',
  '/kids/games/index.html', '/youth/games/index.html'
];

async function openMinistry(page: import('@playwright/test').Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  expect(response?.status(), route).toBeLessThan(400);
  await expect(page.locator('main.ministry-v19')).toBeVisible();
  await expect(page.locator('main.ministry-v19 h1')).toHaveCount(1);
}

test.describe('V19 complete Ministry experience', () => {
  test('all Ministry/resource pages have shared UI, accessibility, and SEO metadata', async ({ page }) => {
    for (const route of ROUTES) {
      await openMinistry(page, route);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(70);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{20,}/);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.{20,}/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /summary/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /https:\/\/gracepraise\.church\//);
      await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content');
    }
  });

  test('landing discovery excludes Youth and avoids unpublished schedules', async ({ page }) => {
    await openMinistry(page, '/ministries.html');
    await expect(page.locator('h1')).toHaveText('Our Ministries');
    await expect(page.locator('body a[href*="youth-ministry"]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('Friday Youth Night');
  });

  test('nested landing route resolves to canonical landing route', async ({ page }) => {
    await page.goto('/ministries/index.html', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/ministries\.html$/);
    await expect(page.locator('main.ministry-v19 h1')).toHaveText('Our Ministries');
  });

  test('all Ministry page links resolve', async ({ page, request, baseURL }) => {
    for (const route of ROUTES) {
      await openMinistry(page, route);
      const paths = await page.locator('main.ministry-v19 a[href]').evaluateAll((links) =>
        Array.from(new Set(links.map((link) => (link as HTMLAnchorElement).href)
          .filter((href) => href.startsWith(window.location.origin))
          .map((href) => new URL(href).pathname)))
      );
      for (const path of paths) {
        expect((await request.get(`${baseURL}${path}`)).status(), `${route} -> ${path}`).toBeLessThan(400);
      }
    }
  });

  test('landing and child pages do not overflow or hide content at every target width', async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 },
      { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      for (const route of ['/ministries.html', '/ministries/worship-ministry.html', '/ministries/youth-ministry.html']) {
        await openMinistry(page, route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${route} at ${viewport.width}`).toBeLessThanOrEqual(1);
        await expect(page.locator('main.ministry-v19 h1')).toBeVisible();
        await expect(page.locator('main.ministry-v19')).not.toHaveCSS('opacity', '0');
      }
    }
  });

  test('day and night theme variables apply to Ministry/resource pages', async ({ page }) => {
    for (const route of ['/ministries.html', '/ministries/worship-ministry.html', '/kids/games/index.html']) {
      await openMinistry(page, route);
      const day = await page.evaluate(() => { document.body.setAttribute('data-theme', 'light'); return getComputedStyle(document.querySelector('.ministry-v19')!).getPropertyValue('--m-paper').trim(); });
      const night = await page.evaluate(() => { document.body.setAttribute('data-theme', 'dark'); return getComputedStyle(document.querySelector('.ministry-v19')!).getPropertyValue('--m-paper').trim(); });
      expect(day).not.toBe(night);
      expect(night).toBe('#0f1a2b');
    }
  });

  test('content remains visible when IntersectionObserver is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined });
    });
    await openMinistry(page, '/ministries.html');
    const visibility = await page.locator('main.ministry-v19 [data-reveal]').evaluateAll((items) =>
      items.map((item) => {
        const style = getComputedStyle(item);
        const rect = item.getBoundingClientRect();
        return { opacity: style.opacity, transform: style.transform, height: rect.height };
      })
    );
    expect(visibility.length).toBeGreaterThan(0);
    visibility.forEach((item) => {
      expect(item.opacity).not.toBe('0');
      expect(item.transform).toBe('none');
      expect(item.height).toBeGreaterThan(0);
    });
  });
});
