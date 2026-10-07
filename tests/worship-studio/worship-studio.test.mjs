import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createCatalog, searchCatalog } from '../../worship-studio/songbook-adapter.mjs';
import {
    defaultSectionOrder,
    estimateRenderedLines,
    isAttributionLine,
    isChordOnlyLine,
    layoutSong,
    parseSectionOrder,
    parseSongSections,
    segmentLineForWidth,
    SLIDE_THEMES,
    songTheme,
    songPageSerials,
    splitLyricPhrases
} from '../../worship-studio/layout-engine.mjs';
import { STORAGE_KEY, createSetId, listSavedSets, loadSet, saveSet } from '../../worship-studio/studio-storage.mjs';

function readRealCatalog() {
    const context = { window: {} };
    vm.createContext(context);
    for (const filename of ['songs-data.js', 'english-songbook-data.js']) {
        vm.runInContext(fs.readFileSync(new URL(`../../${filename}`, import.meta.url), 'utf8'), context, { filename });
    }
    return createCatalog({
        bengaliSongs: context.window.SONGS_DATA,
        englishSongs: context.window.GPBC_ENGLISH_SONGS
    });
}

class MemoryStorage {
    constructor() {
        this.values = new Map();
    }
    getItem(key) {
        return this.values.get(key) ?? null;
    }
    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

test('real Songbook adapter preserves all stable catalog records', () => {
    const catalog = readRealCatalog();
    assert.deepEqual(catalog.counts, { bangla: 1410, english: 82, total: 1492 });
    assert.equal(catalog.byId.get(1).title, 'অক্ষয় আনন্দ ধামে, চলরে পথিক মন;');
    assert.equal(catalog.byId.get(1492).id, 1492);
    assert.equal(new Set(catalog.songs.map(song => song.id)).size, 1492);
    assert.equal(Object.isFrozen(catalog.byId.get(1)), true);
});

test('catalog search uses real titles and lyric text', () => {
    const catalog = readRealCatalog();
    assert.equal(searchCatalog(catalog, 'অক্ষয় আনন্দ')[0].id, 1);
    assert.equal(searchCatalog(catalog, '10,000 reasons')[0].id, 1411);
});

test('section parser removes chord-only rows and preserves chorus structure', () => {
    const song = {
        id: 99,
        title: 'Structure test',
        lyrics: 'C G Am F\nVerse lyric one\nVerse lyric two\n\nCHORUS\nF C G\nWhole chorus one\nWhole chorus two'
    };
    const sections = parseSongSections(song);
    assert.equal(isChordOnlyLine('C G Am F'), true);
    assert.deepEqual(sections.map(section => section.kind), ['verse', 'chorus']);
    assert.deepEqual(sections[0].lines, ['Verse lyric one', 'Verse lyric two']);
    assert.deepEqual(defaultSectionOrder(sections, true), ['V1', 'C']);
    assert.deepEqual(parseSectionOrder('V1, C, V1, C', sections), ['V1', 'C', 'V1', 'C']);

    const repeated = parseSongSections({
        id: 100,
        title: 'Repeat test',
        lyrics: 'VERSE 1\nFirst verse\n\nCHORUS\nFull chorus\n\nVERSE 2\nSecond verse'
    });
    assert.deepEqual(defaultSectionOrder(repeated, true), ['V1', 'C', 'V2', 'C']);
});

test('auto layout prefers three source lines without shrinking text', () => {
    const song = {
        id: 7,
        title: 'Layout test',
        lyrics: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 7', 'Line 8', 'Line 9'].join('\n')
    };
    const slides = layoutSong(song, { measureWidth: () => 100 });
    assert.equal(slides.length, 3);
    assert.deepEqual(slides.map(slide => slide.lines.length), [3, 3, 3]);
    assert.equal(slides.every(slide => slide.songId === 7), true);
});

test('section balancing prefers 3+2, 3+2+2, and 3+3+2 without mixing sections', () => {
    for (const [count, expected] of [[5, [3, 2]], [7, [3, 2, 2]], [8, [3, 3, 2]]]) {
        const song = { id: 1, lyrics: Array.from({ length: count }, (_, i) => `Lyric ${i}`).join('\n') };
        assert.deepEqual(layoutSong(song, { measureWidth: () => 100 }).map(slide => slide.lines.length), expected);
    }
    const song = { id: 1, lyrics: 'VERSE 1\nFirst lyric\n\nCHORUS\nChorus lyric' };
    assert.deepEqual(layoutSong(song, { measureWidth: () => 100 }).map(slide => slide.sectionCode), ['V1', 'C']);
});

test('wrapping retains source lines when safe and uses fewer lines within rendered capacity', () => {
    const long = 'আনন্দ ধামে '.repeat(10).trim();
    const slides = layoutSong({ id: 1, lyrics: [long, long, long].join('\n') },
        { measureWidth: text => Array.from(text).length * 30 });
    assert.ok(slides.every(slide => estimateRenderedLines(slide.lines, text => Array.from(text).length * 30) <= 4));
    assert.ok(slides.flatMap(slide => slide.lines).every(line => line === long));
});

test('page serials derive per-song counts from current order including interleaved songs', () => {
    const slides = [...Array.from({ length: 5 }, () => ({ songId: 1 })), ...Array.from({ length: 4 }, () => ({ songId: 2 }))];
    assert.deepEqual(songPageSerials(slides), ['1/5', '2/5', '3/5', '4/5', '5/5', '1/4', '2/4', '3/4', '4/4']);
    slides.splice(1, 0, { songId: 2 });
    assert.equal(songPageSerials(slides)[1], '1/5');
    slides.pop();
    assert.equal(songPageSerials(slides).at(-1), '4/4');
    for (const [lineCount, pageCount] of [[13, 5], [12, 4]]) {
        const generated = layoutSong({ id: 1, lyrics: Array.from({ length: lineCount }, (_, i) => `Lyric ${i}`).join('\n') },
            { measureWidth: () => 100 });
        assert.equal(generated.length, pageCount);
        assert.deepEqual(songPageSerials(generated), Array.from({ length: pageCount }, (_, i) => `${i + 1}/${pageCount}`));
    }
});

test('browser-local persistence round trips set-specific slide edits', () => {
    const storage = new MemoryStorage();
    const set = {
        schemaVersion: 1,
        id: createSetId('2026-10-11'),
        date: '2026-10-11',
        name: 'Sunday Worship',
        songEntries: [{ songId: 1, sectionOrder: ['V1'], repeatChorus: false }],
        slides: [{ id: 'slide-1', songId: 1, lines: ['Manual line'], manual: true }]
    };
    saveSet(set, storage);
    const loaded = loadSet(set.id, storage);
    assert.deepEqual(loaded.slides[0].lines, ['Manual line']);
    assert.equal(listSavedSets(storage)[0].id, 'sunday-2026-10-11');
});

test('pre-chorus is not mistaken for the full chorus', () => {
    const sections = parseSongSections({
        id: 99, lyrics: 'VERSE 1\nVerse lyric\n\nPRE-CHORUS\nLead in\n\nCHORUS\nFull chorus'
    });
    assert.deepEqual(sections.map(section => section.kind), ['verse', 'prechorus', 'chorus']);
});

test('wrapped line estimates follow word boundaries and split oversized Bangla tokens', () => {
    const measure = text => Array.from(text).length * 100;
    assert.equal(estimateRenderedLines(['aaaaaa bbbbbb cccccc'], measure, 1000), 3);
    const text = 'আনন্দ'.repeat(50);
    const pieces = segmentLineForWidth(text, measure, 1000);
    assert.equal(pieces.join(''), text);
    assert.ok(pieces.every(piece => measure(piece) <= 1000));
});

test('every real song lays out without losing congregation lyric text', () => {
    const catalog = readRealCatalog();
    for (const song of catalog.songs) {
        const sections = parseSongSections(song);
        const slides = layoutSong(song, { measureWidth: text => Array.from(text).length * 36 });
        const expected = sections.flatMap(section => section.lines).join(' ').replace(/\s+/gu, ' ').trim();
        const actual = slides.flatMap(slide => slide.lines).join(' ').replace(/\s+/gu, ' ').trim();
        assert.equal(actual, expected, `Songbook #${song.id}`);
        assert.ok(slides.every(slide => slide.lines.length <= 4), `Songbook #${song.id}`);
    }
});

test('real Bangla chorus repetition and lyric-only searches work', () => {
    const catalog = readRealCatalog();
    assert.ok(searchCatalog(catalog, 'শাশ্বত সুখ').some(song => song.id === 1));
    assert.deepEqual(searchCatalog(catalog, 'zzzz-no-song-zzzz'), []);
    assert.deepEqual(searchCatalog(catalog, 'a'), []);
    const sections = parseSongSections(catalog.byId.get(11));
    const order = defaultSectionOrder(sections, true);
    assert.equal(order.filter(code => code === 'C').length, sections.filter(section => section.kind === 'verse').length);
    const slides = layoutSong(catalog.byId.get(11), { sectionOrder: 'C, V1, C', measureWidth: () => 100 });
    assert.deepEqual(slides.map(slide => slide.sectionCode), ['C', 'V1', 'V1', 'C']);
    assert.deepEqual(slides.map(slide => slide.lines.length), [2, 2, 2, 2]);
    assert.ok(slides.every(slide => slide.lines.every(line => !isChordOnlyLine(line))));
});

test('corrupt or unavailable storage fails explicitly without overwriting saved data', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{broken');
    assert.throws(() => listSavedSets(storage), /saved|storage|JSON/i);
    assert.throws(() => saveSet({ id: createSetId('2026-10-11'), date: '2026-10-11' }, storage));
    assert.equal(storage.getItem(STORAGE_KEY), '{broken');
    storage.setItem(STORAGE_KEY, JSON.stringify({
        'sunday-2026-10-11': { id: 'sunday-2026-10-11', date: '2026-10-11', slides: [{}] }
    }));
    assert.throws(() => loadSet('sunday-2026-10-11', storage), /invalid|saved/i);
    const unavailable = { getItem() { throw new Error('Storage access denied'); } };
    assert.throws(() => listSavedSets(unavailable), /denied/);
});

test('themes are deterministic per Songbook ID regardless of slide order or reload', () => {
    const catalog = readRealCatalog();
    assert.equal(SLIDE_THEMES.length, 4);
    assert.deepEqual([1, 2, 3, 4].map(songTheme), [...SLIDE_THEMES]);
    for (const song of catalog.songs) {
        const slides = layoutSong(song, { measureWidth: () => 100 });
        assert.ok(slides.every(slide => songTheme(slide.songId) === songTheme(song.id)));
    }
    assert.equal(songTheme(1), songTheme(5));
    assert.throws(() => songTheme(0), /stable Songbook ID/);
});

test('attribution filtering removes real credits but preserves ordinary worship lyrics', () => {
    for (const credit of ['-চন্ডীচরণ গুহ', '- যাকোব কান্তি নাথ বিশ্বাস।', 'কথা ও সুরঃ মিল্টন আলফা',
        'সুরঃ This is the day', 'গীতিকার: নাম', 'লেখকঃ নাম', 'Lyrics by: Name',
        'Composer: Name', 'Written by Name', 'Tuned by Name', 'Songwriter: Name']) {
        assert.equal(isAttributionLine(credit), true, credit);
    }
    for (const lyric of ['আজকে কথা যে দিলাম', 'আমার হৃদয়ে বাজে নব নব সুর,', '-গীত ২৯:১-২', 'Speak, O Lord, as we come to You']) {
        assert.equal(isAttributionLine(lyric), false, lyric);
    }
    const catalog = readRealCatalog();
    assert.ok(catalog.byId.get(1).lyrics.includes('চন্ডীচরণ গুহ'));
    assert.ok(!layoutSong(catalog.byId.get(1), { measureWidth: () => 100 })
        .flatMap(slide => slide.lines).join(' ').includes('চন্ডীচরণ গুহ'));
    assert.ok(catalog.byId.get(15).lyrics.includes('মিল্টন আলফা'));
    for (const song of catalog.songs) {
        const expected = song.lyrics.split('\n')
            .filter(line => !isAttributionLine(line) && !isChordOnlyLine(line));
        const slides = layoutSong(song, { measureWidth: () => 100 });
        assert.ok(slides.every(slide => slide.lines.every(line => !isAttributionLine(line))), `Songbook #${song.id}`);
        assert.ok(expected.length > 0, `Songbook #${song.id}`);
    }
});

test('exact Bangla phrase example becomes three faithful logical lines', () => {
    const input = '২। যীশু পরম দয়ালু করুণাময়, তাঁর করুণার সীমা নাই - ২\nপাপীর তরে ক্রুশের পরে, যীশু দিলেন প্রাণ - ২';
    const expected = ['২। যীশু পরম দয়ালু করুণাময়,', 'তাঁর করুণার সীমা নাই - ২', 'পাপীর তরে ক্রুশের পরে, যীশু দিলেন প্রাণ - ২'];
    const measured = new Map([[input.split('\n')[0], 1636], [expected[0], 871], [expected[1], 745], [expected[2], 1274]]);
    const slides = layoutSong({ id: 831, lyrics: input }, { measureWidth: text => measured.get(text) ?? 600 });
    assert.deepEqual(slides.map(slide => slide.lines), [expected]);
    assert.equal(expected.join(' '), input.replace('\n', ' '));
});

test('phrase splitting is measured, balanced, punctuation-faithful, and avoids tiny fragments', () => {
    const measure = text => text.length * 20;
    const examples = [
        'Gentle worship, peaceful praise',
        'This indivisible worship lyric continues for a long time, yes',
        '১। এই একটি দীর্ঘ অবিভাজ্য বাক্য কোনো প্রাকৃতিক বিরাম ছাড়া',
        'At 12: 30 we sing a long uninterrupted worship sentence'
    ];
    assert.deepEqual(splitLyricPhrases(examples[0], measure, 1000), [examples[0]]);
    for (const line of examples.slice(1)) {
        const phrases = splitLyricPhrases(line, measure, 600);
        assert.equal(phrases.join(' '), line);
        assert.ok(phrases.every(phrase => (phrase.match(/\p{L}[\p{L}\p{M}]*/gu)?.length || 0) >= 2));
        assert.ok(!phrases.includes('yes'));
        assert.ok(!phrases.includes('১।'));
    }
    for (const line of [
        'We sing a joyful song, we lift our hearts in praise; we rest in perfect peace',
        'তোমার প্রেমে আনন্দ করি। তোমার নামে জীবন গড়ি',
        'Our hearts are full of worship: our voices rise in thankful praise'
    ]) {
        const phrases = splitLyricPhrases(line, measure, 600);
        assert.ok(phrases.length > 1, line);
        assert.equal(phrases.join(' '), line);
        assert.ok(phrases.every(phrase => (phrase.match(/\p{L}[\p{L}\p{M}]*/gu)?.length || 0) >= 2));
    }
});

test('all catalog phrase transformations preserve non-whitespace characters and section order', () => {
    for (const song of readRealCatalog().songs) {
        for (const section of parseSongSections(song)) {
            const phrases = section.lines.flatMap(line => splitLyricPhrases(line, text => Array.from(text).length * 36));
            assert.equal(phrases.join('').replace(/\s/gu, ''), section.lines.join('').replace(/\s/gu, ''), `Songbook #${song.id}`);
        }
    }
});

test('unpunctuated repeat tail becomes a logical line without changing supplied words', () => {
    const first = '১। ভবনদী ভারী দুরন্ত পাড়ি তাঁর নামে ভাই';
    const tail = 'চালাও তরী - ২';
    const last = 'নামের বৈঠা বাইয়া চল, যীশু করবেন পার - ২';
    const measure = text => text === `${first} ${tail}` ? 1650
        : text === first ? 1211 : text === tail ? 418 : text === last ? 1249
            : Array.from(text).length * 35;
    const slides = layoutSong({ id: 831, lyrics: `${first} ${tail}\n${last}` }, { measureWidth: measure });
    assert.deepEqual(slides.map(slide => slide.lines), [[first, tail, last]]);
    assert.equal(slides[0].lines.join(' '), `${first} ${tail} ${last}`);
    for (const marker of ['-২', '-  ৩', '– ৪', '— 2', '(২)', '( 3 )']) {
        const text = `Long worship words filling the whole presentation area Sing praise ${marker}`;
        const phrases = splitLyricPhrases(text, value => value.length * 20, 1300);
        assert.deepEqual(phrases, ['Long worship words filling the whole presentation area', `Sing praise ${marker}`]);
        assert.equal(phrases.join(' '), text);
    }
});

test('whitespace fallback is conservative about width, word counts, and verse prefixes', () => {
    const measure = text => text.length * 20;
    for (const text of ['১। প্রভু', 'We sing our praise', `${'Unbroken'.repeat(20)} amen`, 'Sing praise - ২']) {
        assert.deepEqual(splitLyricPhrases(text, measure, 600), [text]);
    }
    const text = '১। আমরা তোমার নামে জীবন গড়ি তোমার প্রেমে আনন্দ করি';
    const phrases = splitLyricPhrases(text, measure, 600);
    assert.ok(phrases.length > 1);
    assert.ok(phrases[0].startsWith('১। আমরা'));
    assert.equal(phrases.join(' '), text);
    assert.ok(phrases.every(phrase => measure(phrase) <= 600));
    for (const line of ['সেই দিন থেকে গাহি এ গান যে দিন পেয়েছি ত্রাণ।', 'তাই সকল ফেলে তোমার কোলে আশ্রয় নিলাম।']) {
        const result = splitLyricPhrases(line, measure, 600);
        assert.equal(result.join(' '), line);
        assert.ok(result.every(phrase => !/(?:এ|তোমার)$/u.test(phrase)));
    }
    const english = 'Let me be singing when the evening comes.';
    const englishPhrases = splitLyricPhrases(english, measure, 600);
    assert.equal(englishPhrases.join(' '), english);
    assert.ok(englishPhrases.every(phrase => !/\bwhen$/iu.test(phrase)));
});
