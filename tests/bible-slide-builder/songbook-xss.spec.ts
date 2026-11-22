import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockSongbookSession } from '../fixtures/songbook-session';

const payload = '<img src=x onerror="window.__songXss = true"><script>window.__songXss = true</script>';
const song = { id: 99001, title: 'প্রশংসা ' + payload, category: payload, lyrics: 'প্রভু প্রশংসা\n' + payload + '\nশেষ লাইন' };

test('sheet-backed catalog, search, reader, service list and bilingual slides render markup literally', async ({ page }) => {
  await mockSongbookSession(page);
  await page.route('**/songs-catalog.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'window.SONGS_CATALOG = ' + JSON.stringify([[song.id, song.title, song.category]]) + ';'
  }));
  await page.route('**/english-songbook-data.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'window.GPBC_ENGLISH_SONGS = [];'
  }));
  await page.route('**/songs-data.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'window.SONGS_DATA = ' + JSON.stringify([song]) + ';'
  }));
  await page.goto('/songbook.html');
  await expect(page.locator('#songList .song-card').first()).toContainText(song.title);
  await expect(page.locator('#v18FeaturedSong')).toContainText(song.title);
  await page.getByRole('searchbox', { name: 'Search songs' }).fill('প্রশংসা');
  await page.locator('#songList .song-card').first().click();
  await expect(page.locator('#songContent')).toContainText(payload);
  await page.locator('#togglePhonetic').click();
  await expect(page.locator('#songContent')).toContainText(payload);
  await page.getByRole('button', { name: 'Close song reader' }).click();
  await page.evaluate(id => (window as any).toggleServicePlaylist(id), song.id);
  await expect(page.locator('#playlistSongs')).toContainText(song.title);
  await page.evaluate(() => (window as any).startPresentation());
  await expect(page.locator('#presentationContent')).toHaveText(song.lyrics.replace(/\n/g, ''));
  await expect(page.locator('#presentationContent br')).toHaveCount(2);
  await page.evaluate(song => {
    window.eval('showBilingualMode = true');
    (window as any).showPresentationMode(song);
  }, song);
  await expect(page.locator('#presentationContent')).toContainText('প্রভু প্রশংসা');
  await expect(page.locator('#presentationContent')).toContainText(payload);
  await expect(page.locator('#songList img, #songList script, #songContent img, #songContent script, #playlistSongs img, #playlistSongs script, #presentationContent img, #presentationContent script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__songXss)).toBeUndefined();
});

test('service removal never interpolates a sheet-backed ID into executable HTML', async ({ page }) => {
  await mockSongbookSession(page);
  await page.goto('/songbook.html');
  await page.evaluate(song => {
    window.eval('servicePlaylist = ' + JSON.stringify([song]));
    (window as any).updateServicePlaylistUI();
  }, { ...song, id: '1);window.__songXss=true;//' });
  await expect(page.locator('#playlistSongs .playlist-title')).toHaveText(song.title);
  await expect(page.locator('#playlistSongs .playlist-remove')).not.toHaveAttribute('onclick');
  await page.locator('#playlistSongs .playlist-remove').evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('#playlistSongs')).toContainText('No songs added yet');
  expect(await page.evaluate(() => (window as any).__songXss)).toBeUndefined();
});

test('legacy sheet renderer escapes every textual field, including unknown languages', async ({ page }) => {
  await page.goto('/__songbook-xss-harness');
  await page.setContent('<div id="songsGrid"></div><div id="songModal"><div id="songDetails"></div></div>');
  await page.addScriptTag({ url: '/songbook.js' });
  await page.evaluate(song => {
    window.eval('songs = ' + JSON.stringify([song]));
    (window as any).displaySongs();
    (window as any).showSong(song.id);
  }, { ...song, language: payload, key: payload, tempo: payload, chords: [payload], preview: payload, submittedBy: payload });
  await expect(page.locator('#songsGrid')).toContainText(payload);
  await expect(page.locator('#songDetails')).toContainText('Language: 🌐 ' + payload);
  await expect(page.locator('#songDetails')).toContainText('শেষ লাইন');
  await expect(page.locator('#songsGrid img, #songsGrid script, #songDetails img, #songDetails script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__songXss)).toBeUndefined();
});

test('empty service and loading/error messages remain plain text', async ({ page }) => {
  await mockSongbookSession(page);
  await page.goto('/songbook.html');
  await page.evaluate(message => {
    window.eval('servicePlaylist = []');
    (window as any).updateServicePlaylistUI();
    (window as any).renderSongDataLoadingState(message);
  }, payload);
  await expect(page.locator('#playlistSongs')).toHaveText('No songs added yet');
  await expect(page.locator('#songList')).toHaveText(payload);
  await expect(page.locator('#songList img, #songList script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__songXss)).toBeUndefined();
});

test('all new-tab Bible Gateway links retain both opener and referrer protection', () => {
  for (const file of ['lent-fasting.html', 'daily-devotion.html']) {
    const links = readFileSync(file, 'utf8').match(/<a\b[^>]*class="[^"]*\bbible-gateway-link\b[^"]*"[^>]*>/g) || [];
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link).toContain('target="_blank"');
      const rel = /rel="([^"]*)"/.exec(link)?.[1].split(/\s+/) || [];
      expect(rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  }
});
