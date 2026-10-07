import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

test('real 696 suggestions retain original words, confidence, manual confirmation, capo, phonetics and exports', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.goto('/worship-studio/');
  await page.getByLabel('Search title or lyrics').fill('দয়া কর আমার উপর');
  await page.locator('.search-result').filter({ hasText: '#696 ·' }).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Service date').fill('2026-10-25');
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  const source = await page.locator('.slide-editor').filter({ hasText: '· Verse 1' }).first()
    .locator('.musician-chords').allTextContents();
  const master = await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')));
  for (const verse of [2, 3, 4]) {
    const cards = page.locator('.slide-editor').filter({ hasText: `· Verse ${verse}` });
    await expect(cards.first().locator('.chord-editor small').first()).toContainText('Suggested from Verse 1');
    await expect(cards.first().locator('.chord-editor small').first()).toContainText('medium confidence');
    expect(await cards.locator('.musician-chords').evaluateAll(elements => elements.filter(element => element.textContent?.trim()).length)).toBeGreaterThan(8);
    for (let index = 0; index < await cards.count(); index++) {
      await cards.nth(index).locator('.slide-canvas').screenshot({ path: testInfo.outputPath(`696-Musician-V${verse}-${index + 1}.png`) });
    }
  }
  const overflow = () => page.locator('.slide-editor--overflow');
  await expect(overflow()).toHaveCount(0);
  const originalAnchors = await page.locator('.slide-editor').evaluateAll(cards => cards.map(card => ({
    section: card.querySelector('h3')?.textContent,
    anchors: Array.from(card.querySelectorAll('.musician-word'), word => ({
      word: word.getAttribute('data-word-index'), chord: word.querySelector('.musician-chords')?.textContent
    }))
  })));
  await page.getByRole('button', { name: 'Phonetic + Chords', exact: true }).click();
  await expect(overflow()).toHaveCount(0);
  for (const verse of [2, 3, 4]) {
    const cards = page.locator('.slide-editor').filter({ hasText: `· Verse ${verse}` });
    for (let index = 0; index < await cards.count(); index++) {
      await cards.nth(index).locator('.slide-canvas').screenshot({ path: testInfo.outputPath(`696-Phonetic-Chords-V${verse}-${index + 1}.png`) });
    }
  }
  const phoneticAnchors = await page.locator('.slide-editor').evaluateAll(cards => cards.map(card => ({
    section: card.querySelector('h3')?.textContent,
    anchors: Array.from(card.querySelectorAll('.musician-word'), word => ({
      word: word.getAttribute('data-word-index'), chord: word.querySelector('.musician-chords')?.textContent
    }))
  })));
  // Both modes anchor through the original token identity; phonetic widths may paginate differently.
  const chords = (items: typeof originalAnchors) => items.flatMap(item => item.anchors).filter(item => item.chord?.trim()).map(item => item.chord);
  expect(chords(phoneticAnchors)).toEqual(chords(originalAnchors));
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await page.getByLabel('Key for Songbook 696').selectOption('E');
  await page.getByLabel('Capo for Songbook 696').selectOption('2');
  const verse2 = page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first();
  const word = verse2.locator('input[aria-label^="Chord 1 word position"]').first();
  await word.fill('2');
  await word.dispatchEvent('change');
  await page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first()
    .getByRole('button', { name: 'Confirm suggested chord positions', exact: true }).first().click();
  await expect(page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first()
    .locator('.chord-editor small').first()).toContainText('Confirmed in this Sunday set');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-25');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first()
    .locator('.chord-editor small').first()).toContainText('Confirmed in this Sunday set');
  await expect(page.getByLabel('Capo for Songbook 696')).toHaveValue('2');
  await expect(page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first()
    .locator('input[aria-label^="Chord 1 word position"]').first()).toHaveValue('2');
  await page.getByRole('button', { name: 'Apply same-song chord pattern for Songbook 696', exact: true }).click();
  await expect(page.locator('#saveStatus')).toContainText('Manual Musician copies preserved');
  await expect(page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first()
    .locator('.chord-editor small').first()).toContainText('Confirmed in this Sunday set');
  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.getByRole('button', { name: 'Download PPTX', exact: true }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  await download.saveAs(testInfo.outputPath('GPBC_2026-10-25_Musician.pptx'));
  const file = await download.path();
  if (!file) throw new Error('No downloaded presentation file.');
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const notes = Object.keys(zip.files).filter(path => /^ppt\/notesSlides\/notesSlide\d+\.xml$/u.test(path));
  const noteText = (await Promise.all(notes.map(path => zip.file(path)!.async('string')))).join('');
  expect(noteText).toContain('sourceSectionLabel');
  expect(noteText).toContain('confirmed');
  expect(noteText).toContain('medium');
  expect(await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')))).toBe(master);
  await page.getByLabel('Capo for Songbook 696').selectOption('0');
  await page.getByLabel('Key for Songbook 696').selectOption('');
  expect(await page.locator('.slide-editor').filter({ hasText: '· Verse 1' }).first()
    .locator('.musician-chords').allTextContents()).toEqual(source);
  expect(runtimeErrors).toEqual([]);
});

test('full real catalog propagation audit uses browser Bangla measurements and never mutates masters', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.goto('/worship-studio/');
  await expect(page.locator('#catalogCount')).toContainText('1,492');
  const result = await page.evaluate(async () => {
    const modulePath = '/worship-studio/chord-propagation.mjs?studio-startup=11';
    const { analyzeSongPropagation } = await import(modulePath);
    const runtime = Reflect.get(window, 'GPBCSongbookPresentation');
    const songs = [...Reflect.get(window, 'SONGS_DATA'), ...Reflect.get(window, 'GPBC_ENGLISH_SONGS')];
    const before = JSON.stringify(songs);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No audit measurement canvas.');
    context.font = '700 72px Noto Sans Bengali, Nirmala UI, Arial, sans-serif';
    const results = songs.map(song => {
      const audit = analyzeSongPropagation(song, { runtime, measureWidth: (text: string) => context.measureText(text).width });
      return { songId: song.id, title: song.title, source: audit.source, candidates: audit.candidates,
        coverage: audit.coverage, families: audit.families, rowCounts: audit.rowStats,
        suggestedRows: [...audit.suggestions.values()].filter(row => row.anchors.length).length };
    });
    const partial = results.filter(song => song.coverage.hasChordData
      && song.coverage.chordedRows < song.coverage.totalRows);
    const candidates = results.filter(song => song.candidates.length);
    const sections = results.flatMap(song => song.candidates);
    return { totalCatalog: songs.length, candidateSongs: candidates.length,
      coverageCounts: {
        zeroChordData: results.filter(song => !song.coverage.hasChordData).length,
        fullyChorded: results.filter(song => song.coverage.hasChordData
          && song.coverage.chordedRows === song.coverage.totalRows).length,
        partiallyChorded: partial.length
      },
      previouslyBlankRowsReceivingSuggestions: results.reduce((sum, song) => sum + song.suggestedRows, 0),
      rowCounts: Object.fromEntries(['high', 'medium', 'low'].map(level =>
        [level, results.reduce((sum, song) => sum + song.rowCounts[level as keyof typeof song.rowCounts], 0)])),
      sectionCounts: Object.fromEntries(['high', 'medium', 'low'].map(level => [level, sections.filter(section => section.confidence === level).length])),
      songCounts: Object.fromEntries(['high', 'medium', 'low'].map(level =>
        [level, partial.filter(song => song.rowCounts[level as keyof typeof song.rowCounts] > 0).length])),
      exclusiveSongCounts: Object.fromEntries(['high', 'medium', 'low'].map(level => [level, partial.filter(song =>
        (song.candidates.some((section: { confidence: string }) => section.confidence === 'high') ? 'high'
          : song.candidates.some((section: { confidence: string }) => section.confidence === 'medium') ? 'medium' : 'low') === level).length])),
      previousAudit: { candidateSongs: 108, highSuggestionSongs: 0, mediumSuggestionSongs: 17, reviewOnlySongs: 91 },
      unchanged: JSON.stringify(songs) === before, songs: results };
  });
  expect(result.totalCatalog).toBe(1492);
  expect(result.unchanged).toBe(true);
  expect(Object.values(result.coverageCounts).reduce((sum, count) => sum + count, 0)).toBe(1492);
  expect(result.rowCounts.high + result.rowCounts.medium).toBe(result.previouslyBlankRowsReceivingSuggestions);
  expect(result.songs.find(song => song.songId === 696)?.candidates).toHaveLength(3);
  expect(result.songs.find(song => song.songId === 1019)?.suggestedRows).toBe(4);
  await fs.writeFile(testInfo.outputPath('same-song-catalog-audit.json'), JSON.stringify(result, null, 2));
  console.log('PROPAGATION AUDIT', JSON.stringify({ ...result, songs: undefined }));
});

test('real multi-template 1019 fills both missing verses by default, persists positions and exports all formats', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/worship-studio/');
  await expect(page.locator('#catalogCount')).toContainText('1,492');
  const masters = await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')));
  await page.getByLabel('Search title or lyrics').fill('ভালবাসি তোমায় ও প্রভু');
  await page.locator('.search-result').filter({ hasText: '#1019 ·' }).getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Service date').fill('2026-11-01');
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  const confirmedSource = await page.locator('.slide-editor').filter({ hasText: '· Verse 4' })
    .locator('.musician-chords').allTextContents();
  await expect(page.locator('.slide-editor').filter({ hasText: '· Verse 4' })
    .locator('.chord-editor small').first()).toContainText('Confirmed source chords');
  for (const mode of ['Musician', 'Phonetic + Chords']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.slide-editor--overflow')).toHaveCount(0);
    for (const verse of [2, 3]) {
      const cards = page.locator('.slide-editor').filter({ hasText: `· Verse ${verse}` });
      const statuses = await cards.locator('.chord-editor').evaluateAll(editors =>
        editors.map(editor => editor.querySelector('small')?.textContent || ''));
      expect(statuses.length).toBeGreaterThanOrEqual(2);
      expect(statuses.every(text => text.includes('Suggested from Verse 1') && text.includes('medium confidence'))).toBe(true);
      await expect(cards.locator('.review-note').filter({ hasText: 'No chord data' })).toHaveCount(0);
      for (let index = 0; index < await cards.count(); index++) {
        await cards.nth(index).screenshot({ path: testInfo.outputPath(`1019-${mode}-V${verse}-${index + 1}-editor.png`) });
        await cards.nth(index).locator('.slide-canvas').screenshot({
          path: testInfo.outputPath(`1019-${mode}-V${verse}-${index + 1}.png`)
        });
      }
    }
  }
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await page.getByLabel('Key for Songbook 1019').selectOption('D');
  await page.getByLabel('Capo for Songbook 1019').selectOption('2');
  await page.getByLabel('Theme', { exact: true }).selectOption('communion');
  const verse2 = () => page.locator('.slide-editor').filter({ hasText: '· Verse 2' }).first();
  await verse2().locator('input[aria-label^="Source chord"]').last().fill('(G)');
  await verse2().locator('input[aria-label^="Source chord"]').last().dispatchEvent('change');
  await verse2().locator('input[aria-label^="Chord 1 word position"]').first().fill('2');
  await verse2().locator('input[aria-label^="Chord 1 word position"]').first().dispatchEvent('change');
  await verse2().getByRole('button', { name: 'Confirm suggested chord positions', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-01');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(verse2().locator('.chord-editor small').first()).toContainText('Confirmed in this Sunday set');
  await expect(verse2().locator('input[aria-label^="Chord 1 word position"]').first()).toHaveValue('2');
  await expect(verse2().locator('input[aria-label^="Source chord"]').last()).toHaveValue('(G)');
  await expect(page.getByLabel('Key for Songbook 1019')).toHaveValue('D');
  await expect(page.getByLabel('Capo for Songbook 1019')).toHaveValue('2');
  const slideCount = await page.locator('.slide-editor').count();
  for (const [button, extension] of [['Download PPTX', 'pptx'], ['Download PDF', 'pdf'], ['Download PNG Slides', 'zip']]) {
    const pending = page.waitForEvent('download', { timeout: 120000 });
    await page.getByRole('button', { name: button, exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const destination = testInfo.outputPath(`GPBC_2026-11-01_Musician.${extension}`);
    await download.saveAs(destination);
    const bytes = await fs.readFile(destination);
    if (extension === 'pdf') expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    else {
      const zip = await JSZip.loadAsync(bytes);
      if (extension === 'pptx') {
        const notes = Object.keys(zip.files).filter(path => /^ppt\/notesSlides\/notesSlide\d+\.xml$/u.test(path));
        expect(notes).toHaveLength(slideCount);
        const contents = (await Promise.all(notes.map(path => zip.file(path)!.async('string')))).join('');
        expect(contents).toContain('patternFamily');
        expect(contents).toContain('confirmed');
      } else {
        const manifest = JSON.parse(await zip.file('approved-presentation.json')!.async('string'));
        expect(manifest.slides).toHaveLength(slideCount);
        expect(JSON.stringify(manifest)).toContain('patternFamily');
        expect(Object.keys(zip.files).filter(path => path.endsWith('.png'))).toHaveLength(slideCount);
      }
    }
  }
  await page.getByLabel('Capo for Songbook 1019').selectOption('0');
  await page.getByLabel('Key for Songbook 1019').selectOption('');
  expect(await page.locator('.slide-editor').filter({ hasText: '· Verse 4' })
    .locator('.musician-chords').allTextContents()).toEqual(confirmedSource);
  expect(await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')))).toBe(masters);
  expect(errors).toEqual([]);
});
