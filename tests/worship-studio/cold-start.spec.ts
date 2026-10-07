import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const studioUrl = 'http://127.0.0.1:8080/worship-studio/';

test('fresh direct Studio startup, reload and cache-busted load expose the real runtime/catalog and four modes', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const responses: { path: string; status: number }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => responses.push({
    path: new URL(response.url()).pathname, status: response.status()
  }));
  try {
    expect(await page.evaluate(() => typeof Reflect.get(window, 'GPBCSongbookPresentation'))).toBe('undefined');
    for (const navigation of ['direct', 'reload', 'cache-busted']) {
      if (navigation === 'reload') await page.reload();
      else await page.goto(navigation === 'direct' ? studioUrl : `${studioUrl}?cold-start=${Date.now()}`);
      await expect(page.locator('#catalogCount')).toHaveText('1,492 real Songbook songs');
      await expect(page.getByText('Catalog unavailable', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => typeof Reflect.get(window, 'GPBCSongbookPresentation'))).toBe('object');
      await page.getByLabel('Search title or lyrics').fill('আর কোন নাম নাই');
      await expect(page.locator('.search-result').filter({ hasText: '#117 ·' })).toBeVisible();
    }
    for (const path of ['/songs-data.js', '/songs-catalog.js', '/english-songbook-data.js',
      '/song-chord-alignments.js', '/english-songbook-alignment.js', '/songbook-app.js',
      '/worship-studio/studio-app.mjs', '/worship-studio/presentation-modes.mjs']) {
      expect(responses.some(response => response.path === path && response.status === 200), path).toBe(true);
    }
    await page.locator('.search-result').filter({ hasText: '#117 ·' })
      .getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    for (const mode of ['Congregation', 'Musician', 'Phonetic + Chords', 'Phonetic']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await expect(page.locator('.line-editor textarea').first()).toHaveValue(
        mode.startsWith('Phonetic') ? 'Ar kono nam nai, je name jibon pai,' : 'আর কোন নাম নাই, যে নামে জীবন পাই,');
      await expect(page.locator('.slide-canvas__serial').first()).toHaveText(/^1\/\d+$/);
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('cold startup awaits a delayed versioned runtime and avoids the actual pre-facade unversioned reader', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const oldReader = execFileSync('git', ['show', 'HEAD:songbook-app.js'], { encoding: 'utf8' });
  let releaseRuntime: () => void = () => {};
  const runtimeGate = new Promise<void>(resolve => { releaseRuntime = resolve; });
  let unversionedRequests = 0;
  let unversionedModules = 0;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/songbook-app.js*', async route => {
    if (!new URL(route.request().url()).searchParams.has('studio-runtime')) {
      unversionedRequests += 1;
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: oldReader });
    } else {
      await runtimeGate;
      await route.continue();
    }
  });
  const previousAdapter = readFileSync('worship-studio/songbook-adapter.mjs', 'utf8')
    .replace('export function loadClassicScript', 'function loadClassicScript');
  await page.route('**/worship-studio/*.mjs*', async route => {
    if (new URL(route.request().url()).searchParams.has('studio-startup')) {
      await route.continue();
    } else {
      unversionedModules += 1;
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: previousAdapter });
    }
  });
  try {
    const requested = page.waitForRequest(request => request.url().includes('songbook-app.js?studio-runtime='));
    await page.goto(studioUrl, { waitUntil: 'domcontentloaded' });
    await requested;
    expect(await page.evaluate(() => typeof Reflect.get(window, 'GPBCSongbookPresentation'))).toBe('undefined');
    await expect(page.locator('#catalogCount')).toHaveText('Loading catalog…');
    await expect(page.getByText('Catalog unavailable', { exact: true })).toHaveCount(0);
    releaseRuntime();
    await expect(page.locator('#catalogCount')).toHaveText('1,492 real Songbook songs');
    expect(await page.evaluate(() => typeof Reflect.get(window, 'GPBCSongbookPresentation'))).toBe('object');
    expect(unversionedRequests).toBe(0);
    expect(unversionedModules).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    releaseRuntime();
    await context.close();
  }
});

test('a failed shared runtime load reports its resource failure without fake catalog data', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/songbook-app.js?studio-runtime=*', route => route.abort('failed'));
  try {
    await page.goto(studioUrl);
    await expect(page.locator('#catalogCount')).toHaveText('Catalog unavailable');
    await expect(page.locator('#catalogDetail')).toContainText('Could not load ../songbook-app.js?studio-runtime=');
    await expect(page.locator('#generateSlidesButton')).toBeDisabled();
    await expect(page.locator('.search-result')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
