import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { analyzeSongPropagation, validPropagation, getSongSourceAlignments, songSourceSections } from '../../worship-studio/chord-propagation.mjs';
import { createCatalog } from '../../worship-studio/songbook-adapter.mjs';
import { layoutMode, displayChord, initializeModes, storageSnapshot } from '../../worship-studio/presentation-modes.mjs';
import { saveSet, loadSet } from '../../worship-studio/studio-storage.mjs';

const context = {
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById() { return null; } }, Intl, console
};
vm.createContext(context);
for (const file of ['songs-data.js', 'english-songbook-data.js', 'english-songbook-alignment.js',
    'song-chord-alignments.js', 'songbook-app.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), context);
}
const runtime = context.window.GPBCSongbookPresentation;
const catalog = createCatalog({ bengaliSongs: context.window.SONGS_DATA, englishSongs: context.window.GPBC_ENGLISH_SONGS });
const measureWidth = text => [...text].length * 20;
const options = { runtime, measureWidth };

test('real 696 derives later three verses from V1 repeated-tail template without modifying source chords', () => {
    const song = catalog.byId.get(696);
    const before = JSON.stringify(song);
    const originals = JSON.stringify(runtime.getSongChordAlignments(song));
    const audit = analyzeSongPropagation(song, options);
    assert.equal(audit.source, 'V1');
    assert.deepEqual(audit.candidates.map(item => [item.sectionCode, item.confidence]),
        [['V2', 'medium'], ['V3', 'medium'], ['V4', 'medium']]);
    assert.equal(audit.suggestions.size, 9);
    for (const suggestion of audit.suggestions.values()) {
        assert.ok(suggestion.anchors.length > 0);
        assert.ok(validPropagation(suggestion.propagation, 696));
        assert.ok(!validPropagation(suggestion.propagation, 117));
        assert.ok(suggestion.anchors.every(anchor => runtime.parseChordLine(anchor.chord).parts[0].symbols.length === 1));
    }
    for (const section of audit.candidates) {
        const rows = song.lyrics.split('\n');
        for (const [index, suggestion] of audit.suggestions) {
            if (suggestion.propagation.targetSectionCode !== section.sectionCode) continue;
            assert.equal(suggestion.anchors.at(-1).wordIndex, runtime.getLyricWordTokens(rows[index]).length - 1);
        }
    }
    const musician = layoutMode([{ songId: 696 }], catalog, 'musician', options);
    const phonetic = layoutMode([{ songId: 696 }], catalog, 'phoneticChords', options);
    for (const lineIndex of audit.suggestions.keys()) {
        const collect = slides => slides.flatMap(slide => slide.lineDetails)
            .filter(row => row.sourceLineIndex === lineIndex);
        assert.deepEqual(collect(musician).flatMap(row => row.anchors.map(anchor => anchor.chord)),
            collect(phonetic).flatMap(row => row.anchors.map(anchor => anchor.chord)));
        const identities = slides => collect(slides).flatMap(row => row.anchors
            .map(anchor => [anchor.chord, anchor.wordIndex + row.sourceWordOffset]));
        assert.deepEqual(identities(musician), identities(phonetic));
        assert.ok(collect(musician).every(row => row.propagation.songId === 696));
    }
    const sourceRows = musician.filter(slide => slide.sectionCode === 'V1').flatMap(slide => slide.lineDetails);
    assert.ok(sourceRows.every(row => !row.propagation));
    assert.deepEqual(sourceRows[0].anchors.map(anchor => [anchor.chord, anchor.wordIndex]),
        [['Dm', 0], ['Gm', 0], ['ADm', 3], ['A#CDm', 6]]);
    assert.equal(JSON.stringify(song), before);
    assert.equal(JSON.stringify(runtime.getSongChordAlignments(song)), originals);
});

test('phrase/width mapping follows musical boundaries rather than source word numbers', () => {
    const song = { id: 9900, lyrics: 'Verse 1\nC G\nA verylongword, ending here\n\nVerse 2\nSeveral short words, final cadence\n\nChorus\nDifferent melody here\n\nBridge\nOther melody here' };
    const fake = {
        ...runtime,
        getSongChordAlignments: () => [{ lyricLineIndex: 2, renderAnchored: true,
            confidence: 'HIGH_CONFIDENCE', source: 'reviewed', anchors: [{ chord: 'C', wordIndex: 0 }, { chord: 'G', wordIndex: 2 }] }]
    };
    const audit = analyzeSongPropagation(song, { ...options, runtime: fake });
    assert.equal(audit.candidates.filter(candidate => candidate.confidence !== 'low').length, 1);
    const suggestion = audit.suggestions.get(5);
    assert.equal(suggestion.anchors[1].wordIndex, 3);
    assert.equal(suggestion.anchors[1].chord, 'G');
    assert.equal(audit.suggestions.get(8).anchors.length, 0);
    assert.equal(suggestion.propagation.confidence, 'high');
});

test('incompatible verse structures remain review-only; chorded target rows are never overwritten', () => {
    const song = { id: 9901, lyrics: 'Verse 1\nC G\nFirst long phrase here\nC G\nSecond long phrase here\n\nVerse 2\nC\nAlready chorded phrase here\nMissing second phrase here\n\nVerse 3\nDifferent lone phrase' };
    const fake = { ...runtime, getSongChordAlignments: () => [2, 4, 8].map(lyricLineIndex => ({
        lyricLineIndex, renderAnchored: true, source: 'reviewed', confidence: 'HIGH_CONFIDENCE',
        anchors: [{ chord: 'C', wordIndex: 0 }, { chord: 'G', wordIndex: 2 }]
    })) };
    const audit = analyzeSongPropagation(song, { ...options, runtime: fake });
    assert.ok(!audit.suggestions.has(8));
    assert.equal(audit.candidates.at(-1).confidence, 'low');
    assert.equal(audit.suggestions.get(12).anchors.length, 0);
    assert.equal(audit.suggestions.get(12).propagation.status, 'needs-review');
    assert.ok(audit.suggestions.get(9).anchors.length);
});

test('suggestions, manual adjustments and confirmations persist and transpose/capo without master mutation', () => {
    const song = catalog.byId.get(696);
    const slides = layoutMode([{ songId: 696 }], catalog, 'musician', options);
    const detail = slides.flatMap(slide => slide.lineDetails).find(row => row.propagation);
    detail.anchors[0].wordIndex = 1;
    detail.propagation.status = 'confirmed';
    const set = initializeModes({ id: 'sunday-2026-10-25', date: '2026-10-25',
        songEntries: [{ songId: 696, sectionOrder: [] }], slides: [], activeMode: 'musician',
        modeSlides: { musician: slides } });
    const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
    saveSet(storageSnapshot(set), storage);
    assert.deepEqual(initializeModes(loadSet(set.id, storage)).slides, slides);
    const anchor = detail.anchors[0];
    assert.equal(displayChord(anchor.chord, song, { key: 'E', capo: 2 }, runtime),
        runtime.transposeChord(anchor.chord, 0));
    detail.propagation.songId = 117;
    assert.throws(() => saveSet(storageSnapshot(set), storage), /Invalid saved presentation modes/);
});

test('real 117 uses its later verse family without copying the contradictory refrain into missing rows', () => {
    const audit = analyzeSongPropagation(catalog.byId.get(117), options);
    assert.equal(audit.suggestions.get(11).anchors.length, 0);
    for (const index of [15, 17, 19, 21]) {
        assert.ok(audit.suggestions.get(index).anchors.length);
        assert.equal(audit.suggestions.get(index).propagation.sourceSectionCode, 'V2');
    }
    for (const index of [16, 20]) assert.equal(audit.suggestions.get(index).anchors.length, 0);
});

test('real 1019 compares both chorded families and fills V2/V3 from its repeated V1 structure', () => {
    const song = catalog.byId.get(1019);
    const before = JSON.stringify(song);
    const original = JSON.stringify(runtime.getSongChordAlignments(song));
    const source = getSongSourceAlignments(song, runtime);
    const recovered = source.find(row => row.lyricLineIndex === 5);
    assert.equal(recovered.anchors.at(-1).chord, '(C)');
    assert.ok(song.lyrics.split('\n')[recovered.chordLineIndex].includes('(C)'));
    assert.equal(JSON.stringify(source.filter(row => row.source !== 'studio-printed-optional')), original);
    const audit = analyzeSongPropagation(song, options);
    assert.equal(audit.families.length, 2);
    assert.equal(audit.suggestions.size, 4);
    for (const suggestion of audit.suggestions.values()) {
        assert.ok(suggestion.anchors.length);
        assert.equal(suggestion.propagation.sourceSectionCode, 'V1');
        assert.equal(suggestion.propagation.confidence, 'medium');
    }
    for (const row of source) assert.ok(!audit.suggestions.has(row.lyricLineIndex));
    const modes = ['musician', 'phoneticChords'].map(mode =>
        layoutMode([{ songId: song.id }], catalog, mode, options).flatMap(slide => slide.lineDetails));
    const identities = rows => rows.filter(row => row.propagation).flatMap(row =>
        row.anchors.map(anchor => [row.sourceLineIndex, row.sourceWordOffset + anchor.wordIndex, anchor.chord]));
    assert.deepEqual(identities(modes[0]), identities(modes[1]));
    assert.equal(JSON.stringify(runtime.getSongChordAlignments(song)), original);
    assert.equal(JSON.stringify(song), before);
});

function fixture(lyrics, chordRows) {
    const song = { id: 9902, lyrics };
    const fake = { ...runtime, getSongChordAlignments: () => chordRows.map(([line, chord, last]) => ({
        lyricLineIndex: line, renderAnchored: true, source: 'reviewed', confidence: 'HIGH_CONFIDENCE',
        anchors: [{ chord, wordIndex: 0 }, { chord: 'G', wordIndex: last }]
    })) };
    return analyzeSongPropagation(song, { ...options, runtime: fake });
}

test('multiple source families choose the closest complete section, including a later source verse', () => {
    const audit = fixture('Verse 1\nShort lyric row here\nAnother short row here\n\nVerse 2\nSmall lyric row here\nAnother small row here\n\nVerse 3\nVerylongword anotherlongword longestword here\nSecondlongword anotherlongword longestword here\n\nVerse 4\nVerylongword differentlongword longestword here\nSecondlongword differentlongword longestword here',
        [[1, 'C', 3], [2, 'C', 3], [13, 'Dm', 3], [14, 'Dm', 3]]);
    assert.equal(audit.families.length, 2);
    for (const index of [5, 6]) assert.equal(audit.suggestions.get(index).propagation.sourceSectionCode, 'V1');
    for (const index of [9, 10]) {
        assert.equal(audit.suggestions.get(index).propagation.sourceSectionCode, 'V4');
        assert.ok(audit.suggestions.get(index).anchors.length);
    }
});

test('equally plausible different patterns remain review-only, not earliest-verse defaults', () => {
    const audit = fixture('Verse 1\nSame length words here\n\nVerse 2\nSame length words here\n\nVerse 3\nSame length words here',
        [[1, 'C', 3], [7, 'Dm', 3]]);
    assert.equal(audit.suggestions.get(4).anchors.length, 0);
    assert.equal(audit.suggestions.get(4).propagation.confidence, 'low');
    assert.match(audit.suggestions.get(4).propagation.reason, /Equally plausible/);
});

test('partially chorded templates fill supported rows and keep unsupported rows review-only', () => {
    const audit = fixture('Verse 1\nFirst phrase words here\nMissing phrase words here\nLast phrase words here\n\nVerse 2\nFirst stanza words here\nMiddle stanza words here\nLast stanza words here',
        [[1, 'C', 3], [3, 'C', 3]]);
    assert.ok(audit.suggestions.get(6).anchors.length);
    assert.equal(audit.suggestions.get(7).anchors.length, 0);
    assert.ok(audit.suggestions.get(8).anchors.length);
});

test('compatible partially chorded sources contribute complementary rows within one pattern family', () => {
    const audit = fixture('Verse 1\nFirst phrase words here\nMiddle phrase words here\nLast phrase words here\n\nVerse 2\nFirst phrase words here\nMiddle phrase words here\nLast phrase words here\n\nVerse 3\nFirst phrase words here\nMiddle phrase words here\nLast phrase words here',
        [[1, 'C', 3], [2, 'Dm', 3], [6, 'C', 3], [8, 'Am', 3]]);
    assert.equal(audit.families.length, 1);
    assert.equal(audit.suggestions.get(12).propagation.sourceSectionCode, 'V1');
    assert.equal(audit.suggestions.get(13).propagation.sourceSectionCode, 'V2');
    for (const index of [11, 12, 13]) assert.ok(audit.suggestions.get(index).anchors.length);
});

test('optional printed source recovery leaves grouped alternatives and all prior anchors intact', () => {
    const song = catalog.byId.get(86);
    const original = JSON.stringify(runtime.getSongChordAlignments(song));
    const row = getSongSourceAlignments(song, runtime).find(row => row.lyricLineIndex === 11);
    assert.deepEqual([...row.anchors].map(anchor => anchor.chord), ['D', '(G)', 'G(A)', 'D']);
    assert.equal(JSON.stringify(runtime.getSongChordAlignments(song)), original);
});

test('repeated target rows retain their own raw word identities when only one has a verse prefix', () => {
    const audit = fixture('Verse 1\nSource original words here\n\nVerse 2\n2. Source original words here\nSource original words here',
        [[1, 'C', 3]]);
    assert.deepEqual(audit.suggestions.get(4).anchors.map(anchor => anchor.wordIndex), [1, 4]);
    assert.deepEqual(audit.suggestions.get(5).anchors.map(anchor => anchor.wordIndex), [0, 3]);
});

test('no-source songs never borrow another catalog song and explicitly report no confirmed source', () => {
    const song = { id: 9998, title: 'No source fixture', lyrics: 'Verse 1\nSing together in joy\n\nVerse 2\nSing together in peace' };
    const fake = { ...runtime, getSongChordAlignments: () => [] };
    const audit = analyzeSongPropagation(song, { ...options, runtime: fake });
    assert.equal(audit.suggestions.size, 0);
    assert.equal(audit.coverage.usableRows, 0);
    const copy = createCatalog({ bengaliSongs: [song] });
    const slides = layoutMode([{ songId: song.id }], copy, 'musician', { ...options, runtime: fake });
    assert.ok(slides.flatMap(slide => slide.lineDetails).every(row =>
        !row.anchors.length && row.warnings.includes('No confirmed chord source available.')));
    assert.equal(songSourceSections(song).length, 2);
});
