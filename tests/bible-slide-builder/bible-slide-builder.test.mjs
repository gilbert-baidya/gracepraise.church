import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
    SOURCE_MANIFEST,
    auditBiblePair,
    bookOptions,
    createBilingualPassage,
    parseBibleXml,
    parseReferenceInput,
    validateReference
} from '../../bible-slide-builder/bible-data-adapter.mjs';
import {
    SLIDE_GEOMETRY,
    createApproximateMeasurer,
    formatReference,
    generatePassageSlides,
    reassembleSlideText,
    safelySplitSlide,
    slideGeometryFits,
    toBengaliDigits
} from '../../bible-slide-builder/scripture-layout.mjs';
import { SCRIPTURE_THEMES, getScriptureTheme, recommendScriptureTheme } from '../../bible-slide-builder/scripture-themes.mjs';
import {
    STORAGE_KEY,
    createScriptureSetId,
    listScriptureSetRevisions,
    listScriptureSets,
    loadScriptureSet,
    saveScriptureSet
} from '../../bible-slide-builder/scripture-storage.mjs';
import { SCRIPTURE_EXPORT_RESOLUTION, buildScriptureExportManifest, scriptureExportFilename } from '../../bible-slide-builder/scripture-export.mjs';

const [bnXml, enXml] = await Promise.all([
    fs.readFile('data/bible/source/bn-bsi-2016-ov.xml', 'utf8'),
    fs.readFile('data/bible/source/en-niv-1984.xml', 'utf8')
]);
const sources = {
    bn: parseBibleXml(bnXml, SOURCE_MANIFEST.bn),
    en: parseBibleXml(enXml, SOURCE_MANIFEST.en)
};

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

function storageSet(overrides = {}) {
    const passage = createBilingualPassage(sources, parseReferenceInput('Psalm 23:1-2'));
    const slides = generatePassageSlides(passage, { languageMode: 'bn', themeId: 'shepherds-peace' });
    return {
        schemaVersion: 1,
        id: createScriptureSetId('2026-10-09', 'Sunday Scripture'),
        date: '2026-10-09',
        name: 'Sunday Scripture',
        programType: 'Sunday Worship',
        languageMode: 'bn',
        themeId: 'shepherds-peace',
        passages: [{
            id: passage.id,
            bookNumber: passage.bookNumber,
            chapter: passage.chapter,
            startVerse: passage.startVerse,
            endVerse: passage.endVerse,
            focusVerse: null,
            themeId: 'shepherds-peace'
        }],
        slides,
        settings: {
            showTranslationLabel: true,
            showProgramBadge: true,
            showPageCounter: true,
            includeOpening: false,
            includeClosing: false,
            overlayIntensity: 0.72
        },
        sourceLock: {
            bn: { filename: SOURCE_MANIFEST.bn.filename, sha256: SOURCE_MANIFEST.bn.sha256 },
            en: { filename: SOURCE_MANIFEST.en.filename, sha256: SOURCE_MANIFEST.en.sha256 }
        },
        revision: 0,
        createdAt: '2026-10-09T00:00:00.000Z',
        updatedAt: null,
        ...overrides
    };
}

test('actual XML schemas and translation audit remain explicit', () => {
    assert.equal(sources.bn.metadata.declaration.encoding, 'UTF-8');
    assert.equal(sources.en.metadata.declaration.encoding, 'UTF-8');
    assert.match(sources.bn.metadata.root.translation, /Bengali \(BSI\) 2016 O\.V\./u);
    assert.equal(sources.en.metadata.root.biblename, 'ENGLISHNIV');
    assert.deepEqual(
        { books: sources.bn.audit.books, chapters: sources.bn.audit.chapters, verses: sources.bn.audit.canonicalVerseAssignments },
        { books: 66, chapters: 1189, verses: 31097 }
    );
    assert.deepEqual(
        { books: sources.en.audit.books, chapters: sources.en.audit.chapters, verses: sources.en.audit.canonicalVerseAssignments },
        { books: 66, chapters: 1189, verses: 31086 }
    );
    assert.equal(sources.bn.audit.duplicateVerseIds.length, 0);
    assert.equal(sources.en.audit.duplicateVerseIds.length, 0);
    assert.equal(sources.bn.audit.unexpectedVerseMarkup.length, 0);
    assert.equal(sources.en.audit.unexpectedVerseMarkup.length, 0);
    assert.equal(sources.bn.audit.mergedVerseNodes.length, 16);
    const paired = auditBiblePair(sources.bn, sources.en);
    assert.equal(paired.missingBooks.length, 0);
    assert.equal(paired.chapterCountMismatches.length, 0);
    assert.equal(paired.verseNumberMismatches.length, 24);
});

test('book mapping, Bengali numerals, and reference parsing use the shared canonical registry', () => {
    assert.equal(bookOptions().length, 66);
    assert.deepEqual(bookOptions().find(book => book.name === 'Psalms'), { number: 19, name: 'Psalms', bnName: 'গীতসংহিতা' });
    assert.deepEqual(bookOptions().find(book => book.name === 'Romans'), { number: 45, name: 'Romans', bnName: 'রোমীয়' });
    assert.equal(toBengaliDigits('John 14:1–6'), 'John ১৪:১–৬');
    assert.deepEqual(parseReferenceInput('যোহন ১৪:১–৬'), { bookNumber: 43, chapter: 14, startVerse: 1, endVerse: 6 });
    assert.deepEqual(parseReferenceInput('Psalm 23:1-4'), { bookNumber: 19, chapter: 23, startVerse: 1, endVerse: 4 });
    assert.deepEqual(formatReference({ book: 'John', bnBook: 'যোহন', chapter: 14, startVerse: 1, endVerse: 6 }), {
        en: 'John 14:1–6', bn: 'যোহন ১৪:১–৬'
    });
});

test('invalid ranges, chapters, verses, and unreviewed bilingual alignment fail closed', () => {
    assert.throws(() => parseReferenceInput('Unknown 1:1'), /Unknown Bible book/u);
    assert.throws(() => parseReferenceInput('John 0:1'), /Chapter must be 1 or greater/u);
    assert.throws(() => parseReferenceInput('John 3:18-16'), /End verse/u);
    assert.throws(() => validateReference({ bookNumber: 43, chapter: 999, startVerse: 1, endVerse: 1 }, sources), /does not contain/u);
    assert.throws(() => validateReference({ bookNumber: 43, chapter: 3, startVerse: 999, endVerse: 999 }, sources), /does not contain/u);
    assert.throws(
        () => createBilingualPassage(sources, parseReferenceInput('Genesis 1:6-7')),
        /alignment requires review/u
    );
});

test('Bangla, English, bilingual, focus, title, continuation, and geometry behaviors preserve text', () => {
    const passage = createBilingualPassage(sources, parseReferenceInput('John 14:1-6'));
    for (const languageMode of ['bn', 'bilingual', 'en']) {
        const slides = generatePassageSlides(passage, {
            languageMode,
            themeId: 'word-light',
            focusVerse: 6,
            includeOpening: true,
            includeClosing: true
        });
        assert.equal(slides[0].kind, 'opening');
        assert.equal(slides.at(-1).kind, 'closing');
        const scripture = slides.filter(slide => slide.kind === 'scripture');
        assert.ok(scripture.every(slide => slideGeometryFits(slide)));
        assert.ok(scripture.some(slide => slide.focus && slide.segments.every(segment => segment.verseNumber === 6)));
        const language = languageMode === 'en' ? 'en' : 'bn';
        const assembled = reassembleSlideText(scripture, language).get(passage.id);
        passage.verses.forEach(verse => assert.equal(assembled.get(verse.number), verse[language].text));
    }

    const longText = 'ঈশ্বরের অনুগ্রহে আমরা চলি, '.repeat(30).trimEnd() + '।';
    const synthetic = {
        id: 'passage-long', bookNumber: 19, book: 'Psalms', bnBook: 'গীতসংহিতা', chapter: 119,
        startVerse: 1, endVerse: 1, translations: {},
        verses: [{ number: 1, bn: { text: longText, sourceNodeId: 'bn-long' }, en: { text: 'Grace carries us, '.repeat(30).trimEnd() + '.', sourceNodeId: 'en-long' } }]
    };
    const longSlides = generatePassageSlides(synthetic, { languageMode: 'bilingual', themeId: 'sacred-minimal' });
    assert.ok(longSlides.length > 1);
    assert.ok(longSlides.slice(1).every(slide => slide.continuation));
    assert.equal(reassembleSlideText(longSlides, 'bn').get(synthetic.id).get(1), longText);
    assert.ok(longSlides.every(slide => slideGeometryFits(slide, createApproximateMeasurer())));
    const manual = safelySplitSlide(longSlides[0]);
    assert.ok(manual && manual.length === 2);
    assert.equal(manual.flatMap(slide => slide.segments).map(segment => segment.bnText).join(''), longSlides[0].segments.map(segment => segment.bnText).join(''));
    assert.equal(SLIDE_GEOMETRY.banglaFontPx, 72);
});

test('saved-set revisions retain prior presentation copies and corrupt storage is not cleared', () => {
    const storage = memoryStorage();
    const first = saveScriptureSet(storageSet(), storage);
    assert.equal(first.revision, 1);
    const second = saveScriptureSet({ ...first, programType: 'Prayer Meeting' }, storage);
    assert.equal(second.revision, 2);
    assert.equal(loadScriptureSet(second.id, storage).programType, 'Prayer Meeting');
    assert.equal(listScriptureSets(storage).length, 1);
    const revisions = listScriptureSetRevisions(second.id, storage);
    assert.equal(revisions.length, 2);
    assert.equal(revisions[0].programType, 'Sunday Worship');
    assert.equal(revisions[1].programType, 'Prayer Meeting');
    storage.setItem(STORAGE_KEY, '{"schemaVersion":999,"sets":{}}');
    assert.throws(() => listScriptureSets(storage), /Unsupported or corrupt/u);
    assert.equal(storage.getItem(STORAGE_KEY), '{"schemaVersion":999,"sets":{}}');
});

test('twelve immutable themes, recommendations, filenames, and exact export metadata are stable', () => {
    assert.equal(SCRIPTURE_THEMES.length, 12);
    assert.equal(new Set(SCRIPTURE_THEMES.map(theme => theme.id)).size, 12);
    assert.ok(SCRIPTURE_THEMES.every(Object.isFrozen));
    assert.equal(getScriptureTheme('bangla-heritage').name, 'Bangla Heritage');
    assert.equal(recommendScriptureTheme('Holy Communion').id, 'communion');
    assert.equal(recommendScriptureTheme('Christmas Service').id, 'bethlehem');
    const set = storageSet();
    const manifest = buildScriptureExportManifest(set);
    assert.deepEqual(manifest.resolution, SCRIPTURE_EXPORT_RESOLUTION);
    assert.equal(manifest.sourceLock.bn.sha256, SOURCE_MANIFEST.bn.sha256);
    assert.equal(manifest.slides.length, set.slides.length);
    assert.deepEqual(manifest.slides[0].exactScripture, set.slides[0].segments.map(segment => ({
        verseNumber: segment.verseNumber,
        continuationIndex: segment.continuationIndex,
        bangla: segment.bnText,
        english: segment.enText,
        banglaSourceNodeId: segment.bnSourceNodeId,
        englishSourceNodeId: segment.enSourceNodeId
    })));
    assert.equal(scriptureExportFilename(set, 'pptx'), 'GPBC_2026-10-09_Sunday-Scripture.pptx');
});
