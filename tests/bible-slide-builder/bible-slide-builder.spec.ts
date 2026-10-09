import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const testOrigin = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:8080');
const testPort = testOrigin.port || '80';

async function addReference(page: Page, reference: string) {
  await page.getByLabel('Fast reference entry').fill(reference);
  await page.getByRole('button', { name: 'Parse' }).click();
  await expect(page.locator('#parsedReference')).toContainText('Parsed:');
  await page.getByRole('button', { name: 'Add passage' }).click();
}

async function openBuilder(page: Page) {
  await page.goto('/bible-slide-builder/');
  await expect(page.locator('#builderApp')).toBeVisible();
  await expect(page.locator('#localAccessGate')).toBeHidden();
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
}

test.describe('GPBC Bible Slide Builder local milestone', () => {
  test.beforeEach(async ({ page }) => {
    await openBuilder(page);
  });

  test('loads locked XML, generates exact Bangla and bilingual known passages without clipping', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await addReference(page, 'Psalm 23:1-4');
    await page.getByRole('button', { name: 'Generate slides' }).click();
    await expect(page.locator('.scripture-slide-editor')).not.toHaveCount(0);
    await expect(page.locator('.scripture-reference-ribbon').first()).toContainText('Psalms 23:1');
    await expect(page.locator('.scripture-reference-ribbon').first()).toContainText('গীতসংহিতা ২৩:১');
    await expect(page.locator('.scripture-verse--bn .scripture-verse__text').first())
      .toHaveText('সদাপ্রভু আমার পালক, আমার অভাব হইবে না।');
    await expect(page.locator('.scripture-slide-editor--overflow')).toHaveCount(0);
    expect(await page.locator('.scripture-verse--bn').first().evaluate(node => getComputedStyle(node).fontSize)).toBe('72px');

    await page.getByLabel('Language').selectOption('bilingual');
    await expect(page.locator('.scripture-verse--en .scripture-verse__text').first())
      .toHaveText('A psalm of David. The LORD is my shepherd, I shall not be in want.');
    const pairs = await page.locator('.scripture-pair').evaluateAll(nodes => nodes.map(node => ({
      verse: (node as HTMLElement).dataset.verse,
      bn: node.querySelector('.scripture-verse--bn')?.textContent,
      en: node.querySelector('.scripture-verse--en')?.textContent
    })));
    expect(pairs.every(pair => pair.verse && pair.bn?.trim().startsWith(pair.verse === '1' ? '১' : '') && pair.en)).toBe(true);
    await expect(page.locator('.scripture-slide-editor--overflow')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('supports multiple passages, theme-only restyling, save/reload, and source-safe manual layout', async ({ page }) => {
    await addReference(page, 'John 3:16-18');
    await addReference(page, 'John 14:1-6');
    await addReference(page, 'Romans 8:31-34');
    await expect(page.locator('.passage-item')).toHaveCount(3);
    await page.getByLabel('Language').selectOption('bilingual');
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const before = await page.evaluate(() => (window as any).__GPBCBibleSlideBuilder.currentSet.slides
      .flatMap((slide: any) => slide.segments.map((segment: any) => [segment.verseNumber, segment.bnText, segment.enText])));
    await page.getByLabel('Theme').selectOption('bangla-heritage');
    await expect(page.locator('.scripture-canvas').first()).toHaveAttribute('data-scripture-theme', 'bangla-heritage');
    const afterTheme = await page.evaluate(() => (window as any).__GPBCBibleSlideBuilder.currentSet.slides
      .flatMap((slide: any) => slide.segments.map((segment: any) => [segment.verseNumber, segment.bnText, segment.enText])));
    expect(afterTheme).toEqual(before);

    await page.getByLabel('Service date').fill('2026-10-12');
    await page.getByLabel('Set name').fill('Midweek Scripture');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await expect(page.locator('#saveStatus')).toContainText('revision 1');
    await page.getByRole('button', { name: 'Split slide at a safe source boundary' }).first().click();
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await expect(page.locator('#saveStatus')).toContainText('revision 2');
    const savedSlides = await page.locator('.scripture-slide-editor').count();
    await page.reload();
    await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
    await page.getByLabel('Saved Scripture sets').selectOption('2026-10-12-midweek-scripture');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.locator('.scripture-slide-editor')).toHaveCount(savedSlides);
    await expect(page.locator('#saveStatus')).toContainText('revision 2');
    await expect(page.locator('.scripture-slide-editor--overflow')).toHaveCount(0);
  });

  test('loads and persists the four-passage visual review set in Bangla', async ({ page }) => {
    await page.getByRole('button', { name: 'Load review set' }).click();
    await expect(page.locator('.passage-item')).toHaveCount(4);
    await expect(page.getByLabel('Set name')).toHaveValue('Bible Slide Builder Review');
    await expect(page.getByLabel('Language')).toHaveValue('bn');
    await expect(page.getByLabel('Theme')).toHaveValue('shepherds-peace');
    await expect(page.locator('.scripture-slide-editor')).not.toHaveCount(0);
    await expect(page.locator('.scripture-slide-editor--overflow')).toHaveCount(0);
    await expect(page.getByLabel('Saved Scripture sets')).toHaveValue(/bible-slide-builder-review/u);
    const references = await page.locator('.passage-item strong').allTextContents();
    expect(references).toEqual(['Psalms 23:1–4', 'John 3:16–18', 'John 14:1–6', 'Romans 8:31–34']);
  });

  test('exports the approved live preview to a PNG package with exact manifest text', async ({ page }) => {
    await addReference(page, 'John 3:16');
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG Slides' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^GPBC_\d{4}-\d{2}-\d{2}_Sunday-Scripture-Set\.zip$/u);
    const file = await download.path();
    expect(file).toBeTruthy();
    const zip = await JSZip.loadAsync(await fs.readFile(file!));
    const names = Object.keys(zip.files).sort();
    expect(names).toContain('Slide_001.png');
    expect(names).toContain('approved-scripture-presentation.json');
    const manifest = JSON.parse(await zip.file('approved-scripture-presentation.json')!.async('string'));
    expect(manifest.resolution).toEqual({ width: 3200, height: 1800 });
    expect(manifest.sourceLock.bn.sha256).toBe('223ef4d4db4d989592dfd84b7f2095e017694bfd76dbe12c9612f906dd27b6b8');
    expect(manifest.slides[0].exactScripture[0].bangla)
      .toBe('কারণ ঈশ্বর জগৎকে এমন প্রেম করিলেন যে, আপনার একজাত পুত্রকে দান করিলেন, যেন, যে কেহ তাঁহাতে বিশ্বাস করে, সে বিনষ্ট না হয়, কিন্তু অনন্ত জীবন পায়।');
    expect(manifest.slides[0].exactScripture[0].english)
      .toBe('"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.');
    const png = await zip.file('Slide_001.png')!.async('nodebuffer');
    expect(png.readUInt32BE(16)).toBe(3200);
    expect(png.readUInt32BE(20)).toBe(1800);
  });
});

test.describe('strict loopback access and Admin launcher safety', () => {
  for (const hostname of ['127.0.0.1', 'localhost', '[::1]']) {
    test(`${hostname} opens the Builder directly`, async ({ page }) => {
      if (hostname === '[::1]') {
        await page.route(`http://[::1]:${testPort}/**`, async route => {
          const url = new URL(route.request().url());
          const response = await route.fetch({ url: `${testOrigin.origin}${url.pathname}${url.search}` });
          await route.fulfill({ response });
        });
      }
      await page.goto(`http://${hostname}:${testPort}/bible-slide-builder/`);
      await expect(page.locator('#builderApp')).toBeVisible();
      await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
    });
  }

  for (const hostname of ['gracepraise.church', 'builder.invalid', 'localhost.example.com', '127.0.0.1.example.com', 'evil-localhost.com', '192.168.1.10']) {
    test(`${hostname} cannot bypass the local gate`, async ({ page, context }) => {
      let xmlRequested = false;
      await page.route(`http://${hostname}/**`, async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('.xml')) xmlRequested = true;
        const response = await route.fetch({ url: `${testOrigin.origin}${url.pathname}${url.search}` });
        await route.fulfill({ response });
      });
      await context.addCookies([{ name: 'localBypass', value: 'true', url: `http://${hostname}/` }]);
      await page.addInitScript(() => {
        localStorage.setItem('localBypass', 'true');
        localStorage.setItem('isLocalDevelopment', 'true');
      });
      await page.goto(`http://${hostname}/bible-slide-builder/?localBypass=true&isLocalDevelopment=true`);
      await expect(page.locator('#localAccessGate')).toBeVisible();
      await expect(page.locator('#builderApp')).toBeHidden();
      expect(xmlRequested).toBe(false);
    });
  }

  test('Admin creates both local Worship Resources links only on exact loopback', async ({ page }) => {
    await page.route('https://www.gstatic.com/**', route => route.abort());
    await page.goto('/admin/v21/index.html');
    await expect(page.locator('#worshipResources')).not.toHaveAttribute('hidden', '');
    await expect(page.locator('#worshipResourceActions a')).toHaveCount(2);
    await expect(page.locator('#worshipResourceActions a').nth(0)).toHaveAttribute('href', /\/worship-studio\/$/u);
    await expect(page.locator('#worshipResourceActions a').nth(1)).toHaveAttribute('href', /\/bible-slide-builder\/$/u);

    const hostname = 'localhost.example.com';
    await page.route(`http://${hostname}/**`, async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `${testOrigin.origin}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    });
    await page.goto(`http://${hostname}/admin/v21/index.html?localBypass=true`);
    await expect(page.locator('#worshipResources')).toHaveAttribute('hidden', '');
    await expect(page.locator('#worshipResourceActions a')).toHaveCount(0);
  });
});

test('review gallery renders nine verified live scenarios', async ({ page }) => {
  await page.goto('/bible-slide-builder/review.html');
  await expect(page.locator('#gallerySourceLock')).toHaveAttribute('data-tone', 'success');
  await expect(page.locator('.review-card')).toHaveCount(9);
  await expect(page.locator('.review-card').filter({ hasText: 'Bangla Heritage' }).locator('.scripture-canvas'))
    .toHaveAttribute('data-scripture-theme', 'bangla-heritage');
  await expect(page.locator('.review-card').filter({ hasText: 'Communion Table' }).locator('.scripture-canvas'))
    .toHaveAttribute('data-scripture-theme', 'communion');
  await expect(page.locator('.review-card').filter({ hasText: 'Bethlehem Night' }).locator('.scripture-canvas'))
    .toHaveAttribute('data-scripture-theme', 'bethlehem');
});
