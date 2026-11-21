import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

let entries: string[] = [];

test.skip(!process.env.BASE_URL, 'Requires BASE_URL pointing to a served public-build artifact');

test.beforeAll(() => {
  if (process.env.BASE_URL) entries = readdirSync(resolve(__dirname, '../../content/gallery'))
    .filter(file => /^\d{8}-[^/.]+\.md$/u.test(file));
});

test.beforeEach(async ({ page }) => {
  await page.route('**/content/gallery/', route => route.fulfill({ status: 404, body: 'Not found' }));
});

test('production gallery renders published Markdown without directory listings', async ({ page, request }) => {
  expect(entries.length).toBeGreaterThan(0);
  await page.goto('/gallery.html');
  await expect(page.locator('#galleryGrid .gallery-item')).toHaveCount(entries.length);
  await expect(page.locator('#galleryGrid')).toBeVisible();
  await expect(page.locator('#noPhotos')).toBeHidden();
  await expect(page.locator('#galleryError')).toBeHidden();
  for (const image of await page.locator('#galleryGrid img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const manifest = await request.get('/content/gallery/index.json');
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toEqual(entries.sort().map(file => `/content/gallery/${encodeURIComponent(file)}`));
});

test('empty manifest shows the empty state, not a load error', async ({ page }) => {
  await page.route('**/content/gallery/index.json', route => route.fulfill({ json: [] }));
  await page.goto('/gallery.html');
  await expect(page.locator('#noPhotos')).toBeVisible();
  await expect(page.locator('#galleryGrid')).toBeHidden();
  await expect(page.locator('#galleryError')).toBeHidden();
});

test('local directory listing is a fallback when the manifest is unavailable', async ({ page }) => {
  await page.route('**/content/gallery/index.json', route => route.fulfill({ status: 404 }));
  await page.route('**/content/gallery/', route => route.fulfill({
    contentType: 'text/html',
    body: entries.map(file => `<a href="${encodeURIComponent(file)}">Photo</a>`).join(''),
  }));
  await page.goto('/gallery.html');
  await expect(page.locator('#galleryGrid .gallery-item')).toHaveCount(entries.length);
  await expect(page.locator('#galleryError')).toBeHidden();
});

for (const failure of ['http-error', 'network-error', 'invalid-manifest', 'missing-entry', 'missing-manifest']) {
  test(`gallery distinguishes ${failure} from empty content and can retry`, async ({ page }) => {
    await page.route('**/content/gallery/*.md', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/^category:.*$/m, 'category: Worship Services') });
    });
    await page.route('**/content/gallery/index.json', async route => {
      if (failure === 'network-error') return route.abort();
      if (failure === 'http-error') return route.fulfill({ status: 500, body: 'Unavailable' });
      if (failure === 'missing-manifest') return route.fulfill({ status: 404 });
      if (failure === 'invalid-manifest') return route.fulfill({ json: { invalid: true } });
      return route.fulfill({ json: ['/content/gallery/missing.md'] });
    });
    await page.goto('/gallery.html');
    await expect(page.locator('#galleryError')).toBeVisible();
    await expect(page.locator('#noPhotos')).toBeHidden();
    await expect(page.locator('#galleryGrid')).toBeHidden();
    await page.getByRole('button', { name: 'Special Events', exact: false }).click();
    await expect(page.locator('#galleryError')).toBeVisible();
    await expect(page.locator('#noPhotos')).toBeHidden();
    await page.getByRole('button', { name: 'All Photos', exact: false }).click();
    await page.unroute('**/content/gallery/index.json');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('#galleryGrid .gallery-item')).toHaveCount(entries.length);
    await expect(page.locator('#galleryError')).toBeHidden();
  });
}

test('large manifests load in batches of at most four requests', async ({ page }) => {
  const files = Array.from({ length: 8 }, (_, i) => `/content/gallery/20260101-photo-${i}.md`);
  await page.route('**/content/gallery/index.json', route => route.fulfill({ json: files }));
  const pending: (() => void)[] = [];
  let active = 0;
  let maximum = 0;
  await page.route('**/content/gallery/*.md', async route => {
    maximum = Math.max(maximum, ++active);
    await new Promise<void>(resolve => pending.push(resolve));
    await route.fulfill({ body: '---\ntitle: Photo\nimage: /images/new-gpbc-logo-final.svg\ncategory: Worship Services\n---' });
    active--;
  });
  await page.goto('/gallery.html');
  await expect.poll(() => pending.length).toBe(4);
  pending.splice(0).forEach(release => release());
  await expect.poll(() => pending.length).toBe(4);
  pending.splice(0).forEach(release => release());
  await expect(page.locator('#galleryGrid .gallery-item')).toHaveCount(8);
  expect(maximum).toBeLessThanOrEqual(4);
});

test('missing retry control does not break gallery initialization', async ({ page }) => {
  await page.route('**/gallery.html', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('id="retryGallery"', 'id="missingRetry"') });
  });
  await page.goto('/gallery.html');
  await expect(page.locator('#galleryGrid .gallery-item')).toHaveCount(entries.length);
});
