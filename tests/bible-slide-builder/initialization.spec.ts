import { test, expect } from '@playwright/test';
import { mockSongbookSession } from '../fixtures/songbook-session';

test.beforeEach(async ({ page }) => {
  await mockSongbookSession(page);
});

test('source-dependent controls reject early interaction and become ready only after initialization', async ({ page }) => {
  let releaseSources: () => void = () => {};
  const sourcesReady = new Promise<void>(resolve => { releaseSources = resolve; });
  await page.route('**/data/bible/source/*.xml', async route => {
    await sourcesReady;
    await route.continue();
  });
  try {
    await page.goto('/bible-slide-builder/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#builderApp')).toBeVisible();
    await expect(page.locator('#sourceLockTitle')).toHaveText('VERIFYING SOURCES');
    await expect(page.locator('#builderControls')).toHaveAttribute('aria-busy', 'true');
    for (const control of ['fastReference', 'parseReferenceButton', 'addPassageButton', 'languageMode',
      'generateSlidesButton', 'reviewSetButton', 'saveSetButton', 'downloadPng']) {
      await expect(page.locator(`#${control}`)).toBeDisabled();
    }
    await page.locator('#fastReference').evaluate(input => input.focus());
    await page.keyboard.type('Genesis 1:2-8');
    await page.locator('#parseReferenceButton').evaluate(button => button.click());
    await page.locator('#addPassageButton').evaluate(button => button.click());
    await expect(page.locator('#fastReference')).toHaveValue('');
    await expect(page.locator('#passageCount')).toHaveText('0');
    releaseSources();
    await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
    await expect(page.locator('#builderControls')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#parseReferenceButton')).toBeEnabled();
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('en');
    await page.getByLabel('Fast reference entry').fill('Genesis 1:2-8');
    await page.getByRole('button', { name: 'Parse', exact: true }).click();
    await expect(page.locator('#addPassagePreview')).toContainText('Genesis 1:2');
    await page.locator('#addPassageButton').click();
    await expect(page.locator('#passageCount')).toHaveText('1');
    const reference = await page.evaluate(() => {
      const app = Reflect.get(window, '__GPBCBibleSlideBuilder');
      return { start: app.currentSet.passages[0].startVerse, end: app.currentSet.passages[0].endVerse };
    });
    expect(reference).toEqual({ start: 2, end: 8 });
  } finally {
    releaseSources();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('XML failure keeps controls disabled and offers a working retry without another login', async ({ page }) => {
  await page.route('**/data/bible/source/*.xml', route =>
    route.fulfill({ status: 503, body: 'Temporary source failure' }));
  await page.goto('/bible-slide-builder/');
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE CHECK FAILED');
  await expect(page.locator('#appNotice')).toContainText('Retry initialization');
  await expect(page.locator('#parseReferenceButton')).toBeDisabled();
  await expect(page.locator('#addPassageButton')).toBeDisabled();
  await page.unroute('**/data/bible/source/*.xml');
  await page.getByRole('button', { name: 'Retry initialization' }).click();
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
  await expect(page.locator('#parseReferenceButton')).toBeEnabled();
  await expect(page.locator('#retryInitialization')).toBeHidden();
  await expect(page.locator('#builderApp')).toBeVisible();
});
