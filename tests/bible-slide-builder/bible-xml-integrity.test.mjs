import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    SOURCE_MANIFEST,
    createBilingualPassage,
    parseBibleXml,
    parseReferenceInput
} from '../../bible-slide-builder/bible-data-adapter.mjs';
import {
    generatePassageSlides,
    reassembleSlideText
} from '../../bible-slide-builder/scripture-layout.mjs';
import { buildScriptureExportManifest } from '../../bible-slide-builder/scripture-export.mjs';
import { KNOWN_PASSAGES } from './known-passages.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const sourcePaths = Object.freeze({
    bn: path.join(repository, 'data/bible/source/bn-bsi-2016-ov.xml'),
    en: path.join(repository, 'data/bible/source/en-niv-1984.xml')
});
const LOCKED_SHA256 = Object.freeze({
    bn: '223ef4d4db4d989592dfd84b7f2095e017694bfd76dbe12c9612f906dd27b6b8',
    en: '5fbe1d7bc934f0e118f53ed111fae334b3c1d78219e32ce6007e41401d39951c'
});

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function sourceSnapshot() {
    const [bn, en] = await Promise.all([fs.readFile(sourcePaths.bn), fs.readFile(sourcePaths.en)]);
    return { bytes: { bn, en }, hashes: { bn: digest(bn), en: digest(en) } };
}

function verseMapFromManifest(manifest, passageId, language) {
    const key = language === 'bn' ? 'bangla' : 'english';
    const values = new Map();
    for (const slide of manifest.slides.filter(slide => slide.passageId === passageId && slide.kind === 'scripture')) {
        for (const segment of slide.exactScripture) {
            values.set(segment.verseNumber, (values.get(segment.verseNumber) || '') + segment[key]);
        }
    }
    return values;
}

test('authoritative Bible XML bytes retain the milestone baseline SHA-256 values', async () => {
    const before = await sourceSnapshot();
    assert.deepEqual(before.hashes, LOCKED_SHA256);
    assert.equal(SOURCE_MANIFEST.bn.sha256, LOCKED_SHA256.bn);
    assert.equal(SOURCE_MANIFEST.en.sha256, LOCKED_SHA256.en);
    assert.ok(before.bytes.bn.includes(Buffer.from('Bengali (BSI) 2016 O.V. Bible')));
    assert.ok(before.bytes.en.includes(Buffer.from('biblename="ENGLISHNIV"')));

    // Read and hash again at the end of the test so accidental parser/build writes cannot hide.
    const after = await sourceSnapshot();
    assert.deepEqual(after.hashes, before.hashes);
    assert.deepEqual(after.bytes.bn, before.bytes.bn);
    assert.deepEqual(after.bytes.en, before.bytes.en);
});

test('known passages remain exact from XML through bilingual slide generation and export metadata', async () => {
    const before = await sourceSnapshot();
    assert.deepEqual(before.hashes, LOCKED_SHA256);
    const sources = {
        bn: parseBibleXml(before.bytes.bn.toString('utf8'), SOURCE_MANIFEST.bn),
        en: parseBibleXml(before.bytes.en.toString('utf8'), SOURCE_MANIFEST.en)
    };

    for (const expected of KNOWN_PASSAGES) {
        const passage = createBilingualPassage(sources, parseReferenceInput(expected.input));
        assert.equal(passage.book, expected.book, `${expected.input} canonical book`);
        assert.equal(passage.bnBook, expected.bnBook, `${expected.input} Bangla book`);
        assert.equal(passage.chapter, expected.chapter, `${expected.input} chapter`);
        assert.deepEqual(passage.verses.map(verse => verse.number), expected.verses.map(verse => verse.number), `${expected.input} verse numbers`);
        assert.equal(new Set(passage.verses.map(verse => verse.number)).size, expected.verses.length, `${expected.input} has no duplicate verse numbers`);
        assert.equal(passage.verses.length, expected.verses.length, `${expected.input} has no omitted verses`);

        passage.verses.forEach((verse, index) => {
            const fixture = expected.verses[index];
            assert.equal(verse.number, fixture.number, `${expected.input} bilingual pair ${fixture.number}`);
            assert.equal(verse.bn.text, fixture.bn, `${expected.input} Bangla ${fixture.number} exact punctuation/text`);
            assert.equal(verse.bn.sourceText, fixture.bn, `${expected.input} Bangla ${fixture.number} direct XML text`);
            assert.equal(verse.en.text, fixture.en, `${expected.input} English ${fixture.number} exact punctuation/text`);
            assert.equal(verse.en.sourceText, fixture.en, `${expected.input} English ${fixture.number} direct XML text`);
            assert.match(verse.bn.sourceNodeId, new RegExp(`^bn-${passage.bookNumber}-${expected.chapter}-${fixture.number}-`));
            assert.match(verse.en.sourceNodeId, new RegExp(`^en-${passage.bookNumber}-${expected.chapter}-${fixture.number}-`));
        });

        const slides = generatePassageSlides(passage, {
            languageMode: 'bilingual',
            themeId: 'shepherds-peace'
        });
        assert.ok(slides.length > 0, `${expected.input} generated slides`);
        assert.ok(slides.every(slide => slide.book === expected.book && slide.bnBook === expected.bnBook));
        assert.ok(slides.every(slide => slide.chapter === expected.chapter && slide.languageMode === 'bilingual'));
        const generatedBn = reassembleSlideText(slides, 'bn').get(passage.id);
        const generatedEn = reassembleSlideText(slides, 'en').get(passage.id);
        assert.deepEqual([...generatedBn.keys()], expected.verses.map(verse => verse.number), `${expected.input} generated Bangla numbering`);
        assert.deepEqual([...generatedEn.keys()], expected.verses.map(verse => verse.number), `${expected.input} generated English numbering`);
        expected.verses.forEach(verse => {
            assert.equal(generatedBn.get(verse.number), verse.bn, `${expected.input} Bangla ${verse.number} survived pagination`);
            assert.equal(generatedEn.get(verse.number), verse.en, `${expected.input} English ${verse.number} survived pagination`);
        });

        const set = {
            date: '2026-10-09',
            name: 'Bible XML Integrity',
            programType: 'Sunday Worship',
            languageMode: 'bilingual',
            themeId: 'shepherds-peace',
            sourceLock: {
                bn: { filename: SOURCE_MANIFEST.bn.filename, sha256: LOCKED_SHA256.bn },
                en: { filename: SOURCE_MANIFEST.en.filename, sha256: LOCKED_SHA256.en }
            },
            slides
        };
        const manifest = buildScriptureExportManifest(set);
        const manifestBn = verseMapFromManifest(manifest, passage.id, 'bn');
        const manifestEn = verseMapFromManifest(manifest, passage.id, 'en');
        expected.verses.forEach(verse => {
            assert.equal(manifestBn.get(verse.number), verse.bn, `${expected.input} Bangla ${verse.number} survived export metadata`);
            assert.equal(manifestEn.get(verse.number), verse.en, `${expected.input} English ${verse.number} survived export metadata`);
        });
    }

    const after = await sourceSnapshot();
    assert.deepEqual(after.hashes, before.hashes, 'both XML files remain byte-for-byte unchanged after final slide generation');
    assert.deepEqual(after.bytes.bn, before.bytes.bn);
    assert.deepEqual(after.bytes.en, before.bytes.en);
});
