import { expect, test } from '@playwright/test';

test('fresh Studio supports real phonetic title/lyric search alongside Bangla and English without duplicates', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/worship-studio/');
  await expect(page.locator('#catalogCount')).toHaveText('1,492 real Songbook songs');
  const anchors = await page.evaluate(() => {
    const runtime = (window as unknown as {
      GPBCSongbookPresentation: { getSongPhoneticLine(song: { id: number }, line: string): string }
    }).GPBCSongbookPresentation;
    return ['দয়া করো আমার উপর', 'ওহে যীশু দয়াবান', 'তুমি নরের নিস্তারের কর্তা']
      .map(line => runtime.getSongPhoneticLine({ id: 0 }, line));
  });
  expect(anchors).toEqual(['Doya koro amar upor', 'ohe Jishu doyaban', 'Tumi norer nistarer korta']);
  for (const [query, id] of [
    ['doya', 2], ['AR-kono nam nai!', 117], ['atmar dane hoy bhorpur', 117],
    ['আর কোন নাম নাই', 117], ['10,000 reasons', 1411], ['worship his holy name', 1411]
  ] as const) {
    await page.getByLabel('Search title or lyrics').fill(query);
    const result = page.locator('.search-result').filter({ hasText: `#${id} ·` });
    await expect(result).toHaveCount(1);
    await expect(result).toBeVisible();
    if (/^[a-z]/iu.test(query) && id < 1411) await expect(result).toContainText('phonetic match');
    const ids = await page.locator('.search-result__id').allTextContents();
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(errors).toEqual([]);
});

test('public Songbook uses cached active phonetics for doya, title/lyric and Bangla/English searches', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/songbook.html');
  for (const [query, title] of [
    ['  DOYA! ', 'অনেক আগের কথা'], ['Ar-kono nam nai', 'আর কোন নাম নাই'],
    ['atmar dane hoy bhorpur', 'আর কোন নাম নাই'], ['আর কোন নাম নাই', 'আর কোন নাম নাই'],
    ['10,000 reasons', '10,000 REASONS'], ['worship his holy name', '10,000 REASONS']
  ]) {
    if (query === '10,000 reasons') {
      await page.getByRole('group', { name: 'Song language', exact: true })
        .getByRole('button', { name: 'English 82', exact: true }).click();
    }
    await page.locator('#searchInput').fill(query);
    await expect(page.locator('.song-card').filter({ hasText: title }).first()).toBeVisible();
    const ids = await page.locator('.song-card').evaluateAll(cards => cards.map(card => (card as HTMLElement).dataset.songId));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(errors).toEqual([]);
});
