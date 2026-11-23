import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('interior Bengali typography selects existing same-origin fonts', async () => {
  const css = await read('assets/css/site-language.css');
  assert.match(css, /body:not\(\.homepage\) :lang\(bn\)/);
  assert.match(css, /font-family: 'Noto Sans Bengali', sans-serif !important/);
  for (const weight of [400, 600]) {
    const bytes = await readFile(new URL('../assets/fonts/notosansbengali/notosansbengali-' + weight + '.woff2', import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    assert.match(css, new RegExp('notosansbengali-' + weight + '\\.woff2'));
  }
});

test('glyph-affected pages no longer load Google font styles or preconnects', async () => {
  for (const path of ['bible-reader.html', 'contact.html', 'songbook.html', 'gratitude-fasting.html', 'lent-fasting.html']) {
    assert.doesNotMatch(await read(path), /https:\/\/fonts\.(googleapis|gstatic)\.com/);
  }
});

test('vector adaptation is opt-in on both affected routes without changing event data', async () => {
  for (const path of ['bible-reader.html', 'calendar.html']) {
    assert.match(await read(path), /<script src="js\/decorative-icons\.js" defer><\/script>/);
  }
  const script = await read('js/decorative-icons.js');
  assert.match(script, /MutationObserver/);
  assert.match(script, /createElementNS/);
  assert.doesNotMatch(script, /innerHTML|localStorage|fetch\(/);
});

test('interior contrast rules exclude Home and the PR 18 replacement shell', async () => {
  const css = await read('assets/css/interior-readability.css');
  assert.match(css, /body:not\(\.homepage\):not\(\.fast-accessible\)/);
  assert.match(css, /--interior-gold-text: #765405/);
  assert.match(css, /--interior-gold-text: #e3bd6d/);
  assert.match(css, /max-width: 600px/);
});
