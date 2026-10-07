import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createCatalog, searchCatalog } from '../../worship-studio/songbook-adapter.mjs';
import { layoutSong, parseSongSections, songPageSerials, songTheme } from '../../worship-studio/layout-engine.mjs';
import {
    MODES, KEYS, layoutMode, keySteps, displayChord, initializeModes, selectMode, storageSnapshot,
    fitChordedRows, validChordedLayout
} from '../../worship-studio/presentation-modes.mjs';
import { saveSet, loadSet, STORAGE_KEY } from '../../worship-studio/studio-storage.mjs';
import { getSongSourceAlignments } from '../../worship-studio/chord-propagation.mjs';

const context = {
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById() { return null; } },
    Intl, console
};
vm.createContext(context);
for (const file of ['songs-data.js', 'english-songbook-data.js', 'english-songbook-alignment.js',
    'song-chord-alignments.js', 'songbook-app.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const runtime = context.window.GPBCSongbookPresentation;
const catalog = createCatalog({ bengaliSongs: context.window.SONGS_DATA, englishSongs: context.window.GPBC_ENGLISH_SONGS });
const measureWidth = text => [...text].length * 20;
const options = { measureWidth, runtime };
const compact = text => text.replace(/\s/gu, '');

test('chorded fit tries every size from 54 through 48, scales chords proportionally, and rejects below-floor fits', () => {
    const rows = [{ text: 'phrase', anchors: [{ chord: 'D', wordIndex: 0 }], progression: '' }];
    for (const points of [54, 53, 52, 51, 50, 49, 48]) {
        const layout = fitChordedRows(rows, {
            measureWidth: () => 1340 * 54 / (points + 0.1), measureChord: () => 10, runtime
        });
        assert.equal(layout.fontPoints, points);
        assert.ok(validChordedLayout(layout));
        assert.equal(layout.fontPoints / 2, points / 2);
    }
    assert.equal(fitChordedRows(rows, { measureWidth: () => 1600, measureChord: () => 10, runtime }), null);
    assert.ok(!validChordedLayout({ fontPoints: 47 }));
});

test('four meaningful chorded lines fit together; five lines rebalance without a 4+1 orphan', () => {
    const song = {
        id: 9000, title: 'Fixture for grouping only',
        lyrics: Array.from({ length: 5 }, (_, index) => `D A\nMeaningful musical phrase number ${index + 1}`).join('\n')
    };
    const fixture = createCatalog({ bengaliSongs: [song], englishSongs: [] });
    const slides = layoutMode([{ songId: 9000 }], fixture, 'musician', options);
    assert.deepEqual(slides.map(slide => slide.lines.length).sort(), [2, 3]);
    const four = createCatalog({ bengaliSongs: [{ ...song, lyrics: song.lyrics.split('\n').slice(0, 8).join('\n') }], englishSongs: [] });
    const together = layoutMode([{ songId: 9000 }], four, 'musician', options);
    assert.equal(together.length, 1);
    assert.equal(together[0].lines.length, 4);
    assert.equal(together[0].chordLayout.fontPoints, 54);
});

test('real 696 preserves complete stanza words and anchors with four first-stanza lines on one musician page', () => {
    const song = catalog.byId.get(696);
    const slides = layoutMode([{ songId: 696 }], catalog, 'musician', options);
    assert.equal(slides[0].lines.length, 4);
    assert.ok(slides.every(slide => slide.lines.length !== 1 || slide.lines[0].trim().split(/\s+/u).length > 1));
    assert.equal(compact(slides.flatMap(slide => slide.lines).join('')),
        compact(parseSongSections(song).flatMap(section => section.lines).join('')));
    const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
    const set = initializeModes({ id: 'sunday-2026-11-08', date: '2026-11-08', songEntries: [{ songId: 696, sectionOrder: [] }], slides: [] });
    selectMode(set, 'musician');
    set.slides = slides;
    saveSet(storageSnapshot(set), storage);
    assert.deepEqual(initializeModes(loadSet(set.id, storage)).slides, slides);
    slides[0].chordLayout.fontPoints = 47;
    assert.throws(() => saveSet(storageSnapshot(set), storage), /Invalid saved presentation modes/);
});

test('all four modes reuse real 117 data, runtime phonetics and word-linked chords', () => {
    const song = catalog.byId.get(117);
    const original = JSON.stringify(song);
    const outputs = Object.fromEntries(Object.keys(MODES).map(mode => [mode, layoutMode([{ songId: 117 }], catalog, mode, options)]));
    const withoutGeneratedId = slides => slides.map(({ id, ...slide }) => slide);
    assert.deepEqual(withoutGeneratedId(outputs.congregation), withoutGeneratedId(layoutSong(song, { measureWidth })));
    assert.equal(runtime.getSongBaseKey(song), 'D');
    assert.equal(outputs.musician[0].lines[0], 'আর কোন নাম নাই, যে নামে জীবন পাই,');
    assert.equal(outputs.phoneticChords[0].lines[0], 'Ar kono nam nai, je name jibon pai,');
    assert.equal(outputs.phonetic[0].lines[0], outputs.phoneticChords[0].lines[0]);
    assert.deepEqual(outputs.musician[0].lineDetails[0].anchors.map(anchor => [anchor.chord, anchor.wordIndex]),
        [['D', 0], ['A', 2], ['D', 7]]);
    assert.deepEqual(outputs.phoneticChords[0].lineDetails[0].anchors, outputs.musician[0].lineDetails[0].anchors);
    for (const slides of Object.values(outputs)) {
        assert.equal(songTheme(slides[0].songId), 'emerald');
        assert.equal(songPageSerials(slides)[0], `1/${slides.length}`);
    }
    assert.equal(JSON.stringify(song), original);
});

test('transposition and smart capo use existing reader helpers, including slash/optional chords', () => {
    for (const id of [2, 117, 1411]) {
        const song = catalog.byId.get(id);
        for (const key of KEYS) {
            const steps = keySteps(song, key, runtime);
            assert.ok(steps >= 0 && steps < 12);
            assert.equal(displayChord('D/F#', song, { key, capo: 2 }, runtime),
                runtime.transposeChord('D/F#', steps - 2));
        }
        assert.deepEqual(runtime.getSuggestedCapos(song, 0), runtime.getSuggestedCapos(song));
    }
    const song = catalog.byId.get(117);
    assert.equal(displayChord('D', song, { key: 'E', capo: 0 }, runtime), 'E');
    assert.equal(displayChord('(Bm)', song, { key: 'E', capo: 2 }, runtime), '(Bm)');
    assert.throws(() => keySteps(catalog.byId.get(831), 'E', runtime), /no detected original key/);
});

test('English archive alignment is reused unchanged and missing chords are never fabricated', () => {
    const english = catalog.byId.get(1411);
    const englishSlides = layoutMode([{ songId: 1411 }], catalog, 'phoneticChords', options);
    assert.deepEqual(englishSlides[0].lineDetails[0].anchors.map(anchor => [anchor.chord, anchor.wordIndex]),
        [['A', 2], ['E', 5], ['B', 6], ['C#m', 8]]);
    assert.equal(compact(englishSlides.flatMap(slide => slide.lines).join('')),
        compact(parseSongSections(english).flatMap(section => section.lines).join('')));
    const missing = layoutMode([{ songId: 831 }], catalog, 'musician', options);
    assert.ok(missing.flatMap(slide => slide.lineDetails).every(detail => detail.anchors.length === 0));
    assert.match(missing[0].lineDetails[0].warnings.join(' '), /No confirmed chord source available/);
});

test('mode-local manual copies/key/capo round trip without losing legacy congregation edits', () => {
    const set = initializeModes({
        id: 'sunday-2026-10-11', date: '2026-10-11', songEntries: [{ songId: 117, sectionOrder: ['V1'] }],
        slides: [{ id: 'legacy', songId: 117, lines: ['Existing manual congregation lyric'], manual: true }]
    });
    selectMode(set, 'musician');
    set.slides = layoutMode(set.songEntries, catalog, 'musician', options);
    set.slides[0].lines[0] = 'Mode-only manual lyric';
    set.modeSettings.musician[117] = { key: 'E', capo: 2 };
    const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
    saveSet(storageSnapshot(set), storage);
    const saved = initializeModes(loadSet(set.id, storage));
    assert.equal(saved.slides[0].lines[0], 'Mode-only manual lyric');
    assert.deepEqual(saved.modeSettings.musician[117], { key: 'E', capo: 2 });
    selectMode(saved, 'congregation');
    assert.equal(saved.slides[0].lines[0], 'Existing manual congregation lyric');
    selectMode(saved, 'musician');
    assert.equal(saved.slides[0].lines[0], 'Mode-only manual lyric');
    const before = storage.value;
    saved.modeSettings.musician[117].capo = 99;
    assert.throws(() => saveSet(storageSnapshot(saved), storage), /Invalid saved key/);
    assert.equal(storage.value, before);
    assert.ok(JSON.parse(storage.getItem(STORAGE_KEY))[set.id].schemaVersion === 2);
});

test('all 1492 songs preserve full runtime lyric characters and source anchor association in new modes', () => {
    for (const song of catalog.songs) {
        const master = JSON.stringify(song);
        for (const mode of ['musician', 'phoneticChords', 'phonetic']) {
            const slides = layoutMode([{ songId: song.id }], catalog, mode, options);
            const sourceLines = parseSongSections(song).flatMap(section => section.lines);
            const expected = sourceLines.map(line => mode === 'musician' ? line : runtime.getSongPhoneticLine(song, line));
            assert.equal(compact(slides.flatMap(slide => slide.lines).join('')), compact(expected.join('')), `${song.id} ${mode}`);
            for (const slide of slides) {
                assert.equal(slide.lines.length, slide.lineDetails.length);
                for (const [index, detail] of slide.lineDetails.entries()) {
                    for (const anchor of detail.anchors) {
                        assert.ok(anchor.wordIndex < runtime.getLyricWordTokens(slide.lines[index]).length);
                        const sourceIndex = detail.propagation?.sourceLineIndex ?? detail.sourceLineIndex;
                        if (detail.propagation) assert.equal(detail.propagation.songId, song.id);
                        assert.ok(getSongSourceAlignments(song, runtime).some(row => row.lyricLineIndex === sourceIndex
                            && row.anchors.some(source => source.chord === anchor.chord
                                || (detail.propagation && runtime.parseChordLine(source.chord).parts
                                    .some(part => !part.grouped && part.symbols.includes(anchor.chord))))), `${song.id} invented chord`);
                    }
                }
            }
            if (mode !== 'phonetic') {
                const expectedAnchors = [];
                const actualAnchors = [];
                const lyricRows = song.lyrics.split('\n');
                for (const alignment of getSongSourceAlignments(song, runtime)) {
                    if (!alignment.renderAnchored || alignment.lyricLineIndex === null) continue;
                    const originalText = lyricRows[alignment.lyricLineIndex];
                    const displayText = mode === 'musician' ? originalText : runtime.getSongPhoneticLine(song, originalText);
                    const tokens = runtime.getLyricWordTokens(displayText);
                    if (tokens.length !== runtime.getLyricWordTokens(originalText).length
                        || alignment.anchors.some(anchor => anchor.wordIndex >= tokens.length)) continue;
                    for (const anchor of alignment.anchors) expectedAnchors.push([
                        alignment.lyricLineIndex, anchor.chord, tokens[anchor.wordIndex].text
                    ]);
                }
                for (const slide of slides) {
                    for (const [index, detail] of slide.lineDetails.entries()) {
                        if (detail.propagation) continue;
                        const tokens = runtime.getLyricWordTokens(slide.lines[index]);
                        for (const anchor of detail.anchors) actualAnchors.push([
                            detail.sourceLineIndex, anchor.chord, tokens[anchor.wordIndex].text
                        ]);
                    }
                }
                // The section parser may exclude source attribution rows; compare only presented source rows.
                const presented = new Set(slides.flatMap(slide => slide.lineDetails.map(detail => detail.sourceLineIndex)));
                assert.deepEqual(actualAnchors, expectedAnchors.filter(anchor => presented.has(anchor[0])), `${song.id} ${mode} chord word changed`);
            }
        }
        assert.equal(JSON.stringify(song), master);
    }
});

test('ungenerated modes stay distinct from intentionally empty edited modes after persistence', () => {
    const set = initializeModes({
        id: 'sunday-2026-11-01', date: '2026-11-01', songEntries: [{ songId: 117, sectionOrder: ['V1'] }], slides: []
    });

    selectMode(set, 'musician');
    set.slides = layoutMode(set.songEntries, catalog, 'musician', options);
    const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
    saveSet(storageSnapshot(set), storage);
    const saved = initializeModes(loadSet(set.id, storage));
    assert.equal(Object.hasOwn(saved.modeSlides, 'congregation'), false);
    selectMode(saved, 'congregation');
    saved.modeSlides.congregation = saved.slides;
    selectMode(saved, 'musician');
    selectMode(saved, 'congregation');
    assert.equal(Object.hasOwn(saved.modeSlides, 'congregation'), true);
    assert.equal(saved.slides.length, 0);
});

test('active runtime phonetic search handles doya nukta spellings, titles, lyrics and cached fields without duplicates', () => {
    for (const text of ['দয়া', 'দয়া']) {
        assert.equal(runtime.getSongPhoneticLine({ id: 0 }, text), 'Doya');
    }
    const supplied = { id: 9999, title: 'উদাহরণ', lyrics: 'দয়া করো আমার উপর' };
    assert.equal(runtime.matchSongSearch(supplied, '  DOYA! '), 'phonetic-lyrics');
    const doya = searchCatalog(catalog, 'doya', 1492, runtime);
    assert.ok(doya.some(song => song.id === 2));
    assert.ok(doya.every(song => /দ[য়য]/u.test(song.title + song.lyrics)
        || runtime.getSongPhoneticLine(song, song.lyrics).toLowerCase().includes('doya')));
    assert.equal(new Set(doya.map(song => song.id)).size, doya.length);
    assert.equal(searchCatalog(catalog, 'ar-kono nam nai', 30, runtime)[0].id, 117);
    assert.equal(searchCatalog(catalog, 'atmar dane hoy bhorpur', 30, runtime)[0].id, 117);
    assert.equal(searchCatalog(catalog, 'আর কোন নাম নাই', 30, runtime)[0].id, 117);
    assert.equal(searchCatalog(catalog, '10,000 reasons', 30, runtime)[0].id, 1411);
    assert.ok(searchCatalog(catalog, 'worship his holy name', 30, runtime).some(song => song.id === 1411));
    const song = catalog.byId.get(117);
    const fields = runtime.getSongSearchFields(song, true);
    assert.equal(runtime.getSongSearchFields(song, true), fields);
    assert.equal(runtime.matchSongSearch(song, 'Atmar---dane hoy bhorpur!'), 'phonetic-lyrics');
    assert.equal(catalog.songs.length, 1492);
});
