import '../services/bible/book-map.js';

const bookMap = globalThis.GPBCBibleBookMap;

if (!bookMap) {
    throw new Error('GPBC Bible book map is unavailable.');
}

const {
    BOOKS,
    BOOK_NUMBER_TO_NAME,
    BOOK_NUMBER_TO_BENGALI_NAME,
    normalizeDigits,
    resolveBookName
} = bookMap;

export const SOURCE_MANIFEST = Object.freeze({
    bn: Object.freeze({
        language: 'bn',
        translationId: 'bsi2016ov',
        label: 'Bengali BSI 2016 O.V.',
        path: '../data/bible/source/bn-bsi-2016-ov.xml',
        filename: 'bn-bsi-2016-ov.xml',
        sha256: '223ef4d4db4d989592dfd84b7f2095e017694bfd76dbe12c9612f906dd27b6b8'
    }),
    en: Object.freeze({
        language: 'en',
        translationId: 'niv1984',
        label: 'New International Version (1984)',
        path: '../data/bible/source/en-niv-1984.xml',
        filename: 'en-niv-1984.xml',
        sha256: '5fbe1d7bc934f0e118f53ed111fae334b3c1d78219e32ce6007e41401d39951c'
    })
});

const NAMED_ENTITIES = Object.freeze({
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: '\u00a0', quot: '"'
});

function parseAttributes(source = '') {
    const attributes = Object.create(null);
    for (const match of source.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) {
        attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
    }
    return attributes;
}

export function decodeXmlEntities(value) {
    return String(value)
        .replace(/&#x([0-9a-f]+);/giu, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
        .replace(/&#([0-9]+);/gu, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 10)))
        .replace(/&([a-z]+);/giu, (entity, name) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);
}

function elementText(innerXml) {
    return decodeXmlEntities(innerXml.replace(/<[^>]+>/gu, '')).trim();
}

function blocks(xml, tagName) {
    const values = [];
    const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'giu');
    for (const match of xml.matchAll(pattern)) {
        values.push({ attributes: parseAttributes(match[1]), innerXml: match[2] });
    }
    return values;
}

function canonicalNumbers(sourceNumber, sourceText) {
    const marker = sourceText.match(/^\[([0-9,\-]+)\]\s*/u);
    if (!marker) return { numbers: [sourceNumber], text: sourceText, marker: '' };
    const numbers = [];
    for (const part of marker[1].split(',')) {
        const range = part.trim().match(/^(\d+)-(\d+)$/u);
        if (range) {
            const start = Number(range[1]);
            const end = Number(range[2]);
            if (start > 0 && end >= start) {
                for (let value = start; value <= end; value += 1) numbers.push(value);
            }
        } else if (/^\d+$/u.test(part.trim())) {
            numbers.push(Number(part.trim()));
        }
    }
    return {
        numbers: numbers.length ? [...new Set(numbers)] : [sourceNumber],
        text: sourceText.slice(marker[0].length),
        marker: marker[0].trim()
    };
}

function rootMetadata(xml) {
    const declaration = xml.match(/^\uFEFF?<\?xml\s+([^?]+)\?>/iu);
    const root = xml.match(/<XMLBIBLE\b([^>]*)>/iu);
    return {
        declaration: declaration ? parseAttributes(declaration[1]) : {},
        root: root ? parseAttributes(root[1]) : {}
    };
}

export function parseBibleXml(xmlInput, definition) {
    if (!definition?.language || !definition.translationId) {
        throw new Error('Bible source definition requires a language and translationId.');
    }
    const xml = String(xmlInput).replace(/^\uFEFF/u, '');
    const metadata = rootMetadata(xml);
    const audit = {
        malformed: false,
        books: 0,
        chapters: 0,
        sourceVerseNodes: 0,
        canonicalVerseAssignments: 0,
        emptyVerses: [],
        duplicateVerseIds: [],
        mergedVerseNodes: [],
        unexpectedVerseMarkup: [],
        bookNameMismatches: [],
        missingBookNumbers: []
    };
    const booksByNumber = new Map();
    const bookElements = blocks(xml, 'BIBLEBOOK');
    if (!bookElements.length || !/<\/XMLBIBLE>\s*$/iu.test(xml)) {
        audit.malformed = true;
        throw new Error(`${definition.filename || definition.translationId} is not a complete XML Bible document.`);
    }

    for (const bookElement of bookElements) {
        const number = Number(bookElement.attributes.bnumber);
        const mappedName = BOOK_NUMBER_TO_NAME[number];
        const xmlName = bookElement.attributes.bname || '';
        if (!Number.isInteger(number) || !mappedName) {
            audit.missingBookNumbers.push(bookElement.attributes.bnumber || '(missing)');
            continue;
        }
        if (xmlName && xmlName !== mappedName) {
            audit.bookNameMismatches.push({ number, xmlName, mappedName });
        }
        if (booksByNumber.has(number)) {
            audit.duplicateVerseIds.push(`duplicate-book:${number}`);
            continue;
        }
        const book = {
            number,
            name: mappedName,
            sourceName: xmlName || null,
            bnName: BOOK_NUMBER_TO_BENGALI_NAME[number] || mappedName,
            chapters: new Map()
        };
        for (const chapterElement of blocks(bookElement.innerXml, 'CHAPTER')) {
            const chapterNumber = Number(chapterElement.attributes.cnumber);
            if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || book.chapters.has(chapterNumber)) {
                audit.duplicateVerseIds.push(`${number}:${chapterElement.attributes.cnumber || '(missing chapter)'}`);
                continue;
            }
            const chapter = { number: chapterNumber, verseNodes: [], versesByNumber: new Map() };
            for (const [nodeIndex, verseElement] of blocks(chapterElement.innerXml, 'VERS').entries()) {
                audit.sourceVerseNodes += 1;
                const sourceNumber = Number(verseElement.attributes.vnumber);
                const sourceText = elementText(verseElement.innerXml);
                const unexpectedMarkup = verseElement.innerXml.match(/<[^>]+>/gu) || [];
                if (unexpectedMarkup.length) {
                    audit.unexpectedVerseMarkup.push({ book: number, chapter: chapterNumber, verse: sourceNumber, markup: unexpectedMarkup });
                }
                if (!Number.isInteger(sourceNumber) || sourceNumber < 1 || !sourceText) {
                    audit.emptyVerses.push({ book: number, chapter: chapterNumber, verse: verseElement.attributes.vnumber || '' });
                    continue;
                }
                const expanded = canonicalNumbers(sourceNumber, sourceText);
                const node = Object.freeze({
                    id: `${definition.language}-${number}-${chapterNumber}-${sourceNumber}-${nodeIndex}`,
                    sourceNumber,
                    canonicalNumbers: Object.freeze(expanded.numbers),
                    sourceText,
                    text: expanded.text,
                    structuralMarker: expanded.marker
                });
                if (expanded.numbers.length > 1 || expanded.numbers[0] !== sourceNumber) {
                    audit.mergedVerseNodes.push({
                        book: number,
                        chapter: chapterNumber,
                        sourceNumber,
                        canonicalNumbers: [...expanded.numbers],
                        marker: expanded.marker
                    });
                }
                chapter.verseNodes.push(node);
                for (const canonicalNumber of expanded.numbers) {
                    if (chapter.versesByNumber.has(canonicalNumber)) {
                        audit.duplicateVerseIds.push(`${number}:${chapterNumber}:${canonicalNumber}`);
                        continue;
                    }
                    chapter.versesByNumber.set(canonicalNumber, node);
                    audit.canonicalVerseAssignments += 1;
                }
            }
            book.chapters.set(chapterNumber, chapter);
            audit.chapters += 1;
        }
        booksByNumber.set(number, book);
        audit.books += 1;
    }

    const missingCanonicalBooks = BOOKS.filter(book => !booksByNumber.has(book.number)).map(book => book.number);
    audit.missingBookNumbers.push(...missingCanonicalBooks);
    return Object.freeze({
        language: definition.language,
        translationId: definition.translationId,
        label: definition.label,
        filename: definition.filename,
        metadata: Object.freeze(metadata),
        booksByNumber,
        audit: Object.freeze(audit)
    });
}

export async function sha256Hex(bytes) {
    if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable.');
    const view = bytes instanceof ArrayBuffer
        ? bytes
        : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', view);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function loadSource(definition, fetcher) {
    const response = await fetcher(definition.path, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Bible source ${definition.filename} returned HTTP ${response.status}.`);
    const bytes = await response.arrayBuffer();
    const digest = await sha256Hex(bytes);
    if (digest !== definition.sha256) {
        throw new Error(`Bible source integrity failure for ${definition.filename}: expected ${definition.sha256}, received ${digest}.`);
    }
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { bible: parseBibleXml(xml, definition), digest, bytes: bytes.byteLength };
}

let sourcePromise;

export function loadAuthoritativeBibles(fetcher = globalThis.fetch?.bind(globalThis)) {
    if (!fetcher) return Promise.reject(new Error('A fetch implementation is required to load Bible XML.'));
    if (!sourcePromise) {
        sourcePromise = Promise.all([
            loadSource(SOURCE_MANIFEST.bn, fetcher),
            loadSource(SOURCE_MANIFEST.en, fetcher)
        ]).then(([bn, en]) => Object.freeze({
            bn: bn.bible,
            en: en.bible,
            sourceLock: Object.freeze({
                bn: Object.freeze({ sha256: bn.digest, bytes: bn.bytes, filename: SOURCE_MANIFEST.bn.filename }),
                en: Object.freeze({ sha256: en.digest, bytes: en.bytes, filename: SOURCE_MANIFEST.en.filename })
            }),
            audit: auditBiblePair(bn.bible, en.bible)
        })).catch(error => {
            sourcePromise = undefined;
            throw error;
        });
    }
    return sourcePromise;
}

export function clearBibleSourceCache() {
    sourcePromise = undefined;
}

export function auditBiblePair(bn, en) {
    const missingBooks = [];
    const chapterCountMismatches = [];
    const verseNumberMismatches = [];
    for (const canonical of BOOKS) {
        const bnBook = bn.booksByNumber.get(canonical.number);
        const enBook = en.booksByNumber.get(canonical.number);
        if (!bnBook || !enBook) {
            missingBooks.push({ number: canonical.number, bn: Boolean(bnBook), en: Boolean(enBook) });
            continue;
        }
        if (bnBook.chapters.size !== enBook.chapters.size) {
            chapterCountMismatches.push({
                book: canonical.name,
                bn: bnBook.chapters.size,
                en: enBook.chapters.size
            });
        }
        const chapters = new Set([...bnBook.chapters.keys(), ...enBook.chapters.keys()]);
        for (const chapterNumber of chapters) {
            const bnChapter = bnBook.chapters.get(chapterNumber);
            const enChapter = enBook.chapters.get(chapterNumber);
            const bnNumbers = bnChapter ? [...bnChapter.versesByNumber.keys()].sort((a, b) => a - b) : [];
            const enNumbers = enChapter ? [...enChapter.versesByNumber.keys()].sort((a, b) => a - b) : [];
            if (bnNumbers.length !== enNumbers.length || bnNumbers.some((number, index) => number !== enNumbers[index])) {
                verseNumberMismatches.push({ book: canonical.name, chapter: chapterNumber, bn: bnNumbers, en: enNumbers });
            }
        }
    }
    return Object.freeze({
        missingBooks: Object.freeze(missingBooks),
        chapterCountMismatches: Object.freeze(chapterCountMismatches),
        verseNumberMismatches: Object.freeze(verseNumberMismatches)
    });
}

export function parseReferenceInput(reference) {
    const normalized = normalizeDigits(String(reference || '')).replace(/\s+/gu, ' ').trim();
    const match = normalized.match(/^(.+?)\s+(\d+)\s*[:ঃ]\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/u);
    if (!match) throw new Error('Use a reference such as John 3:16-18 or যোহন ৩:১৬-১৮.');
    const book = resolveBookName(match[1]);
    if (!book) throw new Error(`Unknown Bible book: ${match[1]}`);
    const canonical = BOOKS.find(entry => entry.name === book);
    return validateReference({
        bookNumber: canonical.number,
        chapter: Number(match[2]),
        startVerse: Number(match[3]),
        endVerse: Number(match[4] || match[3])
    });
}

export function validateReference(reference, sources) {
    const value = {
        bookNumber: Number(reference.bookNumber),
        chapter: Number(reference.chapter),
        startVerse: Number(reference.startVerse),
        endVerse: Number(reference.endVerse)
    };
    if (!BOOK_NUMBER_TO_NAME[value.bookNumber]) throw new Error('Choose a known Bible book.');
    if (!Number.isInteger(value.chapter) || value.chapter < 1) throw new Error('Chapter must be 1 or greater.');
    if (!Number.isInteger(value.startVerse) || value.startVerse < 1) throw new Error('Start verse must be 1 or greater.');
    if (!Number.isInteger(value.endVerse) || value.endVerse < value.startVerse) {
        throw new Error('End verse must be the same as or greater than the start verse.');
    }
    if (sources) {
        for (const language of ['bn', 'en']) {
            const book = sources[language]?.booksByNumber.get(value.bookNumber);
            const chapter = book?.chapters.get(value.chapter);
            if (!chapter) throw new Error(`${sources[language]?.label || language} does not contain ${BOOK_NUMBER_TO_NAME[value.bookNumber]} ${value.chapter}.`);
            for (let verse = value.startVerse; verse <= value.endVerse; verse += 1) {
                if (!chapter.versesByNumber.has(verse)) {
                    throw new Error(`${sources[language].label} does not contain ${BOOK_NUMBER_TO_NAME[value.bookNumber]} ${value.chapter}:${verse}.`);
                }
            }
        }
    }
    return Object.freeze(value);
}

function uniqueId(reference) {
    return `passage-${reference.bookNumber}-${reference.chapter}-${reference.startVerse}-${reference.endVerse}`;
}

export function createBilingualPassage(sources, reference) {
    const request = validateReference(reference, sources);
    const bnBook = sources.bn.booksByNumber.get(request.bookNumber);
    const enBook = sources.en.booksByNumber.get(request.bookNumber);
    const bnChapter = bnBook.chapters.get(request.chapter);
    const enChapter = enBook.chapters.get(request.chapter);
    const verses = [];
    const seenBnNodes = new Set();
    const seenEnNodes = new Set();
    for (let number = request.startVerse; number <= request.endVerse; number += 1) {
        const bn = bnChapter.versesByNumber.get(number);
        const en = enChapter.versesByNumber.get(number);
        if (bn.canonicalNumbers.length !== 1 || bn.canonicalNumbers[0] !== number
            || en.canonicalNumbers.length !== 1 || en.canonicalNumbers[0] !== number) {
            throw new Error(`Bilingual source alignment requires review at ${enBook.name} ${request.chapter}:${number}; no verses were paired.`);
        }
        if (seenBnNodes.has(bn.id) || seenEnNodes.has(en.id)) {
            throw new Error(`Duplicate source assignment detected at ${enBook.name} ${request.chapter}:${number}.`);
        }
        seenBnNodes.add(bn.id);
        seenEnNodes.add(en.id);
        verses.push(Object.freeze({
            number,
            bn: Object.freeze({ text: bn.text, sourceText: bn.sourceText, sourceNodeId: bn.id }),
            en: Object.freeze({ text: en.text, sourceText: en.sourceText, sourceNodeId: en.id })
        }));
    }
    return Object.freeze({
        id: uniqueId(request),
        ...request,
        book: enBook.name,
        bnBook: bnBook.bnName,
        translations: Object.freeze({ bn: sources.bn.label, en: sources.en.label }),
        verses: Object.freeze(verses)
    });
}

export function bookOptions() {
    return BOOKS.map(book => Object.freeze({ number: book.number, name: book.name, bnName: book.bnName }));
}

export function chapterOptions(sources, bookNumber) {
    const bn = sources.bn.booksByNumber.get(Number(bookNumber));
    const en = sources.en.booksByNumber.get(Number(bookNumber));
    if (!bn || !en) return [];
    return [...bn.chapters.keys()].filter(number => en.chapters.has(number)).sort((a, b) => a - b);
}

export function verseOptions(sources, bookNumber, chapterNumber) {
    const bn = sources.bn.booksByNumber.get(Number(bookNumber))?.chapters.get(Number(chapterNumber));
    const en = sources.en.booksByNumber.get(Number(bookNumber))?.chapters.get(Number(chapterNumber));
    if (!bn || !en) return [];
    return [...bn.versesByNumber.keys()].filter(number => en.versesByNumber.has(number)).sort((a, b) => a - b);
}
