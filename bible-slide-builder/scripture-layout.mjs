export const SLIDE_GEOMETRY = Object.freeze({
    width: 1600,
    height: 900,
    safeWidth: 1360,
    bodyHeight: 585,
    banglaFontPx: 72,
    banglaLineHeight: 94,
    englishFontPx: 45,
    englishLineHeight: 58,
    verseGap: 26,
    pairGap: 12
});

export const LANGUAGE_MODES = Object.freeze({
    bn: 'Bangla',
    bilingual: 'Bangla + English',
    en: 'English'
});

const BENGALI_DIGITS = Object.freeze({
    0: '০', 1: '১', 2: '২', 3: '৩', 4: '৪',
    5: '৫', 6: '৬', 7: '৭', 8: '৮', 9: '৯'
});

export function toBengaliDigits(value) {
    return String(value).replace(/[0-9]/gu, digit => BENGALI_DIGITS[digit]);
}

export function formatReference({ book, bnBook, chapter, startVerse, endVerse, continuation = false }) {
    const range = startVerse === endVerse ? String(startVerse) : `${startVerse}–${endVerse}`;
    const bnRange = toBengaliDigits(range);
    return Object.freeze({
        en: `${book} ${chapter}:${range}${continuation ? ' (cont.)' : ''}`,
        bn: `${bnBook} ${toBengaliDigits(chapter)}:${bnRange}${continuation ? ' (চলমান)' : ''}`
    });
}

function graphemes(value) {
    if (globalThis.Intl?.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return [...segmenter.segment(value)].map(entry => entry.segment);
    }
    return Array.from(value);
}

function lineCount(text, measureWidth, maxWidth, prefix = '') {
    const value = `${prefix}${text}`;
    if (!value) return 0;
    const parts = value.match(/\S+\s*/gu) || [value];
    let lines = 1;
    let line = '';
    for (const part of parts) {
        if (!line || measureWidth(line + part) <= maxWidth) {
            line += part;
            continue;
        }
        if (measureWidth(part) <= maxWidth) {
            lines += 1;
            line = part;
            continue;
        }
        let fragment = line;
        for (const character of graphemes(part)) {
            if (fragment && measureWidth(fragment + character) > maxWidth) {
                lines += 1;
                fragment = character;
            } else {
                fragment += character;
            }
        }
        line = fragment;
    }
    return lines;
}

function defaultWidth(text, fontPx) {
    let total = 0;
    for (const character of graphemes(text)) {
        if (/\s/u.test(character)) total += fontPx * 0.28;
        else if (/\p{Script=Bengali}/u.test(character)) total += fontPx * 0.63;
        else if (/[A-Z0-9]/u.test(character)) total += fontPx * 0.58;
        else if (/\p{P}/u.test(character)) total += fontPx * 0.32;
        else total += fontPx * 0.51;
    }
    return total;
}

export function createApproximateMeasurer() {
    return Object.freeze({
        bn: text => defaultWidth(text, SLIDE_GEOMETRY.banglaFontPx),
        en: text => defaultWidth(text, SLIDE_GEOMETRY.englishFontPx)
    });
}

export function createCanvasMeasurer(documentObject = globalThis.document) {
    const canvas = documentObject?.createElement?.('canvas');
    const context = canvas?.getContext?.('2d');
    if (!context) return createApproximateMeasurer();
    return Object.freeze({
        bn(text) {
            context.font = `700 ${SLIDE_GEOMETRY.banglaFontPx}px "Noto Sans Bengali", "Hind Siliguri", sans-serif`;
            return context.measureText(text).width;
        },
        en(text) {
            context.font = `600 ${SLIDE_GEOMETRY.englishFontPx}px Inter, Arial, sans-serif`;
            return context.measureText(text).width;
        }
    });
}

export function measureSegment(segment, mode, measurer = createApproximateMeasurer()) {
    const number = segment.verseNumber;
    const bnLines = mode === 'en' || !segment.bnText ? 0 : lineCount(
        segment.bnText,
        measurer.bn,
        SLIDE_GEOMETRY.safeWidth,
        `${toBengaliDigits(number)}  `
    );
    const enLines = mode === 'bn' || !segment.enText ? 0 : lineCount(
        segment.enText,
        measurer.en,
        SLIDE_GEOMETRY.safeWidth,
        `${number}  `
    );
    const pairGap = bnLines && enLines ? SLIDE_GEOMETRY.pairGap : 0;
    return bnLines * SLIDE_GEOMETRY.banglaLineHeight
        + enLines * SLIDE_GEOMETRY.englishLineHeight
        + pairGap;
}

function boundaryCandidates(text) {
    const groups = [
        /[।.!?][”’"']?\s+/gu,
        /[;；]\s+/gu,
        /[:ঃ]\s+/gu,
        /[,，]\s+/gu,
        /\s+/gu
    ];
    const output = [];
    groups.forEach((pattern, priority) => {
        for (const match of text.matchAll(pattern)) {
            output.push({ index: match.index + match[0].length, priority });
        }
    });
    const segments = graphemes(text);
    let index = 0;
    for (const segment of segments) {
        index += segment.length;
        if (index < text.length) output.push({ index, priority: 5 });
    }
    return output;
}

function takeFittingPrefix(text, measureWidth, maxLines, prefix = '') {
    if (!text) return ['', ''];
    if (lineCount(text, measureWidth, SLIDE_GEOMETRY.safeWidth, prefix) <= maxLines) return [text, ''];
    const candidates = boundaryCandidates(text)
        .filter(candidate => candidate.index > 0 && candidate.index < text.length)
        .filter(candidate => lineCount(text.slice(0, candidate.index), measureWidth, SLIDE_GEOMETRY.safeWidth, prefix) <= maxLines);
    if (!candidates.length) throw new Error('A Scripture fragment cannot fit within the measured slide geometry.');
    const furthest = Math.max(...candidates.map(candidate => candidate.index));
    const nearEnd = candidates.filter(candidate => candidate.index >= furthest * 0.72);
    nearEnd.sort((left, right) => left.priority - right.priority || right.index - left.index);
    const splitAt = nearEnd[0].index;
    return [text.slice(0, splitAt), text.slice(splitAt)];
}

function sourceSegment(verse, index = 0, bnText = verse.bn.text, enText = verse.en.text) {
    return {
        verseNumber: verse.number,
        continuationIndex: index,
        bnText,
        enText,
        bnSourceNodeId: verse.bn.sourceNodeId,
        enSourceNodeId: verse.en.sourceNodeId
    };
}

function splitOversizeVerse(verse, mode, measurer) {
    const initial = sourceSegment(verse);
    if (measureSegment(initial, mode, measurer) <= SLIDE_GEOMETRY.bodyHeight) return [initial];
    const chunks = [];
    let bnRemaining = mode === 'en' ? '' : verse.bn.text;
    let enRemaining = mode === 'bn' ? '' : verse.en.text;
    let index = 0;
    const bnMaxLines = mode === 'bilingual' ? 4 : Math.floor(SLIDE_GEOMETRY.bodyHeight / SLIDE_GEOMETRY.banglaLineHeight);
    const enMaxLines = mode === 'bilingual' ? 3 : Math.floor(SLIDE_GEOMETRY.bodyHeight / SLIDE_GEOMETRY.englishLineHeight);
    while (bnRemaining || enRemaining) {
        const [bnText, nextBn] = bnRemaining
            ? takeFittingPrefix(bnRemaining, measurer.bn, bnMaxLines, `${toBengaliDigits(verse.number)}  `)
            : ['', ''];
        const [enText, nextEn] = enRemaining
            ? takeFittingPrefix(enRemaining, measurer.en, enMaxLines, `${verse.number}  `)
            : ['', ''];
        let candidate = sourceSegment(verse, index, bnText, enText);
        if (measureSegment(candidate, mode, measurer) > SLIDE_GEOMETRY.bodyHeight) {
            const reducedBnLines = mode === 'bilingual' ? 3 : bnMaxLines;
            const reducedEnLines = mode === 'bilingual' ? 2 : enMaxLines;
            const [smallerBn, smallerBnRest] = bnRemaining
                ? takeFittingPrefix(bnRemaining, measurer.bn, reducedBnLines, `${toBengaliDigits(verse.number)}  `)
                : ['', ''];
            const [smallerEn, smallerEnRest] = enRemaining
                ? takeFittingPrefix(enRemaining, measurer.en, reducedEnLines, `${verse.number}  `)
                : ['', ''];
            candidate = sourceSegment(verse, index, smallerBn, smallerEn);
            bnRemaining = smallerBnRest;
            enRemaining = smallerEnRest;
        } else {
            bnRemaining = nextBn;
            enRemaining = nextEn;
        }
        if (!candidate.bnText && !candidate.enText) throw new Error(`Unable to paginate verse ${verse.number}.`);
        chunks.push(candidate);
        index += 1;
    }
    return chunks;
}

function slidesFit(segments, mode, measurer) {
    if (!segments.length) return true;
    const content = segments.reduce((height, segment) => height + measureSegment(segment, mode, measurer), 0);
    return content + SLIDE_GEOMETRY.verseGap * (segments.length - 1) <= SLIDE_GEOMETRY.bodyHeight;
}

function makeSlide(passage, segments, mode, themeId, manual = false) {
    const first = segments[0];
    const last = segments.at(-1);
    const continuation = first.continuationIndex > 0;
    return {
        id: `${passage.id}-slide-${Math.random().toString(36).slice(2, 9)}`,
        kind: 'scripture',
        passageId: passage.id,
        bookNumber: passage.bookNumber,
        book: passage.book,
        bnBook: passage.bnBook,
        chapter: passage.chapter,
        startVerse: first.verseNumber,
        endVerse: last.verseNumber,
        continuation,
        reference: formatReference({
            book: passage.book,
            bnBook: passage.bnBook,
            chapter: passage.chapter,
            startVerse: first.verseNumber,
            endVerse: last.verseNumber,
            continuation
        }),
        languageMode: mode,
        themeId,
        focus: segments.some(segment => segment.focus),
        manual,
        segments
    };
}

function rebalanceOrphan(slides, mode, measurer, passage) {
    if (slides.length < 2 || slides.at(-1).segments.length !== 1) return;
    const previous = slides.at(-2);
    const last = slides.at(-1);
    if (previous.segments.length < 3 || previous.segments.at(-1).verseNumber === last.segments[0].verseNumber) return;
    const donated = previous.segments.at(-1);
    if (!slidesFit([donated, ...last.segments], mode, measurer)) return;
    previous.segments.pop();
    const previousReplacement = makeSlide(passage, previous.segments, mode, previous.themeId, previous.manual);
    const lastReplacement = makeSlide(passage, [donated, ...last.segments], mode, last.themeId, last.manual);
    slides.splice(slides.length - 2, 2, previousReplacement, lastReplacement);
}

function titleSlide(passage, mode, themeId, closing = false) {
    const reference = formatReference({
        book: passage.book,
        bnBook: passage.bnBook,
        chapter: passage.chapter,
        startVerse: passage.startVerse,
        endVerse: passage.endVerse
    });
    return {
        id: `${passage.id}-${closing ? 'closing' : 'opening'}-${Math.random().toString(36).slice(2, 9)}`,
        kind: closing ? 'closing' : 'opening',
        passageId: passage.id,
        reference,
        languageMode: mode,
        themeId,
        segments: [],
        manual: false
    };
}

export function generatePassageSlides(passage, options = {}) {
    const mode = options.languageMode || 'bn';
    if (!Object.hasOwn(LANGUAGE_MODES, mode)) throw new Error(`Unknown Scripture language mode: ${mode}`);
    const themeId = options.themeId || 'shepherds-peace';
    const measurer = options.measurer || createApproximateMeasurer();
    const focusVerse = Number(options.focusVerse) || null;
    const slides = [];
    let current = [];
    const flush = () => {
        if (current.length) slides.push(makeSlide(passage, current, mode, themeId));
        current = [];
    };
    for (const verse of passage.verses) {
        const chunks = splitOversizeVerse(verse, mode, measurer).map(segment => ({
            ...segment,
            focus: verse.number === focusVerse
        }));
        if (verse.number === focusVerse) flush();
        for (const segment of chunks) {
            if (current.length && (!slidesFit([...current, segment], mode, measurer)
                || segment.continuationIndex > 0)) flush();
            current.push(segment);
            if (segment.continuationIndex > 0 || verse.number === focusVerse) flush();
        }
    }
    flush();
    rebalanceOrphan(slides, mode, measurer, passage);
    const contentSlides = slides.map((slide, index) => ({ ...slide, pageNumber: index + 1, pageTotal: slides.length }));
    const output = [];
    if (options.includeOpening) output.push(titleSlide(passage, mode, themeId));
    output.push(...contentSlides);
    if (options.includeClosing) output.push(titleSlide(passage, mode, themeId, true));
    return output;
}

export function generateScriptureSet(passages, options = {}) {
    return passages.flatMap(passage => generatePassageSlides(passage, {
        ...options,
        themeId: passage.themeId || options.themeId,
        focusVerse: passage.focusVerse || null
    }));
}

export function reassembleSlideText(slides, language) {
    const field = language === 'bn' ? 'bnText' : 'enText';
    const byPassage = new Map();
    for (const slide of slides) {
        if (slide.kind !== 'scripture') continue;
        if (!byPassage.has(slide.passageId)) byPassage.set(slide.passageId, new Map());
        const verses = byPassage.get(slide.passageId);
        for (const segment of slide.segments) {
            verses.set(segment.verseNumber, (verses.get(segment.verseNumber) || '') + segment[field]);
        }
    }
    return byPassage;
}

export function refreshSlideMetadata(slides) {
    const passageGroups = new Map();
    for (const slide of slides) {
        if (slide.kind !== 'scripture') continue;
        if (!passageGroups.has(slide.passageId)) passageGroups.set(slide.passageId, []);
        passageGroups.get(slide.passageId).push(slide);
    }
    for (const group of passageGroups.values()) {
        group.forEach((slide, index) => {
            slide.pageNumber = index + 1;
            slide.pageTotal = group.length;
            if (!slide.segments.length) return;
            slide.startVerse = slide.segments[0].verseNumber;
            slide.endVerse = slide.segments.at(-1).verseNumber;
            slide.continuation = slide.segments[0].continuationIndex > 0;
            slide.reference = formatReference({
                book: slide.book,
                bnBook: slide.bnBook,
                chapter: slide.chapter,
                startVerse: slide.startVerse,
                endVerse: slide.endVerse,
                continuation: slide.continuation
            });
        });
    }
    return slides;
}

export function safelySplitSlide(slide) {
    if (slide.kind !== 'scripture' || !slide.segments.length) return null;
    if (slide.segments.length > 1) {
        const splitAt = Math.ceil(slide.segments.length / 2);
        return [
            { ...slide, id: `${slide.id}-a`, segments: slide.segments.slice(0, splitAt), manual: true },
            { ...slide, id: `${slide.id}-b`, segments: slide.segments.slice(splitAt), manual: true }
        ];
    }
    const original = slide.segments[0];
    const midpoint = Math.floor(Math.max(original.bnText.length, original.enText.length) / 2);
    const choose = text => {
        if (!text) return ['', ''];
        const candidates = boundaryCandidates(text);
        candidates.sort((left, right) => Math.abs(left.index - midpoint) - Math.abs(right.index - midpoint) || left.priority - right.priority);
        const point = candidates.find(candidate => candidate.index > 0 && candidate.index < text.length)?.index;
        return point ? [text.slice(0, point), text.slice(point)] : [text, ''];
    };
    const [bnFirst, bnSecond] = choose(original.bnText);
    const [enFirst, enSecond] = choose(original.enText);
    if (!bnSecond && !enSecond) return null;
    const first = { ...original, bnText: bnFirst, enText: enFirst };
    const second = { ...original, continuationIndex: original.continuationIndex + 1, bnText: bnSecond, enText: enSecond };
    return [
        { ...slide, id: `${slide.id}-a`, segments: [first], manual: true },
        { ...slide, id: `${slide.id}-b`, segments: [second], manual: true, continuation: true }
    ];
}

export function slideGeometryFits(slide, measurer = createApproximateMeasurer()) {
    return slide.kind !== 'scripture' || slidesFit(slide.segments, slide.languageMode, measurer);
}
