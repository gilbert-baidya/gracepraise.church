import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

async function addSong(page: Page, query: string, id: number) {
  await page.getByLabel('Search title or lyrics').fill(query);
  await page.locator('.search-result').filter({ hasText: `#${id} ·` })
    .getByRole('button', { name: 'Add', exact: true }).click();
}

async function download(page: Page, button: string, destination?: string) {
  const pending = page.waitForEvent('download', { timeout: 120_000 });
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const path = await file.path();
  if (!path) throw new Error('Download has no actual local file.');
  if (destination) await file.saveAs(destination);
  await expect(page.locator('#exportStatus')).toContainText('download requested.');
  return { bytes: await fs.readFile(path), filename: file.suggestedFilename() };
}

test('all church themes style only, preserve manual copies/anchors and persist on reload', async ({ page }) => {
  await page.goto('/worship-studio/');
  await expect(page.getByRole('button', { name: 'Download PPTX', exact: true })).toBeDisabled();
  await addSong(page, 'আর কোন নাম নাই', 117);
  await addSong(page, 'দয়া কর আমার উপর', 696);
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  await expect(page.locator('#exportStatus')).toContainText('slides ready for review and download.');
  await page.locator('.line-editor textarea').first().fill('আর কোন নাম নাই, যে নামে জীবন পাই, আমার');
  const approved = await page.locator('.slide-editor').evaluateAll(cards => cards.map(card => ({
    id: (card as HTMLElement).dataset.slideId,
    lines: [...card.querySelectorAll('textarea')].map(line => line.value),
    anchors: [...card.querySelectorAll('.musician-word')].map(word => ({
      word: word.getAttribute('data-word-index'), text: word.querySelector('.musician-word__lyric')?.textContent,
      chord: word.querySelector('.musician-chords')?.textContent
    }))
  })));
  const master = await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')));
  const ids = await page.locator('#themeSelector option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(ids).toHaveLength(13);
  for (const id of ids) {
    await page.getByLabel('Theme', { exact: true }).selectOption(id);
    await expect(page.locator('.slide-canvas').first()).toHaveAttribute('data-church-theme', id);
    expect(await page.locator('.slide-editor').evaluateAll(cards => cards.map(card => ({
      id: (card as HTMLElement).dataset.slideId,
      lines: [...card.querySelectorAll('textarea')].map(line => line.value),
      anchors: [...card.querySelectorAll('.musician-word')].map(word => ({
        word: word.getAttribute('data-word-index'), text: word.querySelector('.musician-word__lyric')?.textContent,
        chord: word.querySelector('.musician-chords')?.textContent
      }))
    })))).toEqual(approved);
    expect(await page.locator('.slide-canvas').evaluateAll(canvases => canvases.every(canvas =>
      getComputedStyle(canvas).width === '1600px' && getComputedStyle(canvas).height === '900px'))).toBe(true);
  }
  await page.getByLabel('Theme', { exact: true }).selectOption('communion');
  await page.getByLabel('Show section labels').uncheck();
  await expect(page.locator('.slide-canvas__footer').first()).toBeHidden();
  await page.getByLabel('Service date').fill('2026-12-06');
  await page.getByRole('button', { name: 'Save set', exact: true }).click();
  await page.reload();
  await page.getByLabel('Saved Sunday sets').selectOption('sunday-2026-12-06');
  await page.getByRole('button', { name: 'Reload saved set', exact: true }).click();
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('communion');
  await expect(page.getByLabel('Show section labels')).not.toBeChecked();
  await expect(page.locator('.line-editor textarea').first()).toHaveValue(approved[0].lines[0]);
  expect(await page.evaluate(() => JSON.stringify(Reflect.get(window, 'SONGS_DATA')))).toBe(master);
});

test('real downloads preserve all four approved modes, Unicode notes, chords, theme and widescreen imagery', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/worship-studio/');
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByLabel('Service date').fill('2026-10-11');
  await page.getByLabel('Theme', { exact: true }).selectOption('christmas');
  await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
  await page.locator('.line-editor textarea').first().fill('আর কোন নাম নাই, যে নামে জীবন পাই!');
  const originalSlideCount = await page.locator('.slide-editor').count();
  await page.getByRole('button', { name: `Delete slide ${originalSlideCount}`, exact: true }).click();
  await expect(page.locator('.slide-editor')).toHaveCount(originalSlideCount - 1);
  for (const [label, name, mode] of [
    ['Congregation', 'Congregation', 'congregation'], ['Musician', 'Musician', 'musician'],
    ['Phonetic + Chords', 'Phonetic-Chords', 'phoneticChords'], ['Phonetic', 'Phonetic', 'phonetic']
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (mode === 'musician') await page.getByLabel('Key for Songbook 117', { exact: true }).selectOption('E');
    const approved = await page.locator('.slide-editor').evaluateAll(cards => cards.map(card => ({
      lines: [...card.querySelectorAll('textarea')].map(line => line.value),
      serial: card.querySelector('.slide-canvas__serial')?.textContent,
      chords: [...card.querySelectorAll('.musician-chords, .unplaced-chords')].map(chord => chord.textContent),
      font: parseFloat(getComputedStyle(card.querySelector('.slide-canvas__lyrics')!).fontSize)
    })));
    let reference: Buffer | undefined;
    if (mode === 'congregation' || mode === 'musician') {
      await page.locator('.slide-canvas').first().evaluate(canvas => {
        const clone = canvas.cloneNode(true) as HTMLElement;
        clone.id = 'export-reference';
        clone.style.cssText += ';transform:none;position:fixed;left:0;top:0;inset:0 auto auto 0;z-index:10000;';
        document.body.appendChild(clone);
      });
      reference = await page.locator('#export-reference').screenshot();
      await page.locator('#export-reference').evaluate(canvas => canvas.remove());
    }
    const file = await download(page, 'Download PPTX', testInfo.outputPath(`GPBC_2026-10-11_${name}.pptx`));
    expect(file.filename).toBe(`GPBC_2026-10-11_${name}.pptx`);
    const zip = await JSZip.loadAsync(file.bytes);
    expect(Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/u.test(path))).toHaveLength(approved.length);
    const presentation = await zip.file('ppt/presentation.xml')!.async('string');
    const geometry = /<p:sldSz cx="(\d+)" cy="(\d+)"/u.exec(presentation);
    expect(geometry).not.toBeNull();
    expect(Number(geometry![1]) / Number(geometry![2])).toBeCloseTo(16 / 9, 5);
    for (const [index, slide] of approved.entries()) {
      const xml = await zip.file(`ppt/notesSlides/notesSlide${index + 1}.xml`)!.async('string');
      const note = await page.evaluate(xml => {
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        const texts = [...document.getElementsByTagName('a:t')].map(element => element.textContent || '');
        return JSON.parse(texts.find(text => text.startsWith('{"schemaVersion"')) || '');
      }, xml);
      expect(note.mode).toBe(mode);
      expect(note.theme).toBe('christmas');
      expect(note.slides[0].slide.lines).toEqual(slide.lines);
      expect(note.slides[0].pageSerial).toBe(slide.serial);
      expect(note.slides[0].displayedChords).toEqual(slide.chords);
      expect(note.slides[0].lyricFontPx).toBe(slide.font);
      const slideXml = await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string');
      expect(slideXml).toContain('<p:pic>');
    }
    const media = Object.keys(zip.files).filter(path => /^ppt\/media\/.*\.png$/u.test(path));
    expect(media.length).toBeGreaterThan(0);
    const png = await zip.file(media[0])!.async('nodebuffer');
    expect(png.readUInt32BE(16)).toBe(3200);
    expect(png.readUInt32BE(20)).toBe(1800);
    const foreground = await page.evaluate(async base64 => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 3200; canvas.height = 1800;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const data = context.getImageData(260, 400, 2680, 1000).data;
      let lightPixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] > 220 && data[index + 1] > 220 && data[index + 2] > 200) lightPixels += 1;
      }
      return lightPixels;
    }, png.toString('base64'));
    expect(foreground, `${label} must contain rendered lyric glyphs, not a blank background`).toBeGreaterThan(5000);
    if (reference) {
      const difference = await page.evaluate(async ({ actual, reference }) => {
        const read = async (source: string) => {
          const image = new Image();
          image.src = `data:image/png;base64,${source}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 1600; canvas.height = 900;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0, 1600, 900);
          return context.getImageData(0, 0, 1600, 900).data;
        };
        const left = await read(actual);
        const right = await read(reference);
        let sum = 0, samples = 0;
        for (let index = 0; index < left.length; index += 64) {
          for (let channel = 0; channel < 3; channel += 1) {
            sum += Math.abs(left[index + channel] - right[index + channel]);
            samples += 1;
          }
        }
        return sum / samples;
      }, { actual: png.toString('base64'), reference: reference.toString('base64') });
      expect(difference, 'Exported imagery must visually match the real browser preview, including Bengali glyphs and chords').toBeLessThan(12);
      await fs.writeFile(testInfo.outputPath(`${name}-exported-slide.png`), png);
      await fs.writeFile(testInfo.outputPath(`${name}-browser-preview.png`), reference);
    }
    expect(await page.locator('.line-editor textarea').evaluateAll(lines => lines.map(line => (line as HTMLTextAreaElement).value)))
      .toEqual(approved.flatMap(slide => slide.lines));
  }
  await page.getByRole('button', { name: 'Musician', exact: true }).click();
  const slideCount = await page.locator('.slide-editor').count();
  const pdf = await download(page, 'Download PDF', testInfo.outputPath('GPBC_2026-10-11_Musician.pdf'));
  expect(pdf.filename).toBe('GPBC_2026-10-11_Musician.pdf');
  const pdfSource = pdf.bytes.toString('latin1');
  expect(pdfSource.startsWith('%PDF-')).toBe(true);
  expect(pdfSource.match(/\/Type \/Page\b/gu)).toHaveLength(slideCount);
  expect(pdfSource).toContain('/MediaBox [0 0 960. 540.]');
  expect(pdfSource).toContain('/Width 3200');
  const pack = await download(page, 'Download PNG Slides', testInfo.outputPath('GPBC_2026-10-11_Musician.zip'));
  expect(pack.filename).toBe('GPBC_2026-10-11_Musician.zip');
  const pngZip = await JSZip.loadAsync(pack.bytes);
  expect(Object.keys(pngZip.files).filter(path => /^Slide_\d+\.png$/u.test(path))).toHaveLength(slideCount);
  const manifest = JSON.parse(await pngZip.file('approved-presentation.json')!.async('string'));
  expect(manifest.slides).toHaveLength(slideCount);
  expect(manifest.theme).toBe('christmas');
  expect(manifest.slides[0].slide.lines[0]).toBe('আর কোন নাম নাই, যে নামে জীবন পাই,');
  expect(manifest.slides[0].displayedChords).toContain('E');
  expect(errors).toEqual([]);
});

test('seven requested church themes have real congregation and musician review previews', async ({ page }, testInfo) => {
  await page.goto('/worship-studio/');
  await addSong(page, 'দয়া কর আমার উপর', 696);
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
  for (const mode of ['Congregation', 'Musician']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    for (const theme of ['sunday', 'good-friday', 'communion', 'easter', 'christmas', 'victory', 'new-year']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme);
      await expect(page.locator('.slide-editor--overflow')).toHaveCount(0);
      await expect(page.locator('.slide-canvas__serial').first()).toHaveText(/^1\/\d+$/u);
      await page.locator('.slide-frame').first().screenshot({ path: testInfo.outputPath(`${mode}-${theme}.png`) });
    }
  }
});

test('export failure is explicit, never reports success, and unlocks the editor', async ({ page }) => {
  await page.goto('/worship-studio/');
  await addSong(page, 'আর কোন নাম নাই', 117);
  await page.getByRole('button', { name: 'Generate slides', exact: true }).click();
  await page.route('**/vendor/pptxgen.bundle.js*', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Download PPTX', exact: true }).click();
  await expect(page.locator('#exportStatus')).toContainText('Export failed: Could not load');
  await expect(page.getByLabel('Theme', { exact: true })).toBeEnabled();
  await expect(page.locator('#exportStatus')).not.toContainText('Downloaded');
  await expect(page.locator('#exportStatus')).not.toContainText('download requested.');
  await page.unroute('**/vendor/pptxgen.bundle.js*');
  const retried = await download(page, 'Download PPTX');
  expect(retried.filename).toMatch(/_Congregation\.pptx$/u);
});
