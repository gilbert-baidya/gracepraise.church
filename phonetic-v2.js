'use strict';

/*
 * GPBC Phonetic V2 shadow engine.
 *
 * This module is deliberately not loaded by songbook.html. The current Song
 * Reader continues to use convertToPhonetic() in songbook-app.js. V2 is
 * available to tests and comparison tooling only until it is reviewed.
 */

const reviewedWords = typeof module !== 'undefined' && module.exports
    ? require('./phonetic-reviewed-words')
    : (typeof globalThis !== 'undefined' && globalThis.GPBCReviewedPhoneticWords) || {};
const reviewedPhrases = typeof module !== 'undefined' && module.exports
    ? require('./phonetic-reviewed-phrases')
    : (typeof globalThis !== 'undefined' && globalThis.GPBCReviewedPhoneticPhrases) || {};

const BENGALI_LETTER_RE = /[\u0980-\u09FF]/u;
const BENGALI_MARK_RE = /[\u0981-\u0983\u09BC-\u09CD\u09D7\u09C3-\u09D4]/u;
const BENGALI_WORD_RE = /[\u0980-\u09FF]/u;
const COMBINING_MARKS = new Set(Array.from('ঁংঃ়ািীুূৃেৈোৌ্ৗ'));
const VOWEL_SIGNS = Object.freeze({
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u',
    'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', 'ৗ': 'o'
});

const INDEPENDENT_VOWELS = Object.freeze({
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u',
    'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
});

const CONSONANTS = Object.freeze({
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't'
});

const SPECIAL_SIGNS = Object.freeze({
    'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n'
});

/* Centralized orthographic conjunct base sequences. These are mechanical
 * candidates only; reviewed lexical overrides take precedence. */
const CONJUNCT_PHONETICS = Object.freeze({
    'ক+ষ': 'ksh', 'ক+ত': 'kt', 'ক+র': 'kr', 'গ+র': 'gr',
    'ত+ম': 'tm', 'ত+র': 'tr', 'ত+ত': 'tt', 'দ+ধ': 'ddh',
    'দ+ব': 'db', 'দ+র': 'dr', 'ন+ত': 'nt', 'ন+দ': 'nd',
    'ন+ধ': 'ndh', 'ন+ন': 'nn', 'প+র': 'pr', 'ব+দ': 'bd',
    'ব+র': 'br', 'ম+প': 'mp', 'ম+ব': 'mb', 'ম+ভ': 'mbh',
    'শ+র': 'shr', 'শ+চ': 'shch', 'ষ+ট': 'sht', 'ষ+ঠ': 'shth',
    'স+ত': 'st', 'স+থ': 'sth', 'স+প': 'sp', 'স+ম': 'sm',
    'হ+ম': 'hm', 'হ+র': 'hr', 'ল+ল': 'll', 'র+য': 'ry',
    'ব+য': 'by', 'প+য': 'py', 'ম+য': 'my', 'দ+য': 'dy',
    'ন+য': 'ny'
});

const BENGALI_PUNCTUATION = Object.freeze({
    '।': '.', '॥': '..', 'ঽ': ''
});

function unique(values) {
    return Array.from(new Set(values));
}

function normalizeBanglaForPhonetics(input) {
    return String(input == null ? '' : input)
        .normalize('NFC')
        // Canonicalize visually equivalent nukta forms in memory only.
        .replace(/ড়/gu, 'ড়')
        .replace(/ঢ়/gu, 'ঢ়')
        .replace(/য়/gu, 'য়')
        .replace(/য়/gu, 'য়')
        .normalize('NFC');
}

function isCombiningMark(character) {
    return COMBINING_MARKS.has(character);
}

function isBengaliBase(character) {
    return BENGALI_LETTER_RE.test(character) && !isCombiningMark(character);
}

function tokenizeBanglaGraphemes(input) {
    const normalized = normalizeBanglaForPhonetics(input);
    const characters = Array.from(normalized);
    const graphemes = [];

    for (let index = 0; index < characters.length; index += 1) {
        const character = characters[index];

        if (isBengaliBase(character)) {
            let raw = character;
            let cursor = index + 1;
            while (cursor < characters.length && isCombiningMark(characters[cursor])) {
                raw += characters[cursor];
                cursor += 1;
            }
            graphemes.push({ raw, kind: 'BENGALI', base: character });
            index = cursor - 1;
            continue;
        }

        if (isCombiningMark(character)) {
            // Orphan marks are kept visible to the analyzer but never emitted
            // as Bengali by the converter.
            graphemes.push({ raw: character, kind: 'ORPHAN_MARK', base: character });
            continue;
        }

        graphemes.push({ raw: character, kind: 'OTHER', base: character });
    }

    return graphemes;
}

function tokenizeBanglaWords(input) {
    const words = [];
    let current = '';

    tokenizeBanglaGraphemes(input).forEach(grapheme => {
        if (grapheme.kind === 'BENGALI') {
            current += grapheme.raw;
            return;
        }

        if (current) {
            words.push(current);
            current = '';
        }
    });

    if (current) words.push(current);
    return words;
}

function splitGrapheme(raw) {
    const characters = Array.from(raw);
    return {
        base: characters[0] || '',
        marks: characters.slice(1)
    };
}

function hasMark(grapheme, mark) {
    return splitGrapheme(grapheme).marks.includes(mark);
}

function vowelMarkOf(grapheme) {
    return splitGrapheme(grapheme).marks.find(mark => VOWEL_SIGNS[mark]) || '';
}

function isConsonantGrapheme(grapheme) {
    return Boolean(grapheme && grapheme.kind === 'BENGALI' && CONSONANTS[splitGrapheme(grapheme.raw).base]);
}

function consonantBase(base) {
    return CONSONANTS[base] || '';
}

function convertIndependentGrapheme(grapheme, flags) {
    const { base, marks } = splitGrapheme(grapheme.raw);

    if (BENGALI_PUNCTUATION[base] !== undefined) return BENGALI_PUNCTUATION[base];
    if (SPECIAL_SIGNS[base]) return SPECIAL_SIGNS[base];
    if (INDEPENDENT_VOWELS[base]) return INDEPENDENT_VOWELS[base];
    if (!CONSONANTS[base]) {
        flags.push(marks.length ? 'unsupported-combining-mark' : 'safe-fallback');
        return '?';
    }

    const basePhonetic = consonantBase(base);
    const vowelMark = marks.find(mark => VOWEL_SIGNS[mark]);
    if (vowelMark) return basePhonetic + VOWEL_SIGNS[vowelMark];
    if (marks.includes('্')) return basePhonetic;

    // য় is a final semivowel representation, not a default o-bearing y.
    if (base === 'য' && marks.includes('়')) return 'y';
    if (base === 'ড়' || base === 'ঢ়') return basePhonetic;
    return basePhonetic + 'o';
}

function convertWordDetailed(word) {
    const normalized = normalizeBanglaForPhonetics(word);
    const reviewed = reviewedWords[normalized];
    if (reviewed) {
        return {
            text: reviewed.phonetic,
            normalized,
            flags: [],
            reviewedWord: true,
            phraseOverride: false,
            fallbackUsed: false,
            graphemes: tokenizeBanglaGraphemes(normalized)
        };
    }

    const graphemes = tokenizeBanglaGraphemes(normalized);
    const flags = [];
    let output = '';

    for (let index = 0; index < graphemes.length; index += 1) {
        const current = graphemes[index];

        if (current.kind === 'ORPHAN_MARK') {
            flags.push('orphan-combining-mark', 'safe-fallback');
            output += '?';
            continue;
        }

        if (current.kind !== 'BENGALI') {
            output += BENGALI_PUNCTUATION[current.raw] !== undefined
                ? BENGALI_PUNCTUATION[current.raw]
                : current.raw;
            continue;
        }

        const currentParts = splitGrapheme(current.raw);
        const next = graphemes[index + 1];

        if (hasMark(current.raw, '্') && isConsonantGrapheme(next)) {
            const nextParts = splitGrapheme(next.raw);
            const pairKey = currentParts.base + '+' + nextParts.base;
            const pair = CONJUNCT_PHONETICS[pairKey]
                || consonantBase(currentParts.base) + consonantBase(nextParts.base);
            const nextVowel = vowelMarkOf(next.raw);
            output += pair + (nextVowel ? VOWEL_SIGNS[nextVowel] : 'o');
            flags.push('conjunct');
            index += 1;
            continue;
        }

        output += convertIndependentGrapheme(current, flags);
    }

    if (!output && normalized) {
        output = '?';
        flags.push('safe-fallback');
    }

    return {
        text: output,
        normalized,
        flags: unique(flags),
        reviewedWord: false,
        phraseOverride: false,
        fallbackUsed: flags.includes('safe-fallback') || flags.includes('orphan-combining-mark'),
        graphemes
    };
}

const normalizedPhraseOverrides = Object.freeze(
    Object.keys(reviewedPhrases).reduce((result, phrase) => {
        result[normalizeBanglaForPhonetics(phrase).trim()] = reviewedPhrases[phrase];
        return result;
    }, {})
);

function findExactPhraseOverride(input) {
    const normalized = normalizeBanglaForPhonetics(input).trim();
    return normalizedPhraseOverrides[normalized]
        ? { key: normalized, ...normalizedPhraseOverrides[normalized] }
        : null;
}

function preserveOuterWhitespace(source, replacement) {
    const leading = String(source).match(/^\s*/u)?.[0] || '';
    const trailing = String(source).match(/\s*$/u)?.[0] || '';
    return leading + replacement + trailing;
}

function capitalizeLineStart(text) {
    return String(text).replace(/^(\s*[^A-Za-z]*)([a-z])/u, (match, prefix, firstLetter) => {
        return prefix + firstLetter.toUpperCase();
    });
}

function convertTextV2Detailed(input, options = {}) {
    const source = String(input == null ? '' : input);
    const phrase = findExactPhraseOverride(source);
    if (phrase) {
        return {
            text: preserveOuterWhitespace(source, phrase.phonetic),
            normalized: normalizeBanglaForPhonetics(source),
            flags: [],
            reviewedWord: false,
            phraseOverride: true,
            fallbackUsed: false,
            mixedScript: false,
            graphemes: tokenizeBanglaGraphemes(source)
        };
    }

    const graphemes = tokenizeBanglaGraphemes(source);
    const flags = [];
    const reviewedWordHits = [];
    let output = '';
    let index = 0;

    while (index < graphemes.length) {
        const grapheme = graphemes[index];
        if (grapheme.kind !== 'BENGALI') {
            if (grapheme.kind === 'ORPHAN_MARK') {
                output += '?';
                flags.push('orphan-combining-mark', 'safe-fallback');
            } else {
                output += BENGALI_PUNCTUATION[grapheme.raw] !== undefined
                    ? BENGALI_PUNCTUATION[grapheme.raw]
                    : grapheme.raw;
            }
            index += 1;
            continue;
        }

        let word = '';
        while (index < graphemes.length && graphemes[index].kind === 'BENGALI') {
            word += graphemes[index].raw;
            index += 1;
        }

        const detail = convertWordDetailed(word);
        output += detail.text;
        flags.push(...detail.flags);
        if (detail.reviewedWord) reviewedWordHits.push(word);
    }

    const renderedText = options.capitalizeLineStart ? capitalizeLineStart(output) : output;

    return {
        text: renderedText,
        normalized: normalizeBanglaForPhonetics(source),
        flags: unique(flags),
        reviewedWord: reviewedWordHits.length > 0,
        reviewedWordHits,
        phraseOverride: false,
        fallbackUsed: flags.includes('safe-fallback') || flags.includes('orphan-combining-mark'),
        mixedScript: BENGALI_LETTER_RE.test(renderedText),
        graphemes
    };
}

function convertToPhoneticV2(input, options = {}) {
    return convertTextV2Detailed(input, options).text;
}

function convertWordV2(input) {
    return convertWordDetailed(input).text;
}

function convertSongLineV2(song, line, options = {}) {
    const source = String(line == null ? '' : line);
    const songOverride = options.songOverrides?.[song?.id];
    const key = normalizeBanglaForPhonetics(source.trim());
    const songLineOverride = songOverride?.lines?.[key];
    if (songLineOverride) return preserveOuterWhitespace(source, songLineOverride);
    return convertToPhoneticV2(source, { capitalizeLineStart: true });
}

function analyzeV2(input, options = {}) {
    return convertTextV2Detailed(input, options);
}

const API = Object.freeze({
    normalizeBanglaForPhonetics,
    tokenizeBanglaGraphemes,
    tokenizeBanglaWords,
    convertToPhoneticV2,
    convertWordV2,
    convertSongLineV2,
    analyzeV2,
    findExactPhraseOverride,
    reviewedWordCount: Object.keys(reviewedWords).length,
    reviewedPhraseCount: Object.keys(reviewedPhrases).length,
    reviewedWords,
    reviewedPhrases,
    conjunctPhonetics: CONJUNCT_PHONETICS
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}

if (typeof globalThis !== 'undefined') {
    globalThis.GPBCPhoneticV2 = API;
}
