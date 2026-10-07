import { parseSongSections, isChordOnlyLine } from './layout-engine.mjs?studio-startup=11';

const normalize = text => text.replace(/^[০-৯0-9]+[।.)]\s*/u, '')
    .replace(/[([][০-৯0-9]+(?:x|বার)?[)\]]/giu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/gu, ' ').trim();

function chordParts(chord, runtime) {
    const optional = /^\((.+)\)$/u.exec(chord);
    if (optional && runtime.parseChordLine(optional[1])) {
        return [{ raw: chord, symbols: [chord], grouped: true }];
    }
    return runtime.parseChordLine(chord)?.parts || [];
}

export function getSongSourceAlignments(song, runtime) {
    const original = runtime.getSongChordAlignments(song);
    if (runtime.isEnglishSong(song)) return original;
    const lines = song.lyrics.split('\n');
    const changed = new Map();
    const normalized = lines.map((line, index) => {
        if (!isChordOnlyLine(line) || runtime.parseChordLine(line)) return line;
        const parts = [...line.matchAll(/\S+/gu)];
        if (!parts.every(part => chordParts(part[0], runtime).length)) return line;
        changed.set(index, parts.map(part => part[0]));
        return line.replace(/(^|\s)\(([^()\s]+)\)(?=\s|$)/gu, '$1 $2 ');
    });
    if (!changed.size) return original;
    // Recover printed optional rows through the shared aligner using a disposable copy.
    const recovered = runtime.getSongChordAlignments({ ...song, lyrics: normalized.join('\n') })
        .filter(row => changed.has(row.chordLineIndex)
            && !original.some(existing => existing.lyricLineIndex === row.lyricLineIndex))
        .map(row => ({
            ...row, confidence: 'MEDIUM_CONFIDENCE', source: 'studio-printed-optional',
            anchors: row.anchors.map((anchor, index) => ({ ...anchor, chord: changed.get(row.chordLineIndex)[index] }))
        }));
    return [...original, ...recovered].sort((a, b) => a.chordLineIndex - b.chordLineIndex);
}

export function songSourceSections(song) {
    const source = song.lyrics.split('\n');
    let cursor = 0;
    return parseSongSections(song).map(section => {
        const rows = section.lines.map(text => {
            const index = source.findIndex((line, position) => position >= cursor && line.trimEnd() === text);
            if (index < 0) throw new Error(`Cannot associate lyrics for Songbook #${song.id}.`);
            cursor = index + 1;
            return { text, index };
        });
        const heading = source.slice(0, rows[0]?.index || 0)
            .filter(line => line.trim() && !isChordOnlyLine(line)).at(-1) || '';
        return { ...section, rows,
            explicitVerse: /^\[?\s*verse(?:\s+\d+)?\s*\]?\s*[:：]?\s*$/iu.test(heading) };
    });
}

function positions(text, runtime, measureWidth) {
    const tokens = runtime.getLyricWordTokens(text);
    const first = /^[০-৯0-9]+[।.)]$/u.test(text.slice(tokens[0]?.codeUnitStart || 0,
        tokens[1]?.codeUnitStart ?? text.length).trim()) ? 1 : 0;
    const start = tokens[first]?.codeUnitStart || 0;
    let width = Math.max(1, measureWidth(text.slice(start)));
    let phrase = 0;
    const words = tokens.slice(first).map((token, offset) => {
        const index = offset + first;
        const value = text.slice(token.codeUnitStart, tokens[index + 1]?.codeUnitStart ?? text.length).trim();
        const word = { index, start: token.codeUnitStart, value, phrase,
            position: measureWidth(text.slice(start, token.codeUnitStart)) / width };
        if (!/^-+$/u.test(value) && /[,;:।.!?—–-]$/u.test(value)) phrase += 1;
        return word;
    }).filter(word => /[\p{L}\p{N}]/u.test(word.value)
        && !/^[([][০-৯0-9]+(?:x|বার)?[)\]]$/iu.test(word.value));
    const phraseIds = [...new Set(words.map(word => word.phrase))];
    if (words.length) width = Math.max(1, measureWidth(text.slice(start,
        words.at(-1).start + tokens[words.at(-1).index].text.length)));
    for (const word of words) {
        word.phrase = phraseIds.indexOf(word.phrase);
        word.position = measureWidth(text.slice(start, word.start)) / width;
    }
    return { words, width, phrases: new Set(words.map(word => word.phrase)).size };
}

function mapRow(source, target, alignment, runtime, measureWidth) {
    const from = positions(source.text, runtime, measureWidth);
    const to = positions(target.text, runtime, measureWidth);
    const ratio = to.width / from.width;
    if (from.words.length < 2 || to.words.length < 2 || ratio < 0.4 || ratio > 2.5
        || Math.abs(from.phrases - to.phrases) > 1) return null;
    let previous = 0;
    let adjustment = 0;
    const anchors = [];
    for (const anchor of alignment.anchors) {
        const word = from.words.find(item => item.index === anchor.wordIndex)
            || from.words.reduce((a, b) => Math.abs(a.index - anchor.wordIndex) <= Math.abs(b.index - anchor.wordIndex) ? a : b);
        let candidates = to.words;
        let relative = word.position;
        if (from.phrases === to.phrases) {
            const sourcePhrase = from.words.filter(item => item.phrase === word.phrase);
            candidates = to.words.filter(item => item.phrase === word.phrase);
            const start = sourcePhrase[0].position;
            const end = sourcePhrase.at(-1).position;
            relative = end > start ? (word.position - start) / (end - start) : 0;
            const targetStart = candidates[0].position;
            relative = targetStart + relative * (candidates.at(-1).position - targetStart);
        } else if (word === from.words[0]) {
            relative = to.words[0].position;
        } else if (word === from.words.at(-1)) {
            relative = to.words.at(-1).position;
        }
        const eligible = candidates.filter(item => item.index >= previous);
        if (!eligible.length) return null;
        const best = eligible.reduce((a, b) => Math.abs(a.position - relative) <= Math.abs(b.position - relative) ? a : b);
        previous = best.index;
        adjustment = Math.max(adjustment, Math.abs(best.position - relative));
        const parts = chordParts(anchor.chord, runtime);
        if (!parts.length) return null;
        // Keep grouped/optional harmony intact; separate printed compact runs into real symbols.
        const symbols = parts.flatMap(part => part.grouped ? [part.raw] : part.symbols);
        for (const chord of symbols) anchors.push({
            chord, wordIndex: best.index, anchor: best.value,
            sourceWordIndex: anchor.wordIndex, relativePosition: word.position
        });
    }
    const high = from.phrases === to.phrases && ratio >= 0.7 && ratio <= 1.45
        && adjustment <= 0.12 && alignment.confidence === 'HIGH_CONFIDENCE'
        && alignment.source !== 'bengali-source-spacing';
    const score = Math.abs(Math.log(ratio)) * 0.35 + Math.abs(from.phrases - to.phrases) * 0.3
        + adjustment * 1.5 + Math.abs(from.words.length - to.words.length) / Math.max(from.words.length, to.words.length) * 0.15;
    return { anchors, score, confidence: high ? 'high' : 'medium' };
}

export function analyzeSongPropagation(song, { runtime, measureWidth }) {
    const sections = songSourceSections(song);
    const alignments = getSongSourceAlignments(song, runtime);
    const byLine = new Map(alignments.filter(row => row.lyricLineIndex !== null)
        .map(row => [row.lyricLineIndex, row]));
    const usable = row => {
        const alignment = byLine.get(row.index);
        return alignment?.renderAnchored && alignment.anchors.length && alignment.confidence !== 'LOW_CONFIDENCE'
            && alignment.anchors.every(anchor => anchor.wordIndex >= 0
                && anchor.wordIndex < runtime.getLyricWordTokens(row.text).length && chordParts(anchor.chord, runtime).length);
    };
    const sourceSections = sections.filter(section => section.rows.some(usable));
    const canonicalRows = section => section.rows.reduce((rows, row) => {
        const previous = rows.at(-1);
        if (previous && normalize(previous.text) === normalize(row.text)) {
            const quality = item => usable(item) ? (byLine.get(item.index).confidence === 'HIGH_CONFIDENCE' ? 2 : 1) : 0;
            if (quality(row) > quality(previous)) rows[rows.length - 1] = row;
        } else rows.push(row);
        return rows;
    }, []);
    const symbolSequence = row => byLine.get(row.index)?.anchors.flatMap(anchor =>
        chordParts(anchor.chord, runtime).flatMap(part => part.grouped ? [part.raw] : part.symbols)) || [];
    const patterns = [];
    const sourceFamilies = new Map();
    for (const section of sourceSections) {
        const rows = canonicalRows(section).map(row => {
            if (!usable(row)) return null;
            const location = positions(row.text, runtime, measureWidth);
            return JSON.stringify({ chords: symbolSequence(row), phrases: location.phrases,
                distribution: byLine.get(row.index).anchors.map(anchor => {
                    const word = location.words.find(word => word.index === anchor.wordIndex);
                    return word ? Math.round(word.position * 4) / 4 : null;
                }) });
        });
        let pattern = patterns.find(item => item.kind === section.kind && item.rows.length === rows.length
            && rows.some((row, index) => row && row === item.rows[index])
            && rows.every((row, index) => !row || !item.rows[index] || row === item.rows[index]));
        if (!pattern) {
            pattern = { id: `pattern-${patterns.length + 1}`, kind: section.kind, rows, sectionCodes: [] };
            patterns.push(pattern);
        } else pattern.rows = pattern.rows.map((row, index) => row || rows[index]);
        pattern.sectionCodes.push(section.code);
        sourceFamilies.set(section.code, pattern.id);
    }
    const families = patterns.map(({ id, sectionCodes }) => ({ id, sectionCodes }));
    const familyOf = section => sourceFamilies.get(section.code);
    const suggestions = new Map();
    const candidates = [];
    const rowStats = { high: 0, medium: 0, low: 0 };
    for (const target of sections) {
        const missing = target.rows.filter(row => !byLine.has(row.index));
        if (!missing.length || !sourceSections.length) continue;
        const targetRows = canonicalRows(target);
        const ranked = [];
        for (const template of sourceSections.filter(section => section.kind === target.kind)) {
            let rows = canonicalRows(template);
            const trim = rows.length === targetRows.length + 1
                && normalize(rows.at(-1).text).split(' ').length >= 2
                && rows.slice(0, -1).some(row => normalize(row.text).endsWith(normalize(rows.at(-1).text)));
            if (trim) rows = rows.slice(0, -1);
            const duplicate = rows.length !== template.rows.length || targetRows.length !== target.rows.length;
            const mappings = new Map();
            let score = trim ? 0.2 : 0;
            if (rows.length === targetRows.length && template !== target) {
                for (const [index, row] of targetRows.entries()) {
                    const from = rows[index];
                    if (!usable(from)) continue;
                    const mapping = mapRow(from, row, byLine.get(from.index), runtime, measureWidth);
                    if (!mapping) continue;
                    mappings.set(normalize(row.text), { ...mapping, sourceRow: from });
                    score += mapping.score / targetRows.length;
                }
            }
            // Exact repeated lyric rows can safely reuse same-type chorded rows even in unequal sections.
            for (const row of missing) {
                const identical = template.rows.find(from => usable(from) && normalize(from.text) === normalize(row.text));
                if (!identical) continue;
                const mapping = mapRow(identical, row, byLine.get(identical.index), runtime, measureWidth);
                if (mapping) mappings.set(normalize(row.text), { ...mapping, sourceRow: identical, exact: true });
            }
            if (!mappings.size) continue;
            const covered = missing.filter(row => mappings.has(normalize(row.text))).length;
            score += (missing.length - covered) / missing.length * 0.5;
            const evidenceRows = targetRows.filter(row => byLine.has(row.index));
            let evidenceConflict = false;
            let agreements = 0;
            if (rows.length === targetRows.length) {
                for (const row of evidenceRows) {
                    const from = rows[targetRows.indexOf(row)];
                    if (!usable(from)) continue;
                    if (JSON.stringify(symbolSequence(from)) === JSON.stringify(symbolSequence(row))) agreements++;
                    else evidenceConflict = true;
                }
            }
            if (evidenceConflict) continue;
            score -= agreements * 0.15;
            ranked.push({ template, rows, mappings, score, trim, duplicate, family: familyOf(template) });
        }
        ranked.sort((a, b) => a.score - b.score
            || sections.indexOf(a.template) - sections.indexOf(b.template));
        const selectedRows = [];
        for (const row of missing) {
            const choices = ranked.flatMap(choice => {
                const basis = choice.mappings.get(normalize(row.text));
                if (!basis) return [];
                const mapped = mapRow(basis.sourceRow, row, byLine.get(basis.sourceRow.index), runtime, measureWidth);
                return mapped ? [{ ...choice, mapping: { ...basis, ...mapped } }] : [];
            });
            const familyChoices = choices.filter(choice => choice.family === ranked[0]?.family
                || choice.mapping.exact);
            const best = familyChoices[0];
            const mapping = best?.mapping;
            const progression = mapping ? JSON.stringify(mapping.anchors.map(anchor => [anchor.chord, anchor.wordIndex])) : '';
            const conflicting = best && choices.some(choice => choice !== best
                && choice.score - best.score < 0.12
                && JSON.stringify(choice.mapping.anchors.map(anchor => [anchor.chord, anchor.wordIndex])) !== progression);
            const canPlace = !!mapping && !conflicting;
            const high = canPlace && mapping.confidence === 'high' && !best.trim && !best.duplicate
                && (mapping.exact || (best.template.explicitVerse && target.explicitVerse))
                && choices.every(choice => choice === best || choice.family === best.family || choice.score - best.score >= 0.25);
            const confidence = !canPlace ? 'low' : high ? 'high' : 'medium';
            const reason = conflicting ? 'Equally plausible source patterns disagree; review the melody before placement.'
                : !mapping ? ranked[0]
                    ? `The best matching ${ranked[0].template.label} family has no confirmed compatible row here; review required.`
                    : sourceSections.some(section => section.kind === target.kind)
                        ? 'No compatible source row/section structure; review required.'
                        : 'No confirmed same-type source; unrelated section types are not transferred.'
                : `Best same-song match: ${best.template.label}; structural score ${best.score.toFixed(3)}`
                    + (best.trim ? '; repeated ending omitted from template mapping' : '')
                    + (best.duplicate ? '; repeated lyric rows matched' : '')
                    + '; original-language phrase widths and cadence boundaries mapped; review positions.';
            rowStats[confidence]++;
            const sourceSection = best?.template || ranked[0]?.template
                || sourceSections.find(section => section.kind === target.kind) || sourceSections[0];
            const propagation = {
                songId: song.id, sourceSectionCode: sourceSection.code, sourceSectionLabel: sourceSection.label,
                sourceLineIndex: mapping?.sourceRow.index ?? sourceSection.rows.find(usable).index,
                targetSectionCode: target.code, confidence, status: canPlace ? 'suggested' : 'needs-review', reason,
                patternFamily: best?.family || familyOf(sourceSection),
                alternatives: choices.map(choice => ({ sourceSectionCode: choice.template.code,
                    patternFamily: choice.family, score: Number(choice.score.toFixed(4)) }))
            };
            suggestions.set(row.index, {
                anchors: canPlace ? mapping.anchors : [], propagation
            });
            selectedRows.push({ targetLineIndex: row.index, sourceLineIndex: propagation.sourceLineIndex,
                sourceSectionCode: propagation.sourceSectionCode, confidence, reason });
        }
        const confidence = selectedRows.some(row => row.confidence === 'high') ? 'high'
            : selectedRows.some(row => row.confidence === 'medium') ? 'medium' : 'low';
        const sourceCodes = [...new Set(selectedRows.map(row => row.sourceSectionCode))];
        candidates.push({ sectionCode: target.code, sectionLabel: target.label,
            sourceSectionCode: sourceCodes.join('/'), sourceSectionLabel: sourceCodes.map(code =>
                sections.find(section => section.code === code).label).join(' / '),
            confidence, reason: [...new Set(selectedRows.map(row => row.reason))].join(' '),
            rows: missing.length, rowResults: selectedRows });
    }
    const lyricRows = sections.flatMap(section => section.rows);
    return { songId: song.id, source: sourceSections[0]?.code || null,
        families, candidates, suggestions, rowStats,
        coverage: { totalRows: lyricRows.length, chordedRows: lyricRows.filter(row => byLine.has(row.index)).length,
            usableRows: lyricRows.filter(usable).length, hasChordData: alignments.length > 0
                || song.lyrics.split('\n').some(isChordOnlyLine) } };
}

export function validPropagation(value, songId) {
    return value && value.songId === songId
        && typeof value.sourceSectionCode === 'string' && typeof value.sourceSectionLabel === 'string'
        && Number.isInteger(value.sourceLineIndex) && value.sourceLineIndex >= 0
        && typeof value.targetSectionCode === 'string' && typeof value.reason === 'string'
        && ['high', 'medium', 'low'].includes(value.confidence)
        && ['suggested', 'confirmed', 'needs-review'].includes(value.status)
        && (value.patternFamily === undefined || typeof value.patternFamily === 'string')
        && (value.alternatives === undefined || (Array.isArray(value.alternatives)
            && value.alternatives.every(item => typeof item.sourceSectionCode === 'string'
                && typeof item.patternFamily === 'string' && Number.isFinite(item.score))))
        && (value.confidence !== 'low' || value.status === 'needs-review');
}
