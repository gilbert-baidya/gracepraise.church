import {
    PRESENTATION, layoutSundaySet, parseSongSections, parseSectionOrder,
    splitLyricPhrases, segmentLineForWidth, estimateRenderedLines
} from './layout-engine.mjs?studio-startup=11';
import { loadClassicScript } from './songbook-adapter.mjs?studio-startup=11';
import { analyzeSongPropagation, getSongSourceAlignments } from './chord-propagation.mjs?studio-startup=11';

const RUNTIME_SOURCE = '../songbook-app.js?studio-runtime=4';
const RUNTIME_METHODS = [
    'getSongSearchFields', 'matchSongSearch',
    'parseChordLine', 'getLyricWordTokens', 'getSongChordAlignments',
    'getSongPhoneticLine', 'getSongBaseKey', 'getSongSourceCapo',
    'getSuggestedCapos', 'transposeChord', 'transposeChordSymbol',
    'transposeChordLine', 'isEnglishSong'
];
let runtimePromise = null;

export function loadSongbookPresentation() {
    if (!runtimePromise) {
        runtimePromise = loadClassicScript(RUNTIME_SOURCE).then(() => {
            const runtime = songbookRuntime();
            if (RUNTIME_METHODS.some(method => typeof runtime[method] !== 'function')) {
                throw new Error('Shared Songbook presentation runtime is incompatible. Reload the Studio with current local files.');
            }
            return runtime;
        });
    }
    return runtimePromise;
}

export const MODES = Object.freeze({
    congregation: 'Congregation',
    musician: 'Musician',
    phoneticChords: 'Phonetic + Chords',
    phonetic: 'Phonetic'
});
export const KEYS = Object.freeze(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
export const hasChords = mode => mode === 'musician' || mode === 'phoneticChords';
export const hasPhonetics = mode => mode === 'phonetic' || mode === 'phoneticChords';

export const CHORDED_LAYOUT = Object.freeze({
    maxHeightPx: 620,
    maxLogicalLines: 4,
    minFontPoints: 48,
    maxFontPoints: 54
});

export const CHORDED_PROFILES = Object.freeze([
    { fontPoints: 54, lyricLineHeight: 1.25, chordLineHeightPx: 48, gapPx: 12 },
    ...[54, 53, 52, 51, 50, 49, 48].map(fontPoints => ({
        fontPoints, lyricLineHeight: 1.16,
        chordLineHeightPx: 44 * fontPoints / 54, gapPx: 4
    }))
].map(Object.freeze));

export function validChordedLayout(layout) {
    return layout && CHORDED_PROFILES.some(profile => Object.keys(profile)
        .every(key => profile[key] === layout[key]));
}

export function applyChordedLayout(canvas, layout = CHORDED_PROFILES[0]) {
    if (!validChordedLayout(layout)) throw new Error('Invalid chorded slide fitting profile.');
    canvas.style.setProperty('--lyric-size', `${layout.fontPoints * PRESENTATION.cssPixelsPerPoint}px`);
    canvas.style.setProperty('--lyric-leading', String(layout.lyricLineHeight));
    canvas.style.setProperty('--chord-size', `${layout.fontPoints * PRESENTATION.cssPixelsPerPoint / 2}px`);
    canvas.style.setProperty('--chord-leading', `${layout.chordLineHeightPx}px`);
    canvas.style.setProperty('--phrase-gap', `${layout.gapPx}px`);
    canvas.style.setProperty('--chord-padding', `${12 * layout.fontPoints / 54}px`);
}

export function chordedGeometry(canvas) {
    const lyrics = canvas.querySelector('.slide-canvas__lyrics');
    const rows = [...lyrics.children];
    const height = rows.reduce((sum, row) => sum + row.offsetHeight, 0)
        + Math.max(0, rows.length - 1) * parseFloat(canvas.style.getPropertyValue('--phrase-gap') || '12');
    const footer = canvas.querySelector('.slide-canvas__footer');
    const title = canvas.querySelector('.slide-canvas__title');
    const serial = canvas.querySelector('.slide-canvas__serial');
    return {
        height,
        overflow: height > CHORDED_LAYOUT.maxHeightPx + 1
            || rows.some(row => row.scrollWidth > PRESENTATION.textWidthPx + 1)
            || (rows.length > 0 && (rows[0].offsetTop < title.offsetTop + title.offsetHeight + 12
                || rows.at(-1).offsetTop + rows.at(-1).offsetHeight > footer.offsetTop - 20
                || (serial && rows.at(-1).offsetTop + rows.at(-1).offsetHeight > serial.offsetTop - 12)))
    };
}

export function fitChordedPreview(canvas) {
    for (const profile of CHORDED_PROFILES) {
        applyChordedLayout(canvas, profile);
        if (!chordedGeometry(canvas).overflow) return { ...profile };
    }
    return null;
}

export function songbookRuntime() {
    const runtime = globalThis.window?.GPBCSongbookPresentation;
    if (!runtime) throw new Error('Shared Songbook presentation helpers are unavailable after runtime script loading.');
    return runtime;
}

export function keySteps(song, targetKey, runtime = songbookRuntime()) {
    if (!targetKey) return 0;
    if (!KEYS.includes(targetKey)) throw new Error('Invalid presentation key.');
    const base = runtime.getSongBaseKey(song);
    if (!base) throw new Error('This song has no detected original key; transposition is unavailable.');
    const steps = Array.from({ length: 12 }, (_, index) => index)
        .find(index => runtime.transposeChordSymbol(base, index) === targetKey
            || runtime.transposeChordSymbol(targetKey, -index) === base);
    if (steps !== undefined) return steps;
    // The reader preserves sharp/flat spelling, so compare both notes using its own transposer.
    const chromatic = Array.from({ length: 12 }, (_, index) => runtime.transposeChordSymbol('C', index));
    const pitch = note => chromatic.indexOf(runtime.transposeChordSymbol(note, 0).replace('Db', 'C#')
        .replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#'));
    if (pitch(base) < 0 || pitch(targetKey) < 0) throw new Error('Original key is not supported by the Songbook.');
    return (pitch(targetKey) - pitch(base) + 12) % 12;
}

export function displayChord(chord, song, settings = {}, runtime = songbookRuntime()) {
    return runtime.transposeChord(chord, keySteps(song, settings.key, runtime) - (settings.capo || 0));
}

export function initializeModes(set) {
    set.modeSlides ||= {};
    if (!Object.hasOwn(set.modeSlides, 'congregation') && set.slides.length) set.modeSlides.congregation = set.slides;
    set.modeSettings ||= {};
    for (const mode of Object.keys(MODES)) set.modeSettings[mode] ||= {};
    set.activeMode = Object.hasOwn(MODES, set.activeMode) ? set.activeMode : 'congregation';
    set.slides = set.modeSlides[set.activeMode] || [];
    return set;
}

export function selectMode(set, mode) {
    if (!Object.hasOwn(MODES, mode)) throw new Error('Unknown presentation mode.');
    if (Object.hasOwn(set.modeSlides, set.activeMode) || set.slides.length) set.modeSlides[set.activeMode] = set.slides;
    set.activeMode = mode;
    set.slides = set.modeSlides[mode] || [];
}

export function storageSnapshot(set) {
    if (Object.hasOwn(set.modeSlides, set.activeMode) || set.slides.length) set.modeSlides[set.activeMode] = set.slides;
    return { ...set, slides: set.modeSlides.congregation || [] };
}

export function renderPresentationLine(element, line, detail, {
    mode, song, settings = {}, runtime = songbookRuntime()
}) {
    const document = element.ownerDocument;
    element.replaceChildren();
    element.className = '';
    if (!hasChords(mode) || !detail) {
        element.textContent = line;
        return;
    }
    element.className = 'musician-line';
    if (!detail.anchors.length || !detail.alignmentValid || detail.progression) {
        element.classList.add('musician-line--unpositioned');
    }
    if (!detail.alignmentValid || detail.progression) {
        const review = document.createElement('span');
        review.className = 'unplaced-chords';
        review.textContent = 'Review positioning: ' + (detail.progression
            ? runtime.transposeChordLine(detail.progression, keySteps(song, settings.key, runtime) - (settings.capo || 0))
            : detail.anchors.map(anchor => displayChord(anchor.chord, song, settings, runtime)).join(' · '));
        element.appendChild(review);
    }
    let cursor = 0;
    for (const token of runtime.getLyricWordTokens(line)) {
        element.appendChild(document.createTextNode(line.slice(cursor, token.codeUnitStart)));
        const group = document.createElement('span');
        group.className = 'musician-word';
        const chords = document.createElement('span');
        chords.className = 'musician-chords';
        if (detail.alignmentValid) {
            chords.textContent = detail.anchors.filter(anchor => anchor.wordIndex === token.wordIndex)
                .map(anchor => displayChord(anchor.chord, song, settings, runtime)).join(' ');
        }
        group.dataset.wordIndex = String(token.wordIndex);
        const lyric = document.createElement('span');
        lyric.className = 'musician-word__lyric';
        lyric.textContent = token.text;
        group.append(chords, lyric);
        element.appendChild(group);
        cursor = token.codeUnitEnd;
    }
    element.appendChild(document.createTextNode(line.slice(cursor)));
}

function chordedWordWidths(text, anchors, measureWidth, measureChord, padding = 12) {
    const tokens = Array.from(text.matchAll(/\S+/gu));
    return tokens.map((token, index) => {
        const chords = anchors.filter(anchor => anchor.wordIndex === index).map(anchor => anchor.chord);
        return {
            token,
            width: Math.ceil(Math.max(measureWidth(token[0]), chords.length ? measureChord(chords.join(' ')) + padding : padding)),
            gap: index ? Math.ceil(measureWidth(text.slice(tokens[index - 1].index + tokens[index - 1][0].length, token.index))) : 0
        };
    });
}

function chordedRowWidth(text, anchors, measureWidth, measureChord, padding) {
    return chordedWordWidths(text, anchors, measureWidth, measureChord, padding)
        .reduce((sum, word) => sum + word.width + word.gap, 0);
}

function splitChordedPhrase(text, anchors, measureWidth, measureChord, padding) {
    const tokens = Array.from(text.matchAll(/\S+/gu));
    const words = chordedWordWidths(text, anchors, measureWidth, measureChord, padding);
    const rows = [];
    let start = 0;
    let width = 0;
    for (let index = 0; index < tokens.length; index += 1) {
        // Inline word boxes round separately; sum upper bounds rather than a whole-line width.
        const wordWidth = words[index].width;
        const gap = index === start ? 0 : words[index].gap;
        if (index > start && width + gap + wordWidth > PRESENTATION.textWidthPx) {
            rows.push({ start, end: index });
            start = index;
            width = 0;
        }
        width += (index === start ? 0 : gap) + wordWidth;
    }
    if (tokens.length) rows.push({ start, end: tokens.length });
    const last = rows.at(-1);
    const previous = rows.at(-2);
    if (last && previous && last.end - last.start < 3) {
        const rowWidth = (first, end) => words.slice(first, end)
            .reduce((sum, word, index) => sum + word.width + (index ? word.gap : 0), 0);
        let best = previous.end;
        let imbalance = Math.abs(rowWidth(previous.start, best) - rowWidth(best, last.end));
        for (let boundary = previous.start + 2; boundary < previous.end; boundary += 1) {
            if (last.end - boundary < 2) continue;
            const left = rowWidth(previous.start, boundary);
            const right = rowWidth(boundary, last.end);
            if (left > PRESENTATION.textWidthPx || right > PRESENTATION.textWidthPx) continue;
            const difference = Math.abs(left - right);
            if (difference < imbalance) {
                best = boundary;
                imbalance = difference;
            }
        }
        previous.end = best;
        last.start = best;
    }
    return rows.map(({ start: first, end }) => ({
        text: text.slice(tokens[first].index, tokens[end - 1].index + tokens[end - 1][0].length),
        anchors: anchors.filter(anchor => anchor.wordIndex >= first && anchor.wordIndex < end)
            .map(anchor => ({ ...anchor, wordIndex: anchor.wordIndex - first }))
    }));
}

export function fitChordedRows(rows, { measureWidth, measureChord, runtime = songbookRuntime() }) {
    for (const profile of CHORDED_PROFILES) {
        const scale = profile.fontPoints / 54;
        const lyricMeasure = text => measureWidth(text) * scale;
        const chordMeasure = text => Math.max(...Array.from({ length: 12 }, (_, steps) =>
            measureChord(text.split(' ').map(chord => runtime.transposeChord(chord, steps)).join(' ')))) * scale;
        let height = Math.max(0, rows.length - 1) * profile.gapPx;
        let fits = true;
        for (const row of rows) {
            if (chordedRowWidth(row.text, row.anchors, lyricMeasure, chordMeasure, 12 * scale) > PRESENTATION.textWidthPx) {
                fits = false;
                break;
            }
            height += profile.fontPoints * PRESENTATION.cssPixelsPerPoint * profile.lyricLineHeight;
            if (row.anchors.length && !row.progression) height += profile.chordLineHeightPx;
            if (row.progression) {
                const widest = Math.max(...Array.from({ length: 12 }, (_, steps) =>
                    measureChord('Review positioning: ' + runtime.transposeChordLine(row.progression, steps)))) * scale;
                // Reserve an extra row for word wrapping in uncertain/unplaced progressions.
                height += (Math.ceil(widest / PRESENTATION.textWidthPx) + 1) * profile.chordLineHeightPx;
            }
        }
        if (fits && height <= CHORDED_LAYOUT.maxHeightPx) return { ...profile };
    }
    return null;
}

function paginateChordedRows(rows, options) {
    const best = new Array(rows.length + 1);
    best[rows.length] = { pages: 0, cost: 0, groups: [] };
    for (let start = rows.length - 1; start >= 0; start -= 1) {
        for (let end = start + 1; end <= Math.min(rows.length, start + CHORDED_LAYOUT.maxLogicalLines); end += 1) {
            const group = rows.slice(start, end);
            const layout = fitChordedRows(group, options);
            const rest = best[end];
            if (!layout || !rest) continue;
            const splitSource = end < rows.length && rows[end - 1].sourceLineIndex === rows[end].sourceLineIndex;
            const tiny = group.length === 1 && group[0].text.trim().split(/\s+/u).length <= 2;
            const cost = rest.cost + (splitSource ? 800 : 0) + (tiny ? 1000 : 0)
                + (group.length === 1 ? 300 : 0) + (4 - group.length) ** 2 * 8
                + (54 - layout.fontPoints) * 6 + (layout.gapPx < 12 ? 12 : 0);
            const candidate = { pages: rest.pages + 1, cost, groups: [{ details: group, layout }, ...rest.groups] };
            if (!best[start] || candidate.pages < best[start].pages
                || (candidate.pages === best[start].pages && candidate.cost < best[start].cost)) best[start] = candidate;
        }
    }
    if (!best[0]) throw new Error('A chorded phrase cannot fit safely within the 48–54pt presentation range. Review the source phrase or chord progression.');
    return best[0].groups;
}

export function layoutMode(entries, catalog, mode, {
    measureWidth, measureChord = text => measureWidth(text) / 2, runtime = songbookRuntime(),
    propagateChords = true
} = {}) {
    if (!Object.hasOwn(MODES, mode)) throw new Error('Unknown presentation mode.');
    if (mode === 'congregation') return layoutSundaySet(entries, catalog, { measureWidth });
    const chorded = hasChords(mode);
    const phonetic = hasPhonetics(mode);
    const slides = [];
    for (const entry of entries) {
        const song = catalog.byId.get(entry.songId);
        if (!song) throw new Error(`Songbook #${entry.songId} is unavailable.`);
        const source = song.lyrics.split('\n');
        const alignments = getSongSourceAlignments(song, runtime);
        const audit = chorded && propagateChords ? analyzeSongPropagation(song, { runtime, measureWidth }) : null;
        const propagation = audit?.suggestions || new Map();
        const sections = parseSongSections(song);
        const sectionRows = new Map();
        let sourceCursor = 0;
        for (const section of sections) {
            const rows = [];
            for (const sourceText of section.lines) {
                const lineIndex = source.findIndex((line, index) => index >= sourceCursor && line.trimEnd() === sourceText);
                if (lineIndex < 0) throw new Error(`Cannot associate lyrics for Songbook #${song.id}.`);
                sourceCursor = lineIndex + 1;
                const originalAlignment = alignments.find(row => row.lyricLineIndex === lineIndex);
                const suggestion = !originalAlignment ? propagation.get(lineIndex) : null;
                const alignment = originalAlignment || (suggestion?.anchors.length
                    ? { anchors: suggestion.anchors, renderAnchored: true, confidence: 'SUGGESTED', source: 'same-song-template' } : null);
                const text = phonetic ? runtime.getSongPhoneticLine(song, sourceText) : sourceText;
                const sourceTokens = runtime.getLyricWordTokens(sourceText);
                const displayTokens = runtime.getLyricWordTokens(text);
                const correspondence = sourceTokens.length === displayTokens.length;
                const correspondenceValid = correspondence && alignment?.anchors.every(anchor =>
                    anchor.wordIndex >= 0 && anchor.wordIndex < displayTokens.length);
                const anchors = chorded && alignment?.renderAnchored && correspondenceValid ? alignment.anchors : [];
                const warnings = [];
                if (phonetic && !runtime.isEnglishSong(song)) warnings.push('Runtime phonetic output: pronunciation requires review.');
                if (chorded && !alignment) warnings.push(suggestion
                    ? 'Chord pattern needs review.' : !audit?.coverage.usableRows
                        ? 'No confirmed chord source available.'
                        : 'Chord pattern needs review: no compatible same-song source row.');
                if (suggestion?.anchors.length && !correspondenceValid) {
                    warnings.push('Chord pattern needs review: original and phonetic token identities do not correspond.');
                }
                if (chorded && originalAlignment && (!alignment.renderAnchored || !correspondenceValid
                    || alignment.confidence !== 'HIGH_CONFIDENCE'
                    || alignment.source === 'bengali-source-spacing')) {
                    warnings.push('Chord alignment requires review (source spacing / uncertain word mapping).');
                }
                const progression = chorded && alignment && !anchors.length
                    ? source[alignment.chordLineIndex] || '' : '';
                let wordOffset = 0;
                let progressionPending = progression;
                const minScale = CHORDED_LAYOUT.minFontPoints / 54;
                const phraseMeasure = chorded ? value => measureWidth(value) * minScale : measureWidth;
                const stableChordMeasure = chords => Math.max(...Array.from({ length: 12 }, (_, steps) =>
                    measureChord(chords.split(' ').map(chord => runtime.transposeChord(chord, steps)).join(' '))));
                const phrases = chorded && chordedRowWidth(text, anchors, phraseMeasure,
                    value => stableChordMeasure(value) * minScale, 12 * minScale) <= PRESENTATION.textWidthPx
                    ? [text] : splitLyricPhrases(text, phraseMeasure);
                for (const phrase of phrases) {
                    const wordCount = runtime.getLyricWordTokens(phrase).length;
                    const phraseAnchors = anchors.filter(anchor => anchor.wordIndex >= wordOffset && anchor.wordIndex < wordOffset + wordCount)
                        .map(anchor => ({ ...anchor, wordIndex: anchor.wordIndex - wordOffset }));
                    const pieces = chorded ? splitChordedPhrase(phrase, phraseAnchors, phraseMeasure,
                        value => stableChordMeasure(value) * minScale, 12 * minScale)
                        : segmentLineForWidth(phrase, measureWidth).map(piece => ({ text: piece, anchors: [] }));
                    let pieceOffset = 0;
                    for (const piece of pieces) {
                        rows.push({
                            ...piece, sourceText, sourceLineIndex: lineIndex, warnings: [...warnings],
                            sourceWordOffset: wordOffset + pieceOffset,
                            progression: progressionPending, alignmentValid: true,
                            ...(suggestion ? { propagation: { ...suggestion.propagation,
                                ...(!correspondenceValid && suggestion.anchors.length ? { status: 'needs-review' } : {})
                            } } : {})
                        });
                        pieceOffset += runtime.getLyricWordTokens(piece.text).length;
                        progressionPending = '';
                    }
                    wordOffset += wordCount;
                }
            }
            sectionRows.set(section.code, rows);
        }
        const unpaired = chorded ? alignments.filter(row => row.lyricLineIndex === null) : [];
        for (const code of parseSectionOrder(entry.sectionOrder?.join(', '), sections)) {
            const section = sections.find(item => item.code === code);
            const rows = sectionRows.get(code);
            let fittedGroups;
            if (chorded) {
                fittedGroups = paginateChordedRows(rows, { measureWidth, measureChord, runtime });
            } else {
                const groups = [];
                let group = [];
                for (const row of rows) {
                    if (group.length && (group.length >= 3
                        || estimateRenderedLines([...group.map(item => item.text), row.text], measureWidth) > 4)) {
                        groups.push(group);
                        group = [];
                    }
                    group.push(row);
                }
                if (group.length) groups.push(group);
                const last = groups.at(-1);
                const previous = groups.at(-2);
                if (last?.length === 1 && previous?.length === 3) last.unshift(previous.pop());
                fittedGroups = groups.map(details => ({ details }));
            }
            for (const { details, layout } of fittedGroups) slides.push({
                id: `song-${song.id}-${mode}-${slides.length + 1}`,
                songId: song.id, songTitle: song.title,
                sectionId: section.id, sectionCode: section.code, sectionLabel: section.label,
                lines: details.map(row => row.text),
                lineDetails: structuredClone(details),
                ...(layout ? { chordLayout: layout } : {}),
                reviewNotes: unpaired.length ? ['Unpaired chord rows retained for review: '
                    + unpaired.map(row => source[row.chordLineIndex]).join(' / ')] : [],
                manual: false
            });
        }
    }
    return slides;
}
