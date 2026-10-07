import { expect, test, type Page } from '@playwright/test';

async function addSong(page: Page, query: string, id: number) {
  await page.getByLabel('Search title or lyrics').fill(query);
  await page.locator('.search-result').filter({ hasText: `#${id} ·` })
    .getByRole('button', { name: 'Add', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  Reflect.set(page, 'modeErrors', errors);
  await page.goto('/worship-studio/');
  await expect(page.locator('#catalogCount')).toHaveText('1,492 real Songbook songs');
});

test.afterEach(async ({ page }) => {
  expect(Reflect.get(page, 'modeErrors')).toEqual([]);
});

test('real 117 previews all four modes with aligned chords, independent edits, keys and reload', async ({ page }) => {
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
  const originals: Record<string, string> = {
    Congregation: 'আর কোন নাম নাই, যে নামে জীবন পাই,',
    Musician: 'আর কোন নাম নাই, যে নামে জীবন পাই,',
    'Phonetic + Chords': 'Ar kono nam nai, je name jibon pai,',
    Phonetic: 'Ar kono nam nai, je name jibon pai,'
  };
  const before = await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')));
  for (const [mode, original] of Object.entries(originals)) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue(original);
    await expect(page.locator('.slide-canvas').first()).toHaveAttribute('data-theme', 'emerald');
    await expect(page.locator('.slide-canvas__serial').first()).toHaveText(/^1\/\d+$/);
    if (mode === 'Musician' || mode === 'Phonetic + Chords') {
      await expect(page.locator('.musician-word').filter({ hasText: mode === 'Musician' ? 'আর' : 'Ar' }).first()
        .locator('.musician-chords')).toHaveText('D');
      const key = mode === 'Musician' ? 'E' : 'G';
      await page.getByLabel('Key for Songbook 117', { exact: true }).selectOption(key);
      if (mode === 'Phonetic + Chords') await page.getByLabel('Capo for Songbook 117', { exact: true }).selectOption('2');
      await expect(page.locator('.musician-chords').first()).toHaveText(mode === 'Musician' ? 'E' : 'F');
    } else {
      await expect(page.locator('.musician-chords')).toHaveCount(0);
    }
    await page.locator('.line-editor textarea').first().fill(`${original} ${mode} local edit`);
  }
  for (const [mode, original] of Object.entries(originals)) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue(`${original} ${mode} local edit`);
  }
  await page.getByLabel('Service date').fill('2026-10-18');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  await expect(page.locator('#saveStatus')).toContainText('Saved');
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-18');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Phonetic', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const [mode, original] of Object.entries(originals)) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue(`${original} ${mode} local edit`);
    if (mode === 'Musician' || mode === 'Phonetic + Chords') {
      await expect(page.getByLabel('Key for Songbook 117', { exact: true })).toHaveValue(mode === 'Musician' ? 'E' : 'G');
      await expect(page.getByLabel('Capo for Songbook 117', { exact: true })).toHaveValue(mode === 'Musician' ? '0' : '2');
      await expect(page.locator('.unplaced-chords').first()).toContainText('Review positioning');
    }
  }
  expect(await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')))).toBe(before);
});

test('chord editing, logical moves, split/merge/reorder and serials keep anchor data with each line', async ({ page }) => {
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  const initialCount = await page.locator('.slide-editor').count();
  await page.getByLabel('Source chord 1, slide 1, line 1', { exact: true }).fill('C');
  await page.getByLabel('Source chord 1, slide 1, line 1', { exact: true }).press('Tab');
  await expect(page.locator('.musician-chords').first()).toHaveText('C');
  await page.locator('.slide-editor').first().getByRole('button', { name: 'Split slide after this line' }).first().click();
  await expect(page.locator('.slide-editor')).toHaveCount(initialCount + 1);
  await expect(page.locator('.slide-canvas__serial').first()).toHaveText(`1/${initialCount + 1}`);
  await expect(page.locator('.slide-editor').nth(1).locator('textarea').first()).toHaveValue('আত্মার দানে হয় ভরপুর।');
  await expect(page.locator('.slide-editor').nth(1).locator('.musician-chords').nth(1)).toHaveText('Bm');
  await page.getByRole('button', { name: 'Merge slide 1 with next slide', exact: true }).click();
  await expect(page.locator('.slide-editor')).toHaveCount(initialCount);
  await page.locator('.slide-editor').first().getByRole('button', { name: 'Move line to next slide' }).first().click();
  await expect(page.locator('.slide-editor').nth(1).locator('textarea').first()).toHaveValue('আর কোন নাম নাই, যে নামে জীবন পাই,');
  await expect(page.locator('.slide-editor').nth(1).locator('.musician-chords').first()).toHaveText('C');
  await page.getByRole('button', { name: 'Move slide 2 up', exact: true }).click();
  await page.locator('.line-editor textarea').first().fill('আর কোন নাম নাই, যে নামে জীবন পাই, manual');
  await expect(page.locator('.unplaced-chords').first()).toContainText('C');
  await page.locator('.slide-editor').first().getByRole('button', { name: 'Confirm chord word positions' }).first().click();
  await expect(page.locator('.musician-chords').first()).toHaveText('C');
  await page.getByRole('button', { name: 'Congregation', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('আর কোন নাম নাই, যে নামে জীবন পাই,');
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('আর কোন নাম নাই, যে নামে জীবন পাই, manual');
});

test('missing Bangla chords and English PDF anchors are explicit and removing a song clears every mode', async ({ page }) => {
  await addSong(page, 'প্রভু যীশুর মত ভাই', 831);
  await addSong(page, '10,000 reasons', 1411);
  for (const mode of ['Congregation', 'Musician', 'Phonetic + Chords', 'Phonetic']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    if (mode === 'Congregation') await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    if (mode === 'Musician' || mode === 'Phonetic + Chords') {
      await expect(page.getByLabel('Key for Songbook 831', { exact: true })).toBeDisabled();
      await expect(page.locator('.review-note').first()).toContainText('No confirmed chord source available');
      const english = page.locator('.slide-editor').filter({ has: page.locator('.slide-canvas__title', { hasText: '10,000 REASONS' }) }).first();
      await expect(english.locator('.musician-word').filter({ hasText: 'Lord,' }).locator('.musician-chords')).toHaveText('A');
      await expect(english.locator('.musician-word').filter({ hasText: 'soul,' }).first().locator('.musician-chords')).toHaveText('E');
    }
  }
  await page.locator('.selected-song').first().getByRole('button', { name: /^Remove / }).click();
  for (const mode of ['Congregation', 'Musician', 'Phonetic + Chords', 'Phonetic']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.slide-canvas__title')).not.toContainText(['প্রভু যীশুর মত ভাই']);
    await expect(page.locator('.selected-song')).toHaveCount(1);
  }
});

test('real screenshot song 696 keeps four chorded phrases together, removes red overflow, and persists fitted layouts', async ({ page }) => {
  await addSong(page, 'দয়া কর আমার উপর', 696);
  const master = await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')));
  for (const [mode, count, firstLines] of [['Musician', 4, 4], ['Phonetic + Chords', 8, 3]] as const) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.locator('.slide-editor')).toHaveCount(count);
    const first = page.locator('.slide-editor').first();
    await expect(first.locator('textarea')).toHaveCount(firstLines);
    if (mode === 'Phonetic + Chords') {
      await expect(first.locator('textarea').first()).toHaveValue('Doya koro amar upor ohe Jishu doyaban');
    }
    await expect(first.locator('.capacity-label')).toContainText('54pt lyrics · 27pt chords');
    await expect(page.locator('.slide-editor--overflow')).toHaveCount(0);
    await expect(first.locator('.slide-canvas__serial')).toHaveText(`1/${count}`);
    await expect(first.locator('.musician-chords').first()).toContainText('Dm');
    const tiny = await page.locator('.slide-editor').evaluateAll(cards => cards.filter(card => {
      const lines = [...card.querySelectorAll('textarea')];
      return lines.length === 1 && lines[0].value.trim().split(/\s+/u).length <= 1;
    }).length);
    expect(tiny).toBe(0);
    if (mode === 'Musician') {
      await expect(page.locator('.slide-editor').nth(1).locator('textarea').nth(1))
        .toHaveValue('মর্ত্যে কারো শক্তি নাহি, আমায় নিস্তার করিবার;');
      const before = await first.locator('.musician-word').evaluateAll(words => words.map(word => ({
        lyric: word.querySelector('.musician-word__lyric')?.textContent,
        chord: word.querySelector('.musician-chords')?.textContent
      })));
      await page.getByLabel('Key for Songbook 696', { exact: true }).selectOption('E');
      const after = await first.locator('.musician-word').evaluateAll(words => words.map(word => word.querySelector('.musician-word__lyric')?.textContent));
      expect(after).toEqual(before.map(word => word.lyric));
      await expect(first.locator('.musician-chords').first()).toContainText('Em');
      await expect(page.locator('.slide-editor--overflow')).toHaveCount(0);
    }
  }
  await page.getByLabel('Service date').fill('2026-11-15');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gpbc.worship-song-studio.sunday-sets.v1') || '{}')['sunday-2026-11-15']);
  expect(saved.modeSlides.musician[0].chordLayout.fontPoints).toBe(54);
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-15');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await expect(page.locator('.slide-editor')).toHaveCount(4);
  await expect(page.locator('.capacity-label').first()).toContainText('54pt lyrics · 27pt chords');
  await expect(page.locator('.musician-chords').first()).toContainText('Em');
  expect(await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')))).toBe(master);
});

test('adaptive preview reports the actual reduced font, persists it, and warns only beyond the 48pt floor', async ({ page }) => {
  await addSong(page, 'আজ এই শুভদিনে চাহি', 62);
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  const reduced = page.locator('.slide-editor').filter({ hasText: '২। সুখে দুঃখে' }).first();
  await expect(reduced.locator('.capacity-label')).toContainText(/5[0-3]pt lyrics/);
  const sizing = await reduced.locator('.slide-canvas').evaluate(canvas => ({
    size: parseFloat(getComputedStyle(canvas.querySelector('.slide-canvas__lyrics')!).fontSize),
    chord: parseFloat(getComputedStyle(canvas.querySelector('.musician-chords')!).fontSize)
  }));
  expect(sizing.size / sizing.chord).toBeCloseTo(2);
  expect(sizing.size * 0.75).toBeGreaterThanOrEqual(48);
  expect(sizing.size * 0.75).toBeLessThan(54);
  await expect(reduced.locator('.capacity-label')).toHaveAttribute('data-overflow', 'false');
  await page.getByLabel('Service date').fill('2026-11-22');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  const persistedFont = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('gpbc.worship-song-studio.sunday-sets.v1') || '{}')['sunday-2026-11-22'];
    return saved.modeSlides.musician.find((slide: { lines: string[] }) => slide.lines.some(line => line.startsWith('২। সুখে দুঃখে'))).chordLayout.fontPoints;
  });
  expect(persistedFont).toBeCloseTo(sizing.size * 0.75);
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-22');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(reduced.locator('.capacity-label')).toContainText(/5[0-3]pt lyrics/);
  await expect(reduced.locator('.capacity-label')).toContainText(`${persistedFont}pt lyrics · ${persistedFont / 2}pt chords`);
  const first = page.locator('.slide-editor').first();
  for (let count = 0; count < 9; count++) await first.getByRole('button', { name: '+ Add blank line', exact: true }).click();
  await expect(first.locator('.capacity-label')).toContainText('48pt lyrics · 24pt chords — still exceeds safe geometry');
  await expect(first).toHaveClass(/slide-editor--overflow/);
  await expect(first.locator('.slide-canvas__lyrics')).toHaveCSS('font-size', '64px');
  await page.getByRole('button', { name: 'Congregation', exact: true }).click();
  await expect(page.locator('.slide-canvas__lyrics').first()).toHaveCSS('font-size', '72px');
});

test('all 1492 songs preserve runtime text and fit actual adaptive chorded or unchanged phonetic geometry', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const adapterPath = '/worship-studio/songbook-adapter.mjs';
    const layoutPath = '/worship-studio/layout-engine.mjs';
    const modePath = '/worship-studio/presentation-modes.mjs';
    const { loadSongbookCatalog } = await import(adapterPath);
    const { createCanvasLineMeasurer, parseSongSections } = await import(layoutPath);
    const { layoutMode, renderPresentationLine, songbookRuntime, fitChordedPreview, chordedGeometry } = await import(modePath);
    const catalog = await loadSongbookCatalog();
    const runtime = songbookRuntime();
    const measureWidth = createCanvasLineMeasurer();
    const measureChord = createCanvasLineMeasurer({ fontCssPx: 36, fontFamily: 'Arial, sans-serif' });
    const failures: string[] = [];
    const stats: Record<string, { slides: number; sizes: Record<string, number>; oneLineSlides: number; tinySlides: number; multiPageSections: number }> = {};
    const canvas = document.createElement('div');
    canvas.className = 'slide-canvas';
    const title = document.createElement('div');
    title.className = 'slide-canvas__title';
    title.textContent = 'Catalog geometry validation';
    const lyrics = document.createElement('div');
    lyrics.className = 'slide-canvas__lyrics';
    const footer = document.createElement('div');
    footer.className = 'slide-canvas__footer';
    footer.textContent = 'Verse · GPBC';
    const serial = document.createElement('div');
    serial.className = 'slide-canvas__serial';
    serial.textContent = '1/9';
    canvas.append(title, lyrics, footer, serial);
    document.body.appendChild(canvas);
    for (const song of catalog.songs) {
      for (const mode of ['musician', 'phoneticChords', 'phonetic']) {
        const slides = layoutMode([{ songId: song.id }], catalog, mode, { measureWidth, measureChord, runtime });
        const expected = parseSongSections(song).flatMap((section: { lines: string[] }) => section.lines)
          .map((line: string) => mode === 'musician' ? line : runtime.getSongPhoneticLine(song, line)).join('').replace(/\s/gu, '');
        const actual = slides.flatMap((slide: { lines: string[] }) => slide.lines).join('').replace(/\s/gu, '');
        if (actual !== expected) failures.push(`#${song.id} ${mode}: text changed`);
        for (const slide of slides) {
          canvas.dataset.mode = mode;
          lyrics.replaceChildren(...slide.lines.map((line: string, index: number) => {
            const element = document.createElement('div');
            renderPresentationLine(element, line, slide.lineDetails[index], { mode, song, runtime });
            return element;
          }));
          if (mode !== 'phonetic') {
            const layout = fitChordedPreview(canvas);
            stats[mode] ||= { slides: 0, sizes: {}, oneLineSlides: 0, tinySlides: 0, multiPageSections: 0 };
            stats[mode].slides++;
            stats[mode].sizes[String(layout?.fontPoints)] = (stats[mode].sizes[String(layout?.fontPoints)] || 0) + 1;
            if (slide.lines.length === 1) stats[mode].oneLineSlides++;
            if (slide.lines.length === 1 && slide.lines[0].trim().split(/\s+/u).length <= 2) stats[mode].tinySlides++;
            if (!layout || chordedGeometry(canvas).overflow) {
              failures.push(`#${song.id} ${mode} ${slide.sectionCode}: cannot fit at 48pt`);
            }
            for (const word of lyrics.querySelectorAll('.musician-word')) {
              const chord = word.querySelector('.musician-chords');
              const lyric = word.querySelector('.musician-word__lyric');
              if (chord?.textContent && chord.getBoundingClientRect().bottom > (lyric?.getBoundingClientRect().top || 0) + 1) {
                failures.push(`#${song.id} ${mode}: chord/lyric collision`);
              }
            }
          } else {
            canvas.removeAttribute('style');
            const height = [...lyrics.children].reduce((sum, row) => sum + (row instanceof HTMLElement ? row.offsetHeight : 0), 0);
            if (height > 360 || lyrics.scrollWidth > lyrics.clientWidth + 1) {
              failures.push(`#${song.id} ${mode} ${slide.sectionCode}: ${height}px, ${lyrics.scrollWidth}/${lyrics.clientWidth}px`);
            }
          }
        }
        if (mode !== 'phonetic') {
          for (const section of parseSongSections(song)) {
            if (slides.filter((slide: { sectionCode: string }) => slide.sectionCode === section.code).length > 1) stats[mode].multiPageSections++;
          }
        }
      }
    }
    canvas.remove();
    return { failures, stats };
  });
  await testInfo.attach('adaptive-catalog-metrics', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.failures).toEqual([]);
});

test('musician-first saved sets generate only unvisited modes and regeneration replaces only the active mode', async ({ page }) => {
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await page.locator('.line-editor textarea').first().fill('Musician manual copy');
  await page.getByLabel('Service date').fill('2026-11-01');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-01');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('Musician manual copy');
  await page.getByRole('button', { name: 'Congregation', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('আর কোন নাম নাই, যে নামে জীবন পাই,');
  await page.locator('.line-editor textarea').first().fill('Congregation manual copy');
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('আর কোন নাম নাই, যে নামে জীবন পাই,');
  await page.getByRole('button', { name: 'Congregation', exact: true }).click();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue('Congregation manual copy');
});
