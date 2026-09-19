#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { BOOK_NUMBER_TO_NAME } = require('../services/bible/book-map');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'data', 'bible', 'source');
const INDEX_DIR = path.join(ROOT_DIR, 'data', 'bible', 'index');

const SOURCES = Object.freeze([
    {
        translationId: 'niv1984',
        label: 'NIV 1984',
        inputPath: path.join(SOURCE_DIR, 'en-niv-1984.xml'),
        outputPath: path.join(INDEX_DIR, 'niv1984.json')
    },
    {
        translationId: 'bsi2016ov',
        label: 'Bengali BSI 2016 O.V.',
        inputPath: path.join(SOURCE_DIR, 'bn-bsi-2016-ov.xml'),
        outputPath: path.join(INDEX_DIR, 'bsi2016ov.json')
    }
]);

const ENTITY_MAP = Object.freeze({
    amp: '&',
    apos: '\'',
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
});

function readSourceFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing Bible source file: ${filePath}`);
    }

    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function getAttribute(attributes, name) {
    const match = attributes.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
    return match ? match[1] : '';
}

function stripInnerTags(text) {
    return text.replace(/<[^>]+>/g, ' ');
}

function decodeXmlEntities(text) {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
        .replace(/&([a-z]+);/gi, (_, entity) => ENTITY_MAP[entity.toLowerCase()] || `&${entity};`);
}

function normalizeVerseText(text) {
    return decodeXmlEntities(stripInnerTags(text))
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTagBlocks(xml, tagName) {
    const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    const blocks = [];
    let match = pattern.exec(xml);

    while (match) {
        blocks.push({
            attributes: match[1],
            innerXml: match[2]
        });
        match = pattern.exec(xml);
    }

    return blocks;
}

function expandMergedVerseSpec(specification) {
    const verses = [];

    for (const segment of specification.split(',')) {
        const normalizedSegment = segment.trim();

        if (!normalizedSegment) {
            continue;
        }

        const rangeMatch = normalizedSegment.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            const start = Number.parseInt(rangeMatch[1], 10);
            const end = Number.parseInt(rangeMatch[2], 10);

            for (let verse = start; verse <= end; verse += 1) {
                verses.push(verse);
            }

            continue;
        }

        const verseNumber = Number.parseInt(normalizedSegment, 10);
        if (Number.isInteger(verseNumber)) {
            verses.push(verseNumber);
        }
    }

    return verses;
}

function parseVerseTargets(defaultVerse, verseText) {
    const mergedMatch = verseText.match(/^\[([0-9,\-]+)\]\s*/);
    if (!mergedMatch) {
        return {
            targets: [defaultVerse],
            text: verseText
        };
    }

    const targets = expandMergedVerseSpec(mergedMatch[1]);
    return {
        targets: targets.length > 0 ? targets : [defaultVerse],
        text: verseText.slice(mergedMatch[0].length).trim()
    };
}

function assignVerse(chapterIndex, verseNumber, verseText, statistics) {
    const verseKey = String(verseNumber);
    if (chapterIndex[verseKey]) {
        statistics.duplicateAssignments += 1;
        return;
    }

    chapterIndex[verseKey] = verseText;
    statistics.verses += 1;
}

function parseBibleXml(xml, translationId) {
    const bibleIndex = {};
    const statistics = {
        books: 0,
        chapters: 0,
        duplicateAssignments: 0,
        mergedAssignments: 0,
        verses: 0
    };

    const bookBlocks = extractTagBlocks(xml, 'BIBLEBOOK');

    for (const bookBlock of bookBlocks) {
        const bookNumber = Number.parseInt(getAttribute(bookBlock.attributes, 'bnumber'), 10);
        const bookName = BOOK_NUMBER_TO_NAME[bookNumber] || getAttribute(bookBlock.attributes, 'bname');

        if (!bookName) {
            throw new Error(`Unable to resolve book name for translation ${translationId} and bnumber ${bookNumber}`);
        }

        const bookIndex = {};
        const chapterBlocks = extractTagBlocks(bookBlock.innerXml, 'CHAPTER');
        statistics.books += 1;

        for (const chapterBlock of chapterBlocks) {
            const chapterNumber = Number.parseInt(getAttribute(chapterBlock.attributes, 'cnumber'), 10);
            const chapterKey = String(chapterNumber);
            const chapterIndex = {};
            const verseBlocks = extractTagBlocks(chapterBlock.innerXml, 'VERS');

            statistics.chapters += 1;

            for (const verseBlock of verseBlocks) {
                const verseNumber = Number.parseInt(getAttribute(verseBlock.attributes, 'vnumber'), 10);
                const normalizedText = normalizeVerseText(verseBlock.innerXml);

                if (!Number.isInteger(verseNumber) || !normalizedText) {
                    continue;
                }

                const { targets, text } = parseVerseTargets(verseNumber, normalizedText);
                if (!text) {
                    continue;
                }

                if (targets.length > 1 || String(targets[0]) !== String(verseNumber)) {
                    statistics.mergedAssignments += 1;
                }

                for (const targetVerse of targets) {
                    assignVerse(chapterIndex, targetVerse, text, statistics);
                }
            }

            if (Object.keys(chapterIndex).length > 0) {
                bookIndex[chapterKey] = chapterIndex;
            }
        }

        if (Object.keys(bookIndex).length > 0) {
            bibleIndex[bookName] = bookIndex;
        }
    }

    return { bibleIndex, statistics };
}

function writeIndex(outputPath, bibleIndex) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(bibleIndex), 'utf8');
}

function buildTranslationIndex(source) {
    const xml = readSourceFile(source.inputPath);
    const { bibleIndex, statistics } = parseBibleXml(xml, source.translationId);
    writeIndex(source.outputPath, bibleIndex);

    console.log(`[Bible Index] Built ${source.label}`);
    console.log(`  Source: ${path.relative(ROOT_DIR, source.inputPath)}`);
    console.log(`  Output: ${path.relative(ROOT_DIR, source.outputPath)}`);
    console.log(`  Books: ${statistics.books}`);
    console.log(`  Chapters: ${statistics.chapters}`);
    console.log(`  Verse entries: ${statistics.verses}`);
    console.log(`  Merged verse spans handled: ${statistics.mergedAssignments}`);
    console.log(`  Duplicate assignments skipped: ${statistics.duplicateAssignments}`);
}

function main() {
    for (const source of SOURCES) {
        buildTranslationIndex(source);
    }
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`[Bible Index] ${error.message}`);
        process.exitCode = 1;
    }
}
