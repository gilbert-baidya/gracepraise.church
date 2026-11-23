import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { common, pages, titles, translate } from '../js/bangla-draft.mjs';

test('the draft contains eight body catalogs and translated public titles', () => {
  assert.equal(Object.keys(pages).length, 8);
  assert.equal(Object.keys(titles).length, 48);
  for (const title of Object.values(titles)) {
    assert.match(title, /[\u0980-\u09ff]/);
    assert.doesNotMatch(title, /· বাংলা$/);
  }
  for (const dictionary of [common, ...Object.values(pages)]) {
    for (const [en, bn] of Object.entries(dictionary)) {
      assert.ok(en.length && typeof bn === 'string' && bn.length, en);
      assert.match(bn, /[\u0980-\u09ff]/, en);
      assert.doesNotMatch(en + bn, /\uFFFD/, en);
    }
  }
});

test('prose, decorated labels and calendar dates have Bengali drafts', () => {
  assert.equal(translate('Your Prayer Request', '/prayer-request'), 'আপনার প্রার্থনার অনুরোধ');
  assert.equal(translate('⛪ Worship Service', '/calendar'), '⛪ উপাসনা');
  assert.equal(translate('Wednesday, November 25, 2026', '/calendar'), 'বুধবার, ২৫ নভেম্বর, ২০২৬');
  assert.equal(translate('Sun, Nov 1', '/calendar'), 'রবিবার, ১ নভেম্বর');
  assert.equal(translate('January 2027', '/calendar'), 'জানুয়ারি ২০২৭');
  assert.equal(translate('Sunday, December 6, 2026 at 5:00 PM PT', '/index'),
    'রবিবার, ৬ ডিসেম্বর, ২০২৬, সন্ধ্যা ৫:০০টা (প্যাসিফিক সময়)');
});

test('empty, unknown, inherited and user-authored strings are not guessed', () => {
  for (const text of ['', 'constructor', 'toString', '__proto__', '<img src=x onerror=alert(1)>',
    'A private prayer that is not a UI label', 'Grace and Praise Bangladeshi Church',
    '1325 Richardson Street, San Bernardino, CA 92408']) {
    assert.equal(translate(text, '/prayer-request'), null, text);
  }
  assert.equal(translate('Your Prayer Request', '/daily-devotion'), null);
});

test('scripture excerpts reuse the repository Bible source', async () => {
  const bible = await readFile(new URL('../data/bible/source/bn-bsi-2016-ov.xml', import.meta.url), 'utf8');
  const prayer = pages['/prayer-request']['“Cast all your anxiety on Him because He cares for you.”'];
  assert.ok(bible.includes(prayer.slice(1, -1)));
  for (const [en, bn] of Object.entries(pages['/index'])) {
    if (en.startsWith('Matthew ')) assert.ok(bn.startsWith('মথি '));
    if (en.startsWith('"')) assert.ok(bible.includes(bn.match(/^“([^”]+)”/)[1]), en);
  }
});
