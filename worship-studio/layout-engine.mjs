export const PRESENTATION = Object.freeze({
    widthPx: 1600,
    heightPx: 900,
    fontPoints: 54,
    cssPixelsPerPoint: 96 / 72,
    fontCssPx: 72,
    textWidthPx: 1340,
    maxRenderedLines: 4,
    preferredSourceLines: 3
});

export const SLIDE_THEMES = Object.freeze(['emerald', 'sapphire', 'plum', 'amber']);

export function songTheme(songId) {
    if (!Number.isInteger(songId) || songId < 1) throw new Error('Slide theme requires a stable Songbook ID.');
    return SLIDE_THEMES[(songId - 1) % SLIDE_THEMES.length];
}

export function isAttributionLine(line) {
    const text = String(line || '').trim();
    const labelledCredit = /^(?:[-–—]\s*)?(?:কথা(?:\s*ও\s*সুর)?|সুর|রচনা|রচনাকার|গীতিকার|সুরকার|লেখক|অনুবাদ|lyrics?(?:\s*(?:and|&)\s*music)?|music|words?(?:\s*(?:and|&)\s*music)?|lyricist|composer|writer|songwriter|written|composed|tuned)(?:\s+by)?\s*[:ঃ：]/iu;
    if (labelledCredit.test(text) || /^(?:written|composed|tuned|lyrics?|music|words?)\s+by\s+/iu.test(text)) return true;
    // The Bangla source uses standalone dash-prefixed names; retain numeric scripture references.
    return /^[-–—]\s*\p{L}/u.test(text) && !/[০-৯0-9]+\s*[:ঃ]/u.test(text);
}

const CHORD_SYMBOL_SOURCE = '[A-G](?:#|b)?(?:(?:maj|min|m|dim|aug|sus|s|add|no|M|Δ|°|ø)?(?:\\d+)?(?:/[A-G](?:#|b)?)?)';
const CHORD_TOKEN_RE = new RegExp(`^(?:${CHORD_SYMBOL_SOURCE}(?:\\(${CHORD_SYMBOL_SOURCE}\\))?|\\(${CHORD_SYMBOL_SOURCE}\\))$`, 'i');
const SECTION_ONLY_RE = /^(?:\[?\s*(verse|chorus|bridge|intro|outro|pre-chorus|refrain|tag)(?:\s+(\d+))?\s*\]?|ধূয়াঃ|ধুয়া|ধ্রুবক)\s*[:：]?$/iu;
const INLINE_BANGLA_CHORUS_RE = /^(ধূয়া|ধুয়া|ধ্রুবক)\s*[:：]/iu;

function cleanChordToken(token) {
    return String(token || '')
        .trim()
        .replace(/^\[/u, '')
        .replace(/\]$/u, '')
        .replace(/[|,;:]+$/u, '');
}

function isCompactChordToken(token) {
    let remainder = cleanChordToken(token);
    let count = 0;
    while (remainder) {
        const match = new RegExp(`^(${CHORD_SYMBOL_SOURCE})`, 'i').exec(remainder);
        if (!match) return false;
        count += 1;
        remainder = remainder.slice(match[1].length);
    }
    return count > 1;
}

export function isChordOnlyLine(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed || /[\u0980-\u09FF]/u.test(trimmed)) return false;
    const tokens = trimmed.split(/\s+/u).filter(Boolean);
    return tokens.length > 0 && tokens.every(token => CHORD_TOKEN_RE.test(cleanChordToken(token)) || isCompactChordToken(token));
}

function classifyHeading(line) {
    const trimmed = String(line || '').trim();
    const match = SECTION_ONLY_RE.exec(trimmed);
    if (!match) return null;
    const raw = (match[1] || trimmed).toLocaleLowerCase();
    if (/pre-chorus/iu.test(raw)) return { kind: 'prechorus', name: 'Pre-chorus' };
    if (/chorus|refrain|ধূয়া|ধুয়া|ধ্রুবক/iu.test(raw)) return { kind: 'chorus', name: 'Chorus' };
    if (/bridge/iu.test(raw)) return { kind: 'bridge', name: 'Bridge' };
    if (/intro/iu.test(raw)) return { kind: 'intro', name: 'Intro' };
    if (/outro/iu.test(raw)) return { kind: 'outro', name: 'Outro' };
    if (/tag/iu.test(raw)) return { kind: 'tag', name: 'Tag' };
    return { kind: 'verse', name: `Verse${match[2] ? ` ${match[2]}` : ''}` };
}

function makeSectionCode(kind, counters) {
    counters[kind] = (counters[kind] || 0) + 1;
    const prefixes = { verse: 'V', chorus: 'C', bridge: 'B', prechorus: 'PC', intro: 'I', outro: 'O', tag: 'T', stanza: 'S' };
    const prefix = prefixes[kind] || 'S';
    return kind === 'chorus' && counters[kind] === 1 ? 'C' : `${prefix}${counters[kind]}`;
}

export function parseSongSections(song) {
    const sourceLines = String(song?.lyrics || '').replace(/\r\n?/gu, '\n').split('\n');
    const counters = {};
    const sections = [];
    let pendingHeading = null;
    let lines = [];

    const flush = () => {
        if (!lines.length) return;
        const kind = pendingHeading?.kind || 'verse';
        const ordinal = (counters[kind] || 0) + 1;
        const code = makeSectionCode(kind, counters);
        const fallbackName = kind === 'verse' ? `Verse ${ordinal}` : `Section ${sections.length + 1}`;
        sections.push(Object.freeze({
            id: `song-${song.id}-${code.toLocaleLowerCase()}-${sections.length + 1}`,
            code,
            kind,
            label: pendingHeading?.name || fallbackName,
            lines: Object.freeze([...lines])
        }));
        lines = [];
        pendingHeading = null;
    };

    for (const rawLine of sourceLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) {
            flush();
            continue;
        }
        if (isChordOnlyLine(rawLine) || isAttributionLine(rawLine)) continue;

        const heading = classifyHeading(trimmed);
        if (heading) {
            flush();
            pendingHeading = heading;
            continue;
        }

        if (INLINE_BANGLA_CHORUS_RE.test(trimmed) && lines.length) flush();
        if (INLINE_BANGLA_CHORUS_RE.test(trimmed)) pendingHeading = { kind: 'chorus', name: 'Chorus' };
        lines.push(rawLine.trimEnd());
    }
    flush();

    if (!sections.length) {
        return [Object.freeze({
            id: `song-${song.id}-v1-1`,
            code: 'V1',
            kind: 'verse',
            label: 'Verse 1',
            lines: Object.freeze([])
        })];
    }

    return Object.freeze(sections);
}

export function defaultSectionOrder(sections, repeatChorus = false) {
    const sourceOrder = sections.map(section => section.code);
    if (!repeatChorus) return sourceOrder;
    const chorus = sections.find(section => section.kind === 'chorus');
    if (!chorus) return sourceOrder;

    const order = [];
    for (const section of sections) {
        if (section.kind === 'chorus') {
            if (!order.includes(section.code)) order.push(section.code);
            continue;
        }
        order.push(section.code);
        if (section.kind === 'verse') order.push(chorus.code);
    }
    return order;
}

export function parseSectionOrder(value, sections) {
    const available = new Set(sections.map(section => section.code.toLocaleUpperCase()));
    const requested = String(value || '')
        .split(/[\s,>→|]+/u)
        .map(token => token.trim().toLocaleUpperCase())
        .filter(token => available.has(token));
    return requested.length ? requested : sections.map(section => section.code);
}

export function createCanvasLineMeasurer({ fontCssPx = PRESENTATION.fontCssPx, fontFamily = 'Noto Sans Bengali, Nirmala UI, Arial, sans-serif' } = {}) {
    if (typeof document === 'undefined') throw new Error('Slide layout requires a browser canvas or an explicit text-width measurer.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Slide layout could not create a text measurement canvas.');
    context.font = `700 ${fontCssPx}px ${fontFamily}`;
    return text => context.measureText(String(text || '')).width;
}

export function segmentLineForWidth(line, measureWidth, maxWidth = PRESENTATION.textWidthPx) {
    const text = String(line || '').trim();
    if (!text || measureWidth(text) <= maxWidth) return [text];

    const tokens = text.match(/\S+\s*/gu) || [text];
    const pieces = [];
    let current = '';

    for (const token of tokens) {
        if (measureWidth(token.trimEnd()) > maxWidth) {
            if (current.trim()) pieces.push(current.trimEnd());
            current = '';
            const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(token.trim());
            for (const { segment } of graphemes) {
                if (current && measureWidth(current + segment) > maxWidth) {
                    pieces.push(current);
                    current = '';
                }
                current += segment;
            }
            if (/\s$/u.test(token)) current += ' ';
            continue;
        }
        const candidate = `${current}${token}`;
        if (current && measureWidth(candidate.trimEnd()) > maxWidth) {
            pieces.push(current.trimEnd());
            current = token.trimStart();
        } else {
            current = candidate;
        }
    }
    if (current.trim()) pieces.push(current.trimEnd());
    return pieces.length ? pieces : [text];
}

export function estimateRenderedLines(lines, measureWidth, maxWidth = PRESENTATION.textWidthPx) {
    return lines.reduce((total, line) => {
        return total + segmentLineForWidth(line, measureWidth, maxWidth).length;
    }, 0);
}

export function splitLyricPhrases(line, measureWidth, maxWidth = PRESENTATION.textWidthPx) {
    const text = String(line || '');
    const width = measureWidth(text);
    if (width <= maxWidth) return [text];

    const phraseWords = phrase => phrase.match(/\p{L}[\p{L}\p{M}]*/gu)?.length || 0;
    let best = null;
    for (const match of text.matchAll(/[,;:।!?，；：！？]\s+/gu)) {
        const boundary = match.index + 1;
        const left = text.slice(0, boundary);
        const right = text.slice(boundary + match[0].length - 1);
        const punctuation = match[0][0];
        const preceding = text[match.index - 1] || '';
        if ((punctuation === '।' && /^[০-৯0-9]+।$/u.test(left.trim()))
            || (punctuation === ':' && /[০-৯0-9]/u.test(preceding))) continue;
        if (phraseWords(left) < 2 || phraseWords(right) < 2) continue;
        const leftWidth = measureWidth(left);
        const rightWidth = measureWidth(right);
        if (Math.min(leftWidth, rightWidth) < maxWidth * 0.22) continue;
        const largest = Math.max(leftWidth, rightWidth);
        if (largest > width * 0.85) continue;
        const score = largest + Math.abs(leftWidth - rightWidth) * 0.15;
        if (!best || score < best.score) best = { left, right, score };
    }
    if (!best) {
        const repeatMarker = /(?:[-–—]\s*[২৩৪234]|\(\s*[২৩৪234]\s*\))\s*$/u;
        const linkingWords = new Set([
            'এ', 'এই', 'ওই', 'সেই', 'যে', 'ও', 'আর', 'আমার', 'তোমার', 'তাঁর', 'তার',
            'আমাদের', 'তোমাদের', 'তাদের', 'and', 'the', 'a', 'an', 'of', 'to', 'in',
            'with', 'for', 'our', 'your', 'his', 'her', 'my', 'their', 'when',
            'that', 'as', 'if', 'because'
        ]);
        let repeatedTail = null;
        for (const match of text.matchAll(/\s+/gu)) {
            const left = text.slice(0, match.index);
            const right = text.slice(match.index + match[0].length);
            const leftWords = phraseWords(left);
            const rightWords = phraseWords(right);
            const finalWord = left.match(/\p{L}[\p{L}\p{M}]*$/u)?.[0]?.toLocaleLowerCase();
            if (linkingWords.has(finalWord)) continue;
            const leftWidth = measureWidth(left);
            const rightWidth = measureWidth(right);
            if (leftWords < 2 || rightWords < 2 || leftWidth > maxWidth || rightWidth > maxWidth) continue;
            const largest = Math.max(leftWidth, rightWidth);
            if (repeatMarker.test(right) && rightWords <= 3
                && rightWidth >= maxWidth * 0.12 && largest <= width * 0.92) {
                const score = rightWords * maxWidth + rightWidth;
                if (!repeatedTail || score < repeatedTail.score) repeatedTail = { left, right, score };
                continue;
            }
            if (leftWords < 3 || rightWords < 3 || Math.min(leftWidth, rightWidth) < maxWidth * 0.4
                || Math.min(leftWidth, rightWidth) / largest < 0.55 || largest > width * 0.75) continue;
            const score = largest + Math.abs(leftWidth - rightWidth) * 0.15;
            if (!best || score < best.score) best = { left, right, score };
        }
        best = repeatedTail || best;
    }
    return best
        ? [...splitLyricPhrases(best.left, measureWidth, maxWidth), ...splitLyricPhrases(best.right, measureWidth, maxWidth)]
        : [text];
}

function uniqueSlideId(songId, sectionCode, index) {
    return `slide-${songId}-${sectionCode.toLocaleLowerCase()}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`;
}

export function songPageSerials(slides) {
    const totals = new Map();
    const positions = new Map();
    for (const slide of slides) totals.set(slide.songId, (totals.get(slide.songId) || 0) + 1);
    return slides.map(slide => {
        const position = (positions.get(slide.songId) || 0) + 1;
        positions.set(slide.songId, position);
        return `${position}/${totals.get(slide.songId)}`;
    });
}

function balanceSectionLines(lines, measureWidth, maxRenderedLines) {
    const units = lines.flatMap(line => {
        const pieces = segmentLineForWidth(line, measureWidth);
        return pieces.length > maxRenderedLines ? pieces : [line];
    });
    const groups = [];
    let group = [];
    for (const line of units) {
        if (group.length && (group.length >= PRESENTATION.preferredSourceLines
            || estimateRenderedLines([...group, line], measureWidth) > maxRenderedLines)) {
            groups.push(group);
            group = [];
        }
        group.push(line);
    }
    if (group.length) groups.push(group);
    for (let index = groups.length - 1; index > 0; index -= 1) {
        const current = groups[index];
        const previous = groups[index - 1];
        if (current.length === 1 && previous.length >= 3) {
            const candidate = [previous.at(-1), ...current];
            if (estimateRenderedLines(candidate, measureWidth) <= maxRenderedLines) {
                current.unshift(previous.pop());
            }
        }
    }
    return groups;
}

export function layoutSong(song, { sectionOrder, measureWidth, maxRenderedLines = PRESENTATION.maxRenderedLines } = {}) {
    const sections = parseSongSections(song);
    const order = parseSectionOrder(sectionOrder, sections);
    const sectionByCode = new Map(sections.map(section => [section.code.toLocaleUpperCase(), section]));
    const widthMeasure = measureWidth || createCanvasLineMeasurer();
    const slides = [];

    for (const code of order) {
        const section = sectionByCode.get(code.toLocaleUpperCase());
        if (!section) continue;
        const phrases = section.lines.flatMap(line => splitLyricPhrases(line, widthMeasure));
        for (const lines of balanceSectionLines(phrases, widthMeasure, maxRenderedLines)) {
            slides.push({
                id: uniqueSlideId(song.id, section.code, slides.length),
                songId: song.id,
                songTitle: song.title,
                sectionId: section.id,
                sectionCode: section.code,
                sectionLabel: section.label,
                lines,
                manual: false
            });
        }
    }
    return slides;
}

export function layoutSundaySet(entries, catalog, options = {}) {
    return entries.flatMap(entry => {
        const song = catalog.byId.get(entry.songId);
        if (!song) return [];
        return layoutSong(song, {
            ...options,
            sectionOrder: entry.sectionOrder
        });
    });
}
