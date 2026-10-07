import { test, expect } from '@playwright/test';

const routes = [
  '/index.html', '/songbook.html', '/admin/index.html', '/admin/v21/index.html',
  '/about.html', '/ministries.html', '/give.html', '/prayer-request.html', '/plan-visit.html'
];

for (const route of routes) {
  test(`production artifact preserves ${route} and its existing local assets`, async ({ page, request }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    expect(await response?.body()).toEqual(await (await request.get(`http://127.0.0.1:8080${route}`)).body());
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveTitle(/404|Error response/i);
    const assets = await page.locator('script[src], link[rel="stylesheet"][href], img[src]').evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('src') || node.getAttribute('href') || '')
        .filter(value => value && !/^(?:[a-z]+:|\/\/)/i.test(value)));
    for (const asset of [...new Set(assets)]) {
      const url = new URL(asset, page.url());
      const artifact = await request.get(url.href);
      const source = await request.get(`http://127.0.0.1:8080${url.pathname}${url.search}`);
      if (source.ok()) {
        expect(artifact.ok(), `Missing artifact asset: ${route} → ${asset}`).toBe(true);
        expect(await artifact.body(), asset).toEqual(await source.body());
      } else {
        expect(artifact.status(), `Existing missing source asset: ${asset}`).toBe(source.status());
      }
    }
  });
}

test('production server has no Studio or development files at direct URLs', async ({ request }) => {
  for (const route of ['/worship-studio/', '/worship-studio/index.html',
    '/worship-studio/studio-app.mjs', '/worship-studio/studio.css',
    '/worship-studio/vendor/jspdf.umd.min.js', '/worship-studio/chord-propagation.mjs',
    '/worship-studio/presentation-modes.mjs', '/worship-studio/slide-export.mjs',
    '/tests/production-artifact.test.mjs', '/node_modules/openai/package.json',
    '/scripts/build-production.mjs', '/.env', '/test-dashboard.html']) {
    expect((await request.get(route)).status(), route).toBe(404);
  }
});
