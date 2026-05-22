'use strict';

const IS_NODE = typeof module !== 'undefined' && module.exports;
const fs = IS_NODE ? require('fs') : null;
const path = IS_NODE ? require('path') : null;
const bookMap = IS_NODE
    ? require('./book-map')
    : (typeof globalThis !== 'undefined' ? globalThis.GPBCBibleBookMap : null);

if (!bookMap) {
    throw new Error('[GPBCBibleService] GPBCBibleBookMap must be loaded before bible-service.js');
}

const {
    BOOK_NAME_TO_NUMBER: bookNameToNumber,
    BOOK_NUMBER_TO_BENGALI_NAME: bookNumberToBengaliName,
    normalizeDigits: normalizeDigitsFromBookMap,
    resolveBookName: resolveBookNameFromBookMap
} = bookMap;

const TRANSLATION_BY_LANGUAGE = Object.freeze({
    en: 'niv1984',
    bn: 'bsi2016ov'
});

const INDEX_DIRECTORY = IS_NODE
    ? path.resolve(__dirname, '../../data/bible/index')
    : null;
const SERVICE_BASE_URL = !IS_NODE && typeof document !== 'undefined' && document.currentScript?.src
    ? new URL('.', document.currentScript.src).href
    : (!IS_NODE && typeof window !== 'undefined'
        ? new URL('services/bible/', window.location.href).href
        : null);

const indexCache = Object.create(null);
const pendingBrowserLoads = Object.create(null);

function normalizeLanguage(language) {
    const normalized = String(language || 'en').trim().toLowerCase();

    if (!TRANSLATION_BY_LANGUAGE[normalized]) {
        throw new Error(`Unsupported Bible language: ${language}`);
    }

    return normalized;
}

function parseReference(reference) {
    const normalizedReference = normalizeDigitsFromBookMap(reference).replace(/\s+/g, ' ').trim();
    const match = normalizedReference.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);

    if (!match) {
        throw new Error(`Unsupported Bible reference: ${reference}`);
    }

    const canonicalBook = resolveBookNameFromBookMap(match[1]);
    if (!canonicalBook) {
        throw new Error(`Unknown Bible book: ${match[1]}`);
    }

    const chapter = String(Number.parseInt(match[2], 10));
    const startVerse = match[3] ? String(Number.parseInt(match[3], 10)) : null;
    const endVerse = match[4] ? String(Number.parseInt(match[4], 10)) : startVerse;

    return {
        book: canonicalBook,
        chapter,
        startVerse,
        endVerse
    };
}

function getIndexPath(language) {
    const translationId = TRANSLATION_BY_LANGUAGE[normalizeLanguage(language)];

    if (IS_NODE) {
        return {
            translationId,
            filePath: path.join(INDEX_DIRECTORY, `${translationId}.json`)
        };
    }

    if (!SERVICE_BASE_URL) {
        throw new Error('[GPBCBibleService] Unable to resolve browser service base URL');
    }

    return {
        translationId,
        url: new URL(`../../data/bible/index/${translationId}.json`, SERVICE_BASE_URL).href
    };
}

function loadIndexNode(language) {
    const { translationId, filePath } = getIndexPath(language);

    if (!indexCache[translationId]) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Bible index not found: ${filePath}. Run "node scripts/build-bible-index.js" first.`);
        }

        indexCache[translationId] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    return {
        translationId,
        index: indexCache[translationId]
    };
}

function loadIndexBrowser(language) {
    const { translationId, url } = getIndexPath(language);

    if (indexCache[translationId]) {
        return Promise.resolve({
            translationId,
            index: indexCache[translationId]
        });
    }

    if (!pendingBrowserLoads[translationId]) {
        pendingBrowserLoads[translationId] = fetch(url, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load Bible index: ${url} (${response.status})`);
                }

                return response.json();
            })
            .then((index) => {
                indexCache[translationId] = index;
                return index;
            })
            .finally(() => {
                delete pendingBrowserLoads[translationId];
            });
    }

    return pendingBrowserLoads[translationId].then((index) => ({
        translationId,
        index
    }));
}

function buildReferenceDisplay(parsedReference, language) {
    const normalizedLanguage = normalizeLanguage(language);
    const bookNumber = bookNameToNumber[parsedReference.book];
    const localizedBook = normalizedLanguage === 'bn'
        ? (bookNumberToBengaliName[bookNumber] || parsedReference.book)
        : parsedReference.book;

    if (!parsedReference.startVerse) {
        return `${localizedBook} ${parsedReference.chapter}`;
    }

    if (parsedReference.startVerse === parsedReference.endVerse) {
        return `${localizedBook} ${parsedReference.chapter}:${parsedReference.startVerse}`;
    }

    return `${localizedBook} ${parsedReference.chapter}:${parsedReference.startVerse}-${parsedReference.endVerse}`;
}

function sortVerses(verseEntries) {
    return verseEntries.sort((left, right) => Number(left.verse) - Number(right.verse));
}

function buildPassage(parsedReference, normalizedLanguage, translationId, index) {
    const book = index[parsedReference.book];

    if (!book) {
        return null;
    }

    const chapter = book[parsedReference.chapter];
    if (!chapter) {
        return null;
    }

    let verses = [];

    if (!parsedReference.startVerse) {
        verses = sortVerses(
            Object.entries(chapter).map(([verse, text]) => ({ verse, text }))
        );
    } else {
        const start = Number(parsedReference.startVerse);
        const end = Number(parsedReference.endVerse);

        for (let verse = start; verse <= end; verse += 1) {
            const verseKey = String(verse);
            if (chapter[verseKey]) {
                verses.push({ verse: verseKey, text: chapter[verseKey] });
            }
        }
    }

    if (verses.length === 0) {
        return null;
    }

    return {
        reference: buildReferenceDisplay(parsedReference, normalizedLanguage),
        canonicalReference: buildReferenceDisplay(parsedReference, 'en'),
        language: normalizedLanguage,
        translation: translationId,
        book: parsedReference.book,
        chapter: Number(parsedReference.chapter),
        verses,
        text: verses.map((entry) => entry.text).join(' ')
    };
}

function getPassage(reference, language) {
    const normalizedLanguage = normalizeLanguage(language);
    const parsedReference = parseReference(reference);

    if (IS_NODE) {
        const { translationId, index } = loadIndexNode(normalizedLanguage);
        return buildPassage(parsedReference, normalizedLanguage, translationId, index);
    }

    return loadIndexBrowser(normalizedLanguage).then(({ translationId, index }) =>
        buildPassage(parsedReference, normalizedLanguage, translationId, index)
    );
}

function getVerse(reference, language) {
    const parsedReference = parseReference(reference);

    if (!parsedReference.startVerse || parsedReference.startVerse !== parsedReference.endVerse) {
        throw new Error(`getVerse requires a single-verse reference. Received: ${reference}`);
    }

    if (IS_NODE) {
        const passage = getPassage(reference, language);
        return passage ? passage.verses[0].text : null;
    }

    return Promise.resolve(getPassage(reference, language)).then((passage) =>
        passage ? passage.verses[0].text : null
    );
}

function getReferenceDisplay(reference, language) {
    return buildReferenceDisplay(parseReference(reference), language);
}

function clearCache() {
    for (const translationId of Object.keys(indexCache)) {
        delete indexCache[translationId];
    }

    for (const translationId of Object.keys(pendingBrowserLoads)) {
        delete pendingBrowserLoads[translationId];
    }
}

const exportedBibleService = {
    clearCache,
    getPassage,
    getReferenceDisplay,
    getVerse,
    parseReference,
    TRANSLATION_BY_LANGUAGE
};

if (typeof globalThis !== 'undefined') {
    globalThis.GPBCBibleService = exportedBibleService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedBibleService;
}
