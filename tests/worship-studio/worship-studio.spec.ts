import { expect, test, type Page } from '@playwright/test';

async function addRealSong(page: Page, query: string, id: number) {
  await page.getByLabel('Search title or lyrics').fill(query);
  const result = page.locator('.search-result').filter({ has: page.locator('.search-result__id', { hasText: `#${id} ·` }) });
  await result.getByRole('button', { name: 'Add', exact: true }).click();
}

test.describe('GPBC Worship Song Studio local milestone', () => {
  test.beforeEach(async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    Reflect.set(page, 'studioRuntimeErrors', runtimeErrors);
    await page.goto('/worship-studio/');
    await expect(page.getByText('1,492 real Songbook songs')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    expect(Reflect.get(page, 'studioRuntimeErrors')).toEqual([]);
  });

  test('builds, edits, saves, and reloads a set from the real Songbook', async ({ page }) => {
    await page.getByLabel('Search title or lyrics').fill('অক্ষয় আনন্দ');
    const result = page.locator('.search-result').filter({ hasText: '#1' }).first();
    await expect(result).toContainText('অক্ষয় আনন্দ ধামে');
    await result.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('#selectedSongCount')).toHaveText('1');

    await page.getByRole('button', { name: 'Generate slides' }).click();
    await expect(page.locator('.slide-editor')).not.toHaveCount(0);
    await expect(page.locator('.slide-canvas__lyrics').first()).toContainText('অক্ষয় আনন্দ ধামে');

    const firstLine = page.locator('.line-editor textarea').first();
    await firstLine.fill('অক্ষয় আনন্দ ধামে — Sunday edit');
    await expect(page.locator('.slide-canvas__lyrics').first()).toContainText('Sunday edit');

    await page.getByLabel('Service date').fill('2026-10-11');
    await page.getByLabel('Set name').fill('October Sunday');
    await page.getByRole('button', { name: 'Save set' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved October Sunday' })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'New set' }).click();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-11');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.getByLabel('Set name')).toHaveValue('October Sunday');
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('অক্ষয় আনন্দ ধামে — Sunday edit');
  });

  test('searches lyrics and English titles, handles empty results, and preserves edits during song changes', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await expect(page.locator('#generateSlidesButton')).toBeDisabled();
    await expect(page.locator('#slidesEmpty')).toBeVisible();
    await page.getByLabel('Search title or lyrics').fill('a');
    await expect(page.locator('.search-result')).toHaveCount(0);
    await page.getByLabel('Search title or lyrics').fill('zzzz-no-song-zzzz');
    await expect(page.locator('#searchHelp')).toHaveText('No matching Songbook songs.');
    await addRealSong(page, 'শাশ্বত সুখ', 1);
    await expect(page.locator('.search-result').filter({ hasText: '#1 ·' }).getByRole('button', { name: 'Added' })).toBeDisabled();
    await page.getByRole('button', { name: 'Generate slides' }).click();
    await page.locator('.line-editor textarea').first().fill('আমার স্থানীয় সম্পাদনা');
    await addRealSong(page, '10,000 reasons', 1411);
    await page.locator('.selected-song').nth(1).getByRole('button', { name: / up$/ }).click();
    await expect(page.locator('.selected-song').first()).toContainText('Songbook #1411');
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('আমার স্থানীয় সম্পাদনা');
    await page.locator('.selected-song').first().getByRole('button', { name: /^Remove / }).click();
    await expect(page.locator('#selectedSongCount')).toHaveText('1');
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('আমার স্থানীয় সম্পাদনা');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Generate slides' }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('আমার স্থানীয় সম্পাদনা');
    await page.locator('.selected-song').first().getByRole('button', { name: /^Remove / }).click();
    await expect(page.locator('.slide-editor')).toHaveCount(0);
    await expect(page.locator('#slidesEmpty')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('uses real Bangla verse/chorus order and full chorus repetition without chords', async ({ page }) => {
    await addRealSong(page, 'অগ্রসর হও আজি', 11);
    const song = page.locator('.selected-song').first();
    await song.getByRole('checkbox').check();
    const order = await song.getByRole('textbox').inputValue();
    expect(order.match(/\bC\b/g)?.length).toBeGreaterThan(1);
    await song.getByRole('textbox').fill('C, V1, C');
    await song.getByRole('textbox').press('Tab');
    await expect(song.getByRole('checkbox')).not.toBeChecked();
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const sectionLabels = await page.locator('.slide-canvas__footer').allTextContents();
    expect(sectionLabels[0]).toBe('Chorus · GPBC');
    expect(sectionLabels.at(-1)).toBe('Chorus · GPBC');
    expect(sectionLabels).toContain('Verse 1 · GPBC');
    const chordRows = await page.evaluate(async () => {
      const path = '/worship-studio/layout-engine.mjs';
      const { isChordOnlyLine } = await import(path);
      return [...document.querySelectorAll('.slide-canvas__lyrics > div')]
        .map(line => line.textContent).filter(isChordOnlyLine);
    });
    expect(chordRows).toEqual([]);
  });

  test('splits, merges, moves lines and slides, and flags long Bangla overflow at fixed font size', async ({ page }) => {
    await addRealSong(page, 'অক্ষয় আনন্দ', 1);
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const originalCount = await page.locator('.slide-editor').count();
    const first = page.locator('.slide-editor').first();
    const secondLine = await first.locator('textarea').nth(1).inputValue();
    await first.getByRole('button', { name: 'Split slide after this line' }).first().click();
    await expect(page.locator('.slide-editor')).toHaveCount(originalCount + 1);
    await expect(page.locator('.slide-editor').nth(1).locator('textarea').first()).toHaveValue(secondLine);
    await first.getByRole('button', { name: 'Merge slide 1 with next slide' }).click();
    await expect(page.locator('.slide-editor')).toHaveCount(originalCount);
    const movedLine = await first.locator('textarea').first().inputValue();
    await first.getByRole('button', { name: 'Move line to next slide' }).first().click();
    await expect(page.locator('.slide-editor').nth(1).locator('textarea').first()).toHaveValue(movedLine);
    await page.locator('.slide-editor').nth(1).getByRole('button', { name: 'Move line to previous slide' }).first().click();
    await expect(first.locator('textarea').last()).toHaveValue(movedLine);
    await first.getByRole('button', { name: 'Move slide 1 down' }).click();
    await expect(page.locator('.slide-editor').nth(1).locator('textarea').last()).toHaveValue(movedLine);
    const longLine = 'অক্ষয় আনন্দ ধামে চলরে পথিক মন '.repeat(20);
    await first.locator('textarea').first().fill(longLine);
    await expect(first).toHaveClass(/slide-editor--overflow/);
    await expect(first.locator('.capacity-label')).toContainText('font remains 54pt');
    await expect(first.locator('.slide-canvas__lyrics')).toHaveCSS('font-size', '72px');
    await first.locator('textarea').first().fill('আনন্দ'.repeat(150));
    await expect(first).toHaveClass(/slide-editor--overflow/);
  });

  test('does not merge or move lines across song boundaries', async ({ page }) => {
    await addRealSong(page, 'অক্ষয় আনন্দ', 1);
    await addRealSong(page, '10,000 reasons', 1411);
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const banglaSlides = page.locator('.slide-editor').filter({ has: page.locator('h3', { hasText: 'অক্ষয় আনন্দ' }) });
    const lastBangla = banglaSlides.last();
    await expect(lastBangla.getByRole('button', { name: /Merge slide/ })).toBeDisabled();
    for (const button of await lastBangla.getByRole('button', { name: 'Move line to next slide' }).all()) {
      await expect(button).toBeDisabled();
    }
    const englishText = await page.locator('.slide-editor').filter({ has: page.locator('h3', { hasText: '10,000 Reasons' }) }).first().locator('textarea').first().inputValue();
    await page.locator('.selected-song').first().getByRole('button', { name: /^Remove / }).click();
    await expect(page.locator('.slide-editor').first().locator('textarea').first()).toHaveValue(englishText);
  });

  test('saves multiple Sundays, persists manual edits across page reload, and protects unsaved reloads', async ({ page }) => {
    await addRealSong(page, 'অক্ষয় আনন্দ', 1);
    await page.getByRole('button', { name: 'Generate slides' }).click();
    await page.locator('.line-editor textarea').first().fill('প্রথম রবিবার');
    await page.getByLabel('Service date').fill('2026-10-11');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await page.locator('.line-editor textarea').first().fill('দ্বিতীয় রবিবার');
    await page.getByLabel('Service date').fill('2026-10-18');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-11');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('প্রথম রবিবার');
    await page.locator('.line-editor textarea').first().fill('অসম্পূর্ণ সম্পাদনা');
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-18');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('অসম্পূর্ণ সম্পাদনা');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('দ্বিতীয় রবিবার');
    await page.getByLabel('Service date').fill('');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await expect(page.locator('#saveStatus')).toHaveText('Choose a valid service date before saving.');
  });

  test('surfaces corrupt storage and quota errors without clearing existing data', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('gpbc.worship-song-studio.sunday-sets.v1', '{broken'));
    await page.reload();
    await expect(page.locator('#saveStatus')).toContainText('Browser-local storage failed');
    await addRealSong(page, 'অক্ষয় আনন্দ', 1);
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('gpbc.worship-song-studio.sunday-sets.v1'))).toBe('{broken');
    await page.evaluate(() => {
      localStorage.setItem('gpbc.worship-song-studio.sunday-sets.v1', '{}');
      Storage.prototype.setItem = () => { throw new DOMException('Storage quota exceeded', 'QuotaExceededError'); };
    });
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await expect(page.locator('#saveStatus')).toContainText('quota exceeded');
    expect(await page.evaluate(() => localStorage.getItem('gpbc.worship-song-studio.sunday-sets.v1'))).toBe('{}');
  });

  test('all real-song generated slides fit actual browser text geometry', async ({ page }) => {
    test.setTimeout(90_000);
    const failures = await page.evaluate(async () => {
      await document.fonts.ready;
      const adapterPath = '/worship-studio/songbook-adapter.mjs';
      const layoutPath = '/worship-studio/layout-engine.mjs';
      const { loadSongbookCatalog } = await import(adapterPath);
      const { layoutSong, createCanvasLineMeasurer, songTheme, parseSongSections } = await import(layoutPath);
      const catalog = await loadSongbookCatalog();
      const measureWidth = createCanvasLineMeasurer();
      const failures: string[] = [];
      const canvas = document.createElement('div');
      canvas.className = 'slide-canvas';
      const title = document.createElement('div');
      title.className = 'slide-canvas__title';
      const lyrics = document.createElement('div');
      lyrics.className = 'slide-canvas__lyrics';
      const footer = document.createElement('div');
      footer.className = 'slide-canvas__footer';
      const serial = document.createElement('div');
      serial.className = 'slide-canvas__serial';
      serial.textContent = '1/99';
      canvas.append(title, lyrics, footer, serial);
      document.body.append(canvas);
      for (const song of catalog.songs) {
        const slides = layoutSong(song, { measureWidth });
        const sourceText = parseSongSections(song).flatMap((section: { lines: string[] }) => section.lines).join('').replace(/\s/gu, '');
        const slideText = slides.flatMap((slide: { lines: string[] }) => slide.lines).join('').replace(/\s/gu, '');
        if (sourceText !== slideText) failures.push(`#${song.id}: lyric preservation failure`);
        for (const slide of slides) {
          canvas.dataset.theme = songTheme(song.id);
          title.textContent = song.title;
          footer.textContent = `${slide.sectionLabel} · GPBC`;
          lyrics.replaceChildren(...slide.lines.map((line: string) => {
            const element = document.createElement('div');
            element.textContent = line;
            return element;
          }));
          const renderedHeight = [...lyrics.children].reduce((sum, line) => sum + (line as HTMLElement).offsetHeight, 0);
          if (renderedHeight > 360 || lyrics.scrollWidth > lyrics.clientWidth + 1) {
            failures.push(`#${song.id} ${slide.sectionCode}: height=${renderedHeight}, width=${lyrics.scrollWidth}/${lyrics.clientWidth}`);
          }
        }
      }
      canvas.remove();
      return failures;
    });
    expect(failures).toEqual([]);
  });

  test('premium church themes stay consistent across the set through edits, slide movement, and save/reload without credits', async ({ page }) => {
    await addRealSong(page, 'অক্ষয় আনন্দ', 1);
    await addRealSong(page, 'অগ্রসর হও আজি', 11);
    await page.getByRole('button', { name: 'Generate slides' }).click();
    const firstSong = page.locator('.slide-editor').filter({ has: page.locator('h3', { hasText: 'অক্ষয় আনন্দ' }) });
    const secondSong = page.locator('.slide-editor').filter({ has: page.locator('h3', { hasText: 'অগ্রসর হও আজি' }) });
    expect(await firstSong.count()).toBeGreaterThan(1);
    expect(await secondSong.count()).toBeGreaterThan(1);
    for (const canvas of await firstSong.locator('.slide-canvas').all()) {
      await expect(canvas).toHaveAttribute('data-theme', 'emerald');
    }
    for (const canvas of await secondSong.locator('.slide-canvas').all()) {
      await expect(canvas).toHaveAttribute('data-theme', 'plum');
    }
    const firstBackground = await firstSong.locator('.slide-canvas').first().evaluate(canvas => getComputedStyle(canvas).backgroundImage);
    const secondBackground = await secondSong.locator('.slide-canvas').first().evaluate(canvas => getComputedStyle(canvas).backgroundImage);
    expect(firstBackground).toBe(secondBackground);
    expect(firstBackground).toContain('gradient');
    await page.getByLabel('Theme', { exact: true }).selectOption('good-friday');
    const selectedBackground = await firstSong.locator('.slide-canvas').first().evaluate(canvas => getComputedStyle(canvas).backgroundImage);
    expect(selectedBackground).not.toBe(firstBackground);
    expect(await secondSong.locator('.slide-canvas').first().evaluate(canvas => getComputedStyle(canvas).backgroundImage))
      .toBe(selectedBackground);
    for (const canvas of await page.locator('.slide-canvas').all()) {
      await expect(canvas).toHaveAttribute('data-church-theme', 'good-friday');
    }
    await expect(page.locator('#slidesList')).not.toContainText('চন্ডীচরণ গুহ');
    await expect(page.locator('#slidesList')).not.toContainText('যাকোব কান্তি নাথ বিশ্বাস');
    await firstSong.locator('textarea').first().fill('স্থানীয় থিম সম্পাদনা');
    await firstSong.getByRole('button', { name: 'Split slide after this line' }).first().click();
    await page.getByRole('button', { name: 'Move slide 1 down', exact: true }).click();
    await page.getByLabel('Service date').fill('2026-10-25');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    const before = await page.locator('.slide-canvas').evaluateAll(canvases => canvases.map(canvas => ({
      theme: canvas.getAttribute('data-theme'),
      churchTheme: canvas.getAttribute('data-church-theme'),
      background: getComputedStyle(canvas).backgroundImage,
      lyrics: canvas.querySelector('.slide-canvas__lyrics')?.textContent
    })));
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-25');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    expect(await page.locator('.slide-canvas').evaluateAll(canvases => canvases.map(canvas => ({
      theme: canvas.getAttribute('data-theme'),
      churchTheme: canvas.getAttribute('data-church-theme'),
      background: getComputedStyle(canvas).backgroundImage,
      lyrics: canvas.querySelector('.slide-canvas__lyrics')?.textContent
    })))).toEqual(before);
    await expect(page.locator('#slidesList')).toContainText('স্থানীয় থিম সম্পাদনা');
    await expect(page.locator('.slide-canvas__lyrics').first()).toHaveCSS('font-size', '72px');
  });

  test('older saved slides hide embedded credits without losing manual lyric edits', async ({ page }) => {
    await page.evaluate(() => {
      const id = 'sunday-2026-10-25';
      localStorage.setItem('gpbc.worship-song-studio.sunday-sets.v1', JSON.stringify({
        [id]: {
          id, date: '2026-10-25', name: 'Legacy set', schemaVersion: 1,
          songEntries: [{ songId: 1, sectionOrder: ['V1'], repeatChorus: false }],
          slides: [
            { id: 'legacy-lyrics', songId: 1, songTitle: 'অক্ষয় আনন্দ', sectionLabel: 'Verse 1', lines: ['সংরক্ষিত সম্পাদনা', '-চন্ডীচরণ গুহ'], manual: true },
            { id: 'legacy-credit', songId: 1, songTitle: 'অক্ষয় আনন্দ', sectionLabel: 'Verse 5', lines: ['-চন্ডীচরণ গুহ'], manual: false }
          ]
        }
      }));
    });
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-10-25');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(page.locator('.slide-editor')).toHaveCount(1);
    await expect(page.locator('.line-editor textarea').first()).toHaveValue('সংরক্ষিত সম্পাদনা');
    await expect(page.locator('.slide-canvas')).toHaveAttribute('data-theme', 'emerald');
    await expect(page.locator('#slidesList')).not.toContainText('চন্ডীচরণ গুহ');
    expect(await page.evaluate(() => localStorage.getItem('gpbc.worship-song-studio.sunday-sets.v1'))).toContain('চন্ডীচরণ গুহ');
  });

  test('canvas serials update per song after split, merge, delete, reorder, and save/reload', async ({ page }) => {
    await page.evaluate(() => {
      const id = 'sunday-2026-11-01';
      const slides = [1, 2].flatMap(songId => Array.from({ length: songId === 1 ? 5 : 4 }, (_, index) => ({
        id: `serial-${songId}-${index}`, songId, songTitle: `Song ${songId}`,
        sectionLabel: 'Verse 1', lines: [`প্রথম লাইন ${index}`, 'দ্বিতীয় লাইন'], manual: true
      })));
      localStorage.setItem('gpbc.worship-song-studio.sunday-sets.v1', JSON.stringify({
        [id]: { id, date: '2026-11-01', name: 'Serial check', schemaVersion: 1,
          songEntries: [1, 2].map(songId => ({ songId, sectionOrder: ['V1'], repeatChorus: false })), slides }
      }));
    });
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-01');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    const serials = page.locator('.slide-canvas__serial');
    await expect(serials).toHaveText(['1/5', '2/5', '3/5', '4/5', '5/5', '1/4', '2/4', '3/4', '4/4']);
    await expect(serials.first()).toBeVisible();
    await expect(serials.first()).toHaveCSS('font-size', '36px');
    await page.locator('.slide-editor').first().getByRole('button', { name: 'Split slide after this line' }).first().click();
    await expect(serials).toHaveText(['1/6', '2/6', '3/6', '4/6', '5/6', '6/6', '1/4', '2/4', '3/4', '4/4']);
    await page.getByRole('button', { name: 'Merge slide 1 with next slide', exact: true }).click();
    await expect(serials).toHaveText(['1/5', '2/5', '3/5', '4/5', '5/5', '1/4', '2/4', '3/4', '4/4']);
    await page.getByRole('button', { name: 'Delete slide 1', exact: true }).click();
    await expect(serials).toHaveText(['1/4', '2/4', '3/4', '4/4', '1/4', '2/4', '3/4', '4/4']);
    await page.getByRole('button', { name: 'Move slide 4 down', exact: true }).click();
    const expected = ['1/4', '2/4', '3/4', '1/4', '4/4', '2/4', '3/4', '4/4'];
    await expect(serials).toHaveText(expected);
    const lyrics = await page.locator('.slide-canvas__lyrics').allTextContents();
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-01');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(serials).toHaveText(expected);
    expect(await page.locator('.slide-canvas__lyrics').allTextContents()).toEqual(lyrics);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    const regenerated = await page.locator('.slide-canvas').evaluateAll(canvases => {
      const totals = new Map<string | null, number>();
      const counts = new Map<string | null, number>();
      for (const canvas of canvases) {
        const title = canvas.querySelector('.slide-canvas__title')?.textContent || null;
        totals.set(title, (totals.get(title) || 0) + 1);
      }
      return canvases.every(canvas => {
        const title = canvas.querySelector('.slide-canvas__title')?.textContent || null;
        const count = (counts.get(title) || 0) + 1;
        counts.set(title, count);
        return canvas.querySelector('.slide-canvas__serial')?.textContent === `${count}/${totals.get(title)}`;
      });
    });
    expect(regenerated).toBe(true);
  });

  test('Songbook 831 exact phrase becomes three editable lines and preserves manual structure on reload', async ({ page }) => {
    const expected = [
      '২। যীশু পরম দয়ালু করুণাময়,',
      'তাঁর করুণার সীমা নাই - ২',
      'পাপীর তরে ক্রুশের পরে, যীশু দিলেন প্রাণ - ২'
    ];
    await addRealSong(page, 'প্রভু যীশুর মত ভাই', 831);
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    const index = await page.locator('.slide-editor').evaluateAll(cards => cards.findIndex(card =>
      (card.querySelector('textarea') as HTMLTextAreaElement)?.value.startsWith('২। যীশু পরম')));
    expect(index).toBeGreaterThanOrEqual(0);
    const card = page.locator('.slide-editor').nth(index);
    await expect(card.locator('textarea')).toHaveCount(3);
    expect(await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value))).toEqual(expected);
    await expect(card.locator('.slide-canvas')).toHaveAttribute('data-theme', 'plum');
    const serial = await card.locator('.slide-canvas__serial').textContent();
    await expect(card).not.toHaveClass(/slide-editor--overflow/);
    const geometry = await card.locator('.slide-canvas__lyrics').evaluate(lyrics => ({
      height: [...lyrics.children].reduce((sum, line) => sum + (line as HTMLElement).offsetHeight, 0),
      width: lyrics.scrollWidth,
      availableWidth: lyrics.clientWidth
    }));
    expect(geometry.height).toBeLessThanOrEqual(360);
    expect(geometry.width).toBeLessThanOrEqual(geometry.availableWidth + 1);
    await card.locator('textarea').first().fill(`${expected[0]} ${expected[1]}`);
    await card.locator('textarea').nth(1).fill('ব্যবহারকারীর নিজস্ব লাইন');
    const manuallyEdited = await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value));
    await page.getByLabel('Service date').fill('2026-11-08');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-08');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    expect(await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value))).toEqual(manuallyEdited);
    await expect(card.locator('.slide-canvas__serial')).toHaveText(serial || '');
    await expect(card.locator('.slide-canvas')).toHaveAttribute('data-theme', 'plum');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    expect(await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value))).toEqual(manuallyEdited);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    expect(await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value))).toEqual(expected);
  });

  test('Songbook 831 Slide 2 has three logical repeat-phrase lines, plum theme, and 2/5 serial', async ({ page }) => {
    await addRealSong(page, 'প্রভু যীশুর মত ভাই', 831);
    await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
    const card = page.locator('.slide-editor').nth(1);
    const expected = [
      '১। ভবনদী ভারী দুস্তর পাড়ি তাঁর নামে ভাই',
      'চালাও তরী - ২',
      'নামের বৈঠা বাহিয়া চল, যীশু করবেন পার - ২'
    ];
    await expect(card.locator('textarea')).toHaveCount(3);
    expect(await card.locator('textarea').evaluateAll(inputs => inputs.map(input => (input as HTMLTextAreaElement).value))).toEqual(expected);
    await expect(card.locator('.slide-canvas')).toHaveAttribute('data-theme', 'plum');
    await expect(card.locator('.slide-canvas__serial')).toHaveText('2/5');
    await expect(card).not.toHaveClass(/slide-editor--overflow/);
    const supplied = await page.evaluate(async () => {
      const path = '/worship-studio/layout-engine.mjs';
      const { layoutSong, createCanvasLineMeasurer } = await import(path);
      return layoutSong({ id: 831, lyrics: '১। ভবনদী ভারী দুরন্ত পাড়ি তাঁর নামে ভাই চালাও তরী - ২\nনামের বৈঠা বাইয়া চল, যীশু করবেন পার - ২' },
        { measureWidth: createCanvasLineMeasurer() })[0].lines;
    });
    expect(supplied).toEqual([
      '১। ভবনদী ভারী দুরন্ত পাড়ি তাঁর নামে ভাই',
      'চালাও তরী - ২',
      'নামের বৈঠা বাইয়া চল, যীশু করবেন পার - ২'
    ]);
    await card.locator('textarea').first().fill(`${expected[0]} ${expected[1]}`);
    await page.getByLabel('Service date').fill('2026-11-15');
    await page.getByRole('button', { name: 'Save set', exact: true }).click();
    await page.reload();
    await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-11-15');
    await page.getByRole('button', { name: 'Reload saved set' }).click();
    await expect(card.locator('textarea')).toHaveCount(3);
    await expect(card.locator('textarea').first()).toHaveValue(`${expected[0]} ${expected[1]}`);
    await expect(card.locator('.slide-canvas__serial')).toHaveText('2/5');
  });
});

test('catalog load failure is visible and does not enable generation', async ({ page }) => {
  await page.route('**/songs-data.js', route => route.abort());
  await page.goto('/worship-studio/');
  await expect(page.locator('#catalogCount')).toHaveText('Catalog unavailable');
  await expect(page.locator('#catalogDetail')).toContainText('Could not load');
  await expect(page.locator('#generateSlidesButton')).toBeDisabled();
});

test.describe('loopback-only local authentication bypass', () => {
  for (const hostname of ['127.0.0.1', 'localhost', '[::1]']) {
    test(`${hostname} opens directly without login`, async ({ page }) => {
      if (hostname === '[::1]') {
        await page.route('http://[::1]:8080/**', async route => {
          const url = new URL(route.request().url());
          const response = await route.fetch({ url: `http://127.0.0.1:8080${url.pathname}${url.search}` });
          await route.fulfill({ response });
        });
      }
      await page.goto(`http://${hostname}:8080/worship-studio/`);
      await expect(page.locator('#studioApp')).toBeVisible();
      await expect(page.locator('#localAccessGate')).toBeHidden();
      await expect(page.getByText('1,492 real Songbook songs')).toBeVisible();
      await addRealSong(page, 'অক্ষয় আনন্দ', 1);
      await expect(page.locator('#selectedSongCount')).toHaveText('1');
    });
  }

  for (const hostname of ['gracepraise.church', 'studio.invalid', 'localhost.studio.invalid', '127.0.0.1.studio.invalid', '192.168.1.10']) {
    test(`${hostname} denies bypass including client-side override attempts`, async ({ page, context }) => {
      let fullCatalogRequested = false;
      await page.route(`http://${hostname}/**`, async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/songs-data.js') fullCatalogRequested = true;
        const response = await route.fetch({ url: `http://127.0.0.1:8080${url.pathname}${url.search}` });
        await route.fulfill({ response });
      });
      await context.addCookies([{ name: 'localBypass', value: 'true', url: `http://${hostname}/` }]);
      await page.addInitScript(() => {
        localStorage.setItem('localBypass', 'true');
        localStorage.setItem('isLocalDevelopment', 'true');
      });
      await page.goto(`http://${hostname}/worship-studio/?localBypass=true&isLocalDevelopment=true`);
      await expect(page.locator('#localAccessGate')).toBeVisible();
      await expect(page.locator('#studioApp')).toBeHidden();
      await expect(page.locator('#localAccessGate')).toContainText('does not prevent these files from being published');
      await expect(page.locator('#catalogCount')).toHaveText('Loading catalog…');
      expect(fullCatalogRequested).toBe(false);
    });
  }
});

test('existing Songbook retains real Bangla lyrics, phonetics, chord controls, and English search', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/songbook.html');
  await page.locator('#searchInput').fill('অগ্রসর হও আজি');
  await page.locator('.song-card').filter({ hasText: 'অগ্রসর হও আজি' }).first().click();
  await expect(page.locator('#songModal')).toBeVisible();
  await expect(page.locator('#songContent')).toContainText('অগ্রসর হও আজি');
  await page.locator('#togglePhonetic').click();
  await expect(page.locator('#togglePhonetic')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#songPhoneticTitle')).toBeVisible();
  await page.locator('#togglePhonetic').click();
  await page.locator('#toggleChords').click();
  await expect(page.locator('#toggleChords')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#toggleChords').click();
  const previousKey = await page.locator('#transposeKey').textContent();
  await page.locator('#transposeUp').click();
  await expect(page.locator('#transposeKey')).not.toHaveText(previousKey || '');
  await page.keyboard.press('Escape');
  await page.locator('[data-index-language="english"]').click();
  await page.locator('#searchInput').fill('10,000 reasons');
  await expect(page.locator('.song-card').filter({ hasText: /10,000 Reasons/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
