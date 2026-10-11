import { test, expect } from '@playwright/test';
import { mockSongbookSession } from '../fixtures/songbook-session';

test('Songbook retains search, both archives, phonetic reader and chord controls', async ({ page }) => {
  await mockSongbookSession(page);
  await page.goto('/songbook.html');
  await expect(page.locator('#userInfo')).toBeVisible();
  const sidebar = page.locator('#songbookFilterSidebar');
  await sidebar.locator('[data-language="bangla"]').click();
  await expect(page.locator('#songList .song-card').first()).toBeVisible();
  await page.locator('#songList .song-card').first().click();
  await expect(page.locator('#songModal')).toBeVisible();
  const bangla = await page.locator('#songContent').textContent();
  await page.locator('#togglePhonetic').click();
  await expect(page.locator('#togglePhonetic')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#songContent')).not.toHaveText(bangla || '');
  await page.locator('#toggleChords').click();
  await expect(page.locator('#toggleChords')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Close song reader' }).click();
  await sidebar.locator('[data-language="english"]').click();
  await expect(page.locator('#songList .song-card').first()).toBeVisible();
  const title = await page.locator('#songList .song-card .songbook-v18__song-title').first().textContent();
  await page.getByRole('searchbox', { name: 'Search songs' }).fill(title?.trim() || '');
  await expect(page.locator('#songList .song-card').first()).toContainText(title?.trim() || '');
  await page.locator('#songList .song-card').first().click();
  await expect(page.locator('#songContent')).not.toBeEmpty();
});
