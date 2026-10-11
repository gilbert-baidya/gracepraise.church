import { test, expect, type Page } from '@playwright/test';
import { mockSongbookSession, useEmulatedSongbookAuth } from '../fixtures/songbook-session';

async function signIn(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  await popup.getByRole('button', { name: 'Add new account' }).click();
  await popup.getByRole('button', { name: 'Auto-generate user information' }).click();
  await popup.getByRole('button', { name: 'Sign in with Google.com', exact: true }).click();
}

test('loading and SDK failure never expose protected content or start XML loading', async ({ page }) => {
  await mockSongbookSession(page, false, 1500);
  let xmlRequests = 0;
  page.on('request', request => { if (request.url().endsWith('.xml')) xmlRequests++; });
  await page.goto('/bible-slide-builder/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#accessGateTitle')).toHaveText('Checking your Songbook session');
  await expect(page.locator('#builderApp')).toBeHidden();
  await expect(page).toHaveURL(/songbook\.html\?returnTo=%2Fbible-slide-builder%2F/u);
  expect(xmlRequests).toBe(0);
  await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
  await page.goto('/bible-slide-builder/');
  await expect(page.locator('#accessGateTitle')).toHaveText('Unable to verify your Songbook session');
  await expect(page.locator('#builderApp')).toBeHidden();
  expect(xmlRequests).toBe(0);
});

test('real Firebase session: login, return destination, refresh, back navigation and cross-tab logout', async ({ page, context }) => {
  test.setTimeout(90_000);
  await useEmulatedSongbookAuth(page);
  let popups = 0;
  page.on('popup', () => popups++);
  await page.goto('/bible-slide-builder/');
  await expect(page).toHaveURL(/songbook\.html\?returnTo=%2Fbible-slide-builder%2F/u);
  await expect(page.locator('#bibleSlideBuilderLink')).toBeHidden();
  await signIn(page);
  await expect(page).toHaveURL(/\/bible-slide-builder\/$/u);
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
  await page.reload();
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
  await page.getByRole('link', { name: '← Back to Songbook' }).click();
  await expect(page.locator('#userInfo')).toBeVisible();
  await expect(page.locator('#bibleSlideBuilderLink')).toBeVisible();
  const builder = await context.newPage();
  await useEmulatedSongbookAuth(builder);
  await builder.goto('/bible-slide-builder/');
  await expect(builder.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
  await page.getByRole('link', { name: 'Bible Slide Builder', exact: false }).click();
  await expect(page.locator('#sourceLockTitle')).toHaveText('SOURCE LOCK VERIFIED');
  expect(popups).toBe(1);
  await page.getByRole('link', { name: '← Back to Songbook' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#authButton')).toBeVisible();
  await expect(page.locator('#bibleSlideBuilderLink')).toBeHidden();
  await expect(builder).toHaveURL(/songbook\.html\?returnTo=/u);
  await expect(builder.locator('#authButton')).toBeVisible();
  await page.goto('/bible-slide-builder/');
  await expect(page).toHaveURL(/songbook\.html\?returnTo=/u);
  await expect(page.locator('#authButton')).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  await builder.unrouteAll({ behavior: 'wait' });
});

test('review URL is protected and unsafe return destinations are ignored', async ({ page }) => {
  await mockSongbookSession(page, false);
  await page.goto('/bible-slide-builder/review.html');
  await expect(page).toHaveURL(/returnTo=%2Fbible-slide-builder%2Freview\.html/u);
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  await expect(page.locator('.review-card')).toHaveCount(9);
  for (const destination of ['https://evil.example/', '//evil.example/', '/admin/v21/', '/bible-slide-builder/?bypass=true']) {
    await page.goto(`/songbook.html?returnTo=${encodeURIComponent(destination)}`);
    await expect(page.locator('#userInfo')).toBeVisible();
    await expect(page).toHaveURL(/\/songbook\.html\?returnTo=/u);
  }
});
