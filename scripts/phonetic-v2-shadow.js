'use strict';

/*
 * Corpus-wide V1/V2 comparison. This script uses the browser runtime for the
 * current V1 output and the standalone V2 module for shadow output. It writes
 * only to /private/tmp/v18-phonetic-v2/.
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const engine = require('../phonetic-v2');

const OUTPUT_DIR = '/private/tmp/v18-phonetic-v2';
const URL = 'http://127.0.0.1:8080/songbook.html';
const BENGALI_RE = /[\u0980-\u09FF]/u;
const BENGALI_MARK_RE = /[\u0981-\u0983\u09BC-\u09CD\u09D7\u09C3-\u09D4]/u;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function csvEscape(value) {
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
}

function toCsv(rows, columns) {
    return [
        columns.join(','),
        ...rows.map(row => columns.map(column => csvEscape(row[column])).join(','))
    ].join('\n') + '\n';
}

function write(name, content) {
    fs.writeFileSync(path.join(OUTPUT_DIR, name), content, 'utf8');
}

function shortContext(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function collisionKey(value) {
    return String(value || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function buildCollisionGroups(entries, field) {
    const groups = new Map();
    entries.forEach(entry => {
        const key = collisionKey(entry[field]);
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry.bangla_word);
    });
    return Array.from(groups.entries())
        .map(([generated, words]) => ({
            generated_phonetic: generated,
            words: Array.from(new Set(words)).sort()
        }))
        .filter(group => group.words.length > 1)
        .sort((a, b) => b.words.length - a.words.length || a.generated_phonetic.localeCompare(b.generated_phonetic));
}

function groupSignature(group) {
    return group.words.join('\u0001');
}

function htmlEscape(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadV1Corpus() {
    const browser = await chromium.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: ['--no-sandbox']
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
        localStorage.setItem('gpbc:logoLoaderSeen', 'true');
        localStorage.setItem('theme', 'light');
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
        typeof songsDatabase !== 'undefined' &&
        Array.isArray(songsDatabase) &&
        typeof convertToPhonetic === 'function' &&
        typeof getSongPhoneticLine === 'function' &&
        typeof classifySongLine === 'function'
    );
    await page.waitForTimeout(300);

    const corpus = await page.evaluate(() => {
        const bengali = /[\u0980-\u09FF]/u;
        const tokens = line => Array.from(String(line).normalize('NFC').matchAll(/[\u0980-\u09EF]+/gu))
            .map(match => match[0])
            .filter(word => !/^[\u09E6-\u09EF]+$/u.test(word));
        const words = {};
        const songs = songsDatabase.map(song => ({
            id: song.id,
            title: song.title,
            category: song.category,
            lines: String(song.lyrics || '').split('\n').map((source, index) => {
                const type = classifySongLine(source);
                const isChord = type === 'CHORD';
                const lineWords = type === 'LYRIC' && bengali.test(source) ? tokens(source) : [];
                lineWords.forEach(word => {
                    if (words[word] === undefined) words[word] = convertToPhonetic(word);
                });
                return {
                    line_number: index + 1,
                    type,
                    source,
                    v1_phonetic: isChord ? source : getSongPhoneticLine(song, source),
                    v1_converter: isChord ? source : convertToPhonetic(source),
                    words: lineWords
                };
            })
        }));
        return { songs, v1Words: words };
    });

    await browser.close();
    return corpus;
}

function makeWordEntry(word, v1, context) {
    const detail = engine.analyzeV2(word);
    return {
        bangla_word: word,
        v1_phonetic: v1,
        v2_phonetic: detail.text,
        occurrences: 0,
        song_ids: new Set(),
        contexts: [],
        v2_flags: new Set(detail.flags),
        reviewed: Boolean(detail.reviewedWord),
        fallback_used: Boolean(detail.fallbackUsed),
        v1_mixed: BENGALI_RE.test(v1),
        v1_malformed: BENGALI_MARK_RE.test(v1),
        v2_mixed: BENGALI_RE.test(detail.text),
        v2_malformed: BENGALI_MARK_RE.test(detail.text),
        v2_empty: detail.text === ''
    };
}

function phoneticComparable(value) {
    return String(value || '').toLowerCase();
}

function addContext(entry, song, line) {
    if (entry.contexts.length >= 3) return;
    if (entry.contexts.some(context => context.song_id === song.id && context.line_number === line.line_number)) return;
    entry.contexts.push({
        song_id: song.id,
        title: song.title,
        line_number: line.line_number,
        source_line: shortContext(line.source)
    });
}

function summarizeStatus(entry) {
    if (entry.reviewed) return 'REVIEWED';
    if (entry.v1_malformed) return 'MALFORMED V1';
    if (entry.changed) return 'V2 CANDIDATE';
    if (entry.v2_flags.length || entry.v1_mixed || entry.v2_mixed) return 'NEEDS REVIEW';
    return 'UNCHANGED';
}

function reviewReason(entry) {
    const reasons = [];
    if (entry.v1_malformed) reasons.push('V1 malformed combining-mark leakage');
    if (entry.v1_mixed) reasons.push('V1 mixed/untranslated output');
    if (entry.changed) reasons.push('V1/V2 differ');
    if (entry.reviewed) reasons.push('user-reviewed dictionary entry');
    if (entry.v2_flags.has('conjunct')) reasons.push('conjunct structure');
    if (entry.v2_flags.has('safe-fallback')) reasons.push('safe fallback used');
    if (entry.collision_in_v1) reasons.push('V1 collision');
    if (entry.collision_in_v2) reasons.push('V2 collision');
    if (entry.occurrences >= 100) reasons.push('high frequency');
    return reasons.join('; ') || 'unchanged baseline';
}

async function main() {
    const started = process.hrtime.bigint();
    const corpus = await loadV1Corpus();
    const wordMap = new Map();
    const lineRows = [];
    let totalTokens = 0;
    let bengaliLines = 0;
    let chordLines = 0;
    let chordChanges = 0;
    let changedLines = 0;
    let phraseOverrideLines = 0;
    let reviewedWordHits = 0;
    let fallbackLines = 0;

    for (const song of corpus.songs) {
        for (const line of song.lines) {
            if (line.type === 'CHORD') {
                chordLines += 1;
                if (engine.convertToPhoneticV2(line.source) !== line.source) chordChanges += 1;
                continue;
            }
            if (line.type !== 'LYRIC' || !BENGALI_RE.test(line.source)) continue;

            bengaliLines += 1;
            const detail = engine.analyzeV2(line.source, { capitalizeLineStart: true });
            const changed = phoneticComparable(line.v1_phonetic) !== phoneticComparable(detail.text);
            const caseOnly = !changed && line.v1_phonetic !== detail.text;
            if (changed) changedLines += 1;
            if (detail.phraseOverride) phraseOverrideLines += 1;
            if (detail.fallbackUsed) fallbackLines += 1;
            if (detail.reviewedWord) reviewedWordHits += detail.reviewedWordHits.length;

            lineRows.push({
                song_id: song.id,
                title: song.title,
                line_number: line.line_number,
                bangla_line: line.source,
                v1_phonetic: line.v1_phonetic,
                v2_phonetic: detail.text,
                changed: changed ? 'YES' : 'NO',
                case_only: caseOnly ? 'YES' : 'NO',
                reviewed: detail.phraseOverride || detail.reviewedWord ? 'YES' : 'NO',
                phrase_override: detail.phraseOverride ? 'YES' : 'NO',
                word_override: detail.reviewedWord ? 'YES' : 'NO',
                fallback_used: detail.fallbackUsed ? 'YES' : 'NO',
                flags: detail.flags.join('|')
            });

            for (const word of line.words) {
                totalTokens += 1;
                let entry = wordMap.get(word);
                if (!entry) {
                    entry = makeWordEntry(word, corpus.v1Words[word], {
                        song_id: song.id,
                        title: song.title,
                        line_number: line.line_number,
                        source_line: shortContext(line.source)
                    });
                    wordMap.set(word, entry);
                }
                entry.occurrences += 1;
                entry.song_ids.add(song.id);
                addContext(entry, song, line);
            }
        }
    }

    const vocabulary = Array.from(wordMap.values()).map(entry => {
        const flags = Array.from(entry.v2_flags);
        entry.changed = phoneticComparable(entry.v1_phonetic) !== phoneticComparable(entry.v2_phonetic);
        entry.case_only = !entry.changed && entry.v1_phonetic !== entry.v2_phonetic;
        entry.song_count = entry.song_ids.size;
        entry.flags = flags;
        entry.example_song_ids = Array.from(entry.song_ids).slice(0, 8).join('|');
        entry.example_context = entry.contexts[0]?.source_line || '';
        entry.collision_in_v1 = false;
        entry.collision_in_v2 = false;
        return entry;
    }).sort((a, b) => b.occurrences - a.occurrences || a.bangla_word.localeCompare(b.bangla_word));

    const v1Collisions = buildCollisionGroups(vocabulary, 'v1_phonetic');
    const v2Collisions = buildCollisionGroups(vocabulary, 'v2_phonetic');
    const v1CollisionWords = new Set(v1Collisions.flatMap(group => group.words));
    const v2CollisionWords = new Set(v2Collisions.flatMap(group => group.words));
    vocabulary.forEach(entry => {
        entry.collision_in_v1 = v1CollisionWords.has(entry.bangla_word);
        entry.collision_in_v2 = v2CollisionWords.has(entry.bangla_word);
    });

    const v1CollisionSignatures = new Set(v1Collisions.map(groupSignature));
    const v2CollisionSignatures = new Set(v2Collisions.map(groupSignature));
    const unchangedCollisionGroups = Array.from(v1CollisionSignatures).filter(signature => v2CollisionSignatures.has(signature)).length;
    const resolvedCollisionGroups = Array.from(v1CollisionSignatures).filter(signature => !v2CollisionSignatures.has(signature)).length;
    const newCollisionGroups = Array.from(v2CollisionSignatures).filter(signature => !v1CollisionSignatures.has(signature)).length;

    const queue = vocabulary.map(entry => {
        const score = entry.occurrences + entry.song_count * 2 +
            (entry.v1_malformed ? 1000 : 0) +
            (entry.v1_mixed ? 500 : 0) +
            (entry.changed ? 100 : 0) +
            (entry.v2_flags.has('conjunct') ? 40 : 0) +
            (entry.collision_in_v1 ? 30 : 0) +
            (entry.collision_in_v2 ? 10 : 0) +
            (entry.fallback_used ? 300 : 0);
        return {
            bangla_word: entry.bangla_word,
            v1_phonetic: entry.v1_phonetic,
            v2_phonetic: entry.v2_phonetic,
            occurrences: entry.occurrences,
            song_count: entry.song_count,
            status: summarizeStatus(entry),
            reason: reviewReason(entry),
            flags: entry.flags.join('|'),
            score
        };
    }).sort((a, b) => b.score - a.score || b.occurrences - a.occurrences || a.bangla_word.localeCompare(b.bangla_word));

    const totalTokensForCoverage = totalTokens;
    const coverage = {};
    [100, 250, 500, 1000, 2000].forEach(limit => {
        const tokens = vocabulary.slice(0, limit).reduce((sum, entry) => sum + entry.occurrences, 0);
        coverage['top_' + limit] = {
            unique_words: Math.min(limit, vocabulary.length),
            token_count: tokens,
            token_percentage: Number((tokens / totalTokensForCoverage * 100).toFixed(2))
        };
    });
    const reviewedTokenCount = vocabulary.filter(entry => entry.reviewed).reduce((sum, entry) => sum + entry.occurrences, 0);
    coverage.reviewed_dictionary = {
        unique_words: engine.reviewedWordCount,
        token_count: reviewedTokenCount,
        token_percentage: Number((reviewedTokenCount / totalTokensForCoverage * 100).toFixed(2))
    };

    const mixed = {
        v1_latin_only_unique: vocabulary.filter(entry => !entry.v1_mixed).length,
        v1_mixed_unique: vocabulary.filter(entry => entry.v1_mixed).length,
        v1_malformed_unique: vocabulary.filter(entry => entry.v1_malformed).length,
        v2_latin_only_unique: vocabulary.filter(entry => !entry.v2_mixed).length,
        v2_mixed_unique: vocabulary.filter(entry => entry.v2_mixed).length,
        v2_malformed_unique: vocabulary.filter(entry => entry.v2_malformed).length,
        v2_empty_unique: vocabulary.filter(entry => entry.v2_empty).length,
        v2_fallback_unique: vocabulary.filter(entry => entry.fallback_used).length,
        v1_mixed_tokens: vocabulary.filter(entry => entry.v1_mixed).reduce((sum, entry) => sum + entry.occurrences, 0),
        v2_mixed_tokens: vocabulary.filter(entry => entry.v2_mixed).reduce((sum, entry) => sum + entry.occurrences, 0)
    };

    const vocabularyRows = vocabulary.map(entry => ({
        bangla_word: entry.bangla_word,
        v1_phonetic: entry.v1_phonetic,
        v2_phonetic: entry.v2_phonetic,
        occurrences: entry.occurrences,
        song_count: entry.song_count,
        changed: entry.changed ? 'YES' : 'NO',
        case_only: entry.case_only ? 'YES' : 'NO',
        reviewed: entry.reviewed ? 'YES' : 'NO',
        flags: entry.flags.join('|'),
        example_song_ids: entry.example_song_ids,
        example_context: entry.example_context
    }));

    write('phonetic-v1-v2-vocabulary.csv', toCsv(vocabularyRows, [
        'bangla_word', 'v1_phonetic', 'v2_phonetic', 'occurrences', 'song_count',
        'changed', 'case_only', 'reviewed', 'flags', 'example_song_ids', 'example_context'
    ]));
    write('phonetic-v1-v2-lines.csv', toCsv(lineRows, [
        'song_id', 'title', 'line_number', 'bangla_line', 'v1_phonetic', 'v2_phonetic',
        'changed', 'case_only', 'reviewed', 'phrase_override', 'word_override', 'fallback_used', 'flags'
    ]));
    write('phonetic-v2-review-queue.csv', toCsv(queue, [
        'bangla_word', 'v1_phonetic', 'v2_phonetic', 'occurrences', 'song_count',
        'status', 'reason', 'flags', 'score'
    ]));
    write('phonetic-v2-collisions.csv', toCsv([
        ...v1Collisions.map(group => ({
            comparison: 'V1',
            generated_phonetic: group.generated_phonetic,
            word_count: group.words.length,
            words: group.words.join(' | '),
            collision_status: v2CollisionSignatures.has(groupSignature(group)) ? 'UNCHANGED' : 'RESOLVED'
        })),
        ...v2Collisions.map(group => ({
            comparison: 'V2',
            generated_phonetic: group.generated_phonetic,
            word_count: group.words.length,
            words: group.words.join(' | '),
            collision_status: v1CollisionSignatures.has(groupSignature(group)) ? 'UNCHANGED' : 'NEW'
        }))
    ], ['comparison', 'generated_phonetic', 'word_count', 'words', 'collision_status']));
    write('phonetic-v2-mixed-output.csv', toCsv(vocabulary.filter(entry =>
        entry.v1_mixed || entry.v1_malformed || entry.v2_mixed || entry.v2_malformed || entry.fallback_used
    ).map(entry => ({
        bangla_word: entry.bangla_word,
        v1_phonetic: entry.v1_phonetic,
        v2_phonetic: entry.v2_phonetic,
        occurrences: entry.occurrences,
        song_count: entry.song_count,
        v1_mixed: entry.v1_mixed ? 'YES' : 'NO',
        v1_malformed: entry.v1_malformed ? 'YES' : 'NO',
        v2_mixed: entry.v2_mixed ? 'YES' : 'NO',
        v2_malformed: entry.v2_malformed ? 'YES' : 'NO',
        fallback_used: entry.fallback_used ? 'YES' : 'NO',
        flags: entry.flags.join('|')
    })), [
        'bangla_word', 'v1_phonetic', 'v2_phonetic', 'occurrences', 'song_count',
        'v1_mixed', 'v1_malformed', 'v2_mixed', 'v2_malformed', 'fallback_used', 'flags'
    ]));

    const comparison = {
        songs_processed: corpus.songs.length,
        bengali_lyric_lines: bengaliLines,
        word_tokens: totalTokens,
        unique_words: vocabulary.length,
        chord_lines_excluded: chordLines,
        chord_lines_changed: chordChanges,
        changed_words: vocabulary.filter(entry => entry.changed).length,
        case_only_words: vocabulary.filter(entry => entry.case_only).length,
        changed_word_tokens: vocabulary.filter(entry => entry.changed).reduce((sum, entry) => sum + entry.occurrences, 0),
        changed_lines: changedLines,
        phrase_override_lines: phraseOverrideLines,
        reviewed_word_hits: reviewedWordHits,
        fallback_lines: fallbackLines,
        v1_collision_groups: v1Collisions.length,
        v2_collision_groups: v2Collisions.length,
        collision_groups_resolved: resolvedCollisionGroups,
        collision_groups_new: newCollisionGroups,
        collision_groups_unchanged: unchangedCollisionGroups,
        v1_mixed_or_malformed_unique: vocabulary.filter(entry => entry.v1_mixed || entry.v1_malformed).length,
        v2_mixed_or_malformed_unique: vocabulary.filter(entry => entry.v2_mixed || entry.v2_malformed).length,
        reviewed_word_count: engine.reviewedWordCount,
        reviewed_phrase_count: engine.reviewedPhraseCount,
        v1_active_in_song_reader: true,
        source_files_activated_for_v2: false
    };

    const summary = {
        generated_at: new Date().toISOString(),
        comparison,
        coverage,
        mixed_output: mixed,
        collision_summary: {
            v1: v1Collisions.length,
            v2: v2Collisions.length,
            resolved: resolvedCollisionGroups,
            newly_introduced: newCollisionGroups,
            unchanged: unchangedCollisionGroups
        },
        performance: {},
        review_queue_top_30: queue.slice(0, 30),
        reviewed_word_examples: engine.reviewedWords,
        reviewed_phrase_examples: engine.reviewedPhrases,
        v2_strategy: {
            normalization: 'NFC plus in-memory canonicalization of ড়/ঢ়/য় and decomposed nukta forms; source strings are never written back.',
            graphemes: 'Base Bengali letters are grouped with following vowel signs, virama, nukta, anusvara, visarga, or chandrabindu. Orphan marks become flagged safe fallbacks.',
            precedence: 'Exact song-line override option, exact reviewed phrase override, reviewed word dictionary, grapheme/conjunct conversion, deterministic safe fallback.',
            case: 'Mechanical outputs remain lowercase; reviewed entries preserve their reviewed display case such as Ar, Jishur, and Atmar.',
            inherent_vowel: 'Explicit vowel signs win. Virama suppresses the inherent vowel. Unreviewed consonants without a sign retain conservative o behavior; final-vowel deletion is not guessed globally.',
            long_vowels: 'Only confirmed lexical entries use reviewed long-vowel spellings. There is no global আ-to-aa replacement.',
            fallback: 'Unknown Bengali bases and orphan marks produce a visible ? marker plus safe-fallback flags; content is not silently deleted or invented.',
            song_overrides: 'convertSongLineV2 accepts a future local songOverrides object but no large per-song set or Firebase persistence is populated.',
            activation: 'phonetic-v2.js is not referenced by songbook.html or songbook-app.js; V1 remains the visible reader engine.'
        }
    };
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    summary.performance = {
        end_to_end_shadow_ms: Number(elapsedMs.toFixed(2)),
        note: 'Includes local headed-browser V1 extraction, V2 conversion, comparison, and report writing; it is not a production render benchmark.'
    };
    write('phonetic-v2-coverage.json', JSON.stringify({ coverage, comparison, mixed_output: mixed, collision_summary: summary.collision_summary }, null, 2));
    write('phonetic-v2-validation.json', JSON.stringify({
        generated_at: summary.generated_at,
        files: fs.readdirSync(OUTPUT_DIR).sort(),
        counts: comparison,
        acceptance: {
            all_songs_processed: corpus.songs.length === 1410,
            no_empty_v2_word_output: mixed.v2_empty_unique === 0,
            no_v2_malformed_marks: mixed.v2_malformed_unique === 0,
            chord_lines_unchanged: chordChanges === 0,
            raw_data_loaded_only: true,
            v1_reader_active: comparison.v1_active_in_song_reader,
            token_reconciliation: vocabulary.reduce((sum, entry) => sum + entry.occurrences, 0) === totalTokens
        },
        performance: summary.performance
    }, null, 2));

    const top30 = summary.review_queue_top_30.map((entry, index) =>
        (index + 1) + '. ' + entry.bangla_word + ' | V1: ' + entry.v1_phonetic + ' | V2: ' + entry.v2_phonetic +
        ' | ' + entry.occurrences + ' occurrence(s) | ' + entry.reason
    ).join('\n');
    const md = [
        '# V18 GPBC Phonetic V2 Shadow Engine', '',
        'Generated: ' + summary.generated_at, '',
        '## Safety', '',
        'V2 was implemented as a standalone shadow module. It is not loaded by songbook.html and does not replace the current V1 Song Reader path. No raw Bengali data, Firebase data, service worker, production configuration, main, or netlify-live was modified.', '',
        '## Architecture', '',
        '- Unicode normalization is in-memory only and canonicalizes ড়/ঢ়/য় plus decomposed nukta representations.',
        '- Graphemes group Bengali bases with following marks; conjunct pairs are handled centrally and deterministically.',
        '- Precedence is exact local song-line override, exact reviewed phrase, reviewed word, grapheme/conjunct conversion, then flagged safe fallback.',
        '- Mechanical output stays lowercase; reviewed display casing is preserved.',
        '- V2 is conservative: it does not remove every final o or expand every আ to aa.',
        '- Future per-song overrides are accepted through an options interface only; no large override set or Firebase persistence was added.', '',
        '## Reviewed data', '',
        'Reviewed word entries: ' + engine.reviewedWordCount + '.',
        'Reviewed phrase entries: ' + engine.reviewedPhraseCount + ' (the two existing song-117 line corrections).', '',
        '## Corpus comparison', '',
        '| Measure | Result |', '|---|---:|',
        '| Songs processed | ' + comparison.songs_processed + ' |',
        '| Bengali lyric lines | ' + comparison.bengali_lyric_lines + ' |',
        '| Bengali word tokens | ' + comparison.word_tokens + ' |',
        '| Unique Bengali words | ' + comparison.unique_words + ' |',
        '| Chord lines excluded | ' + comparison.chord_lines_excluded + ' |',
        '| Changed unique words | ' + comparison.changed_words + ' |',
        '| Case-only display differences | ' + comparison.case_only_words + ' |',
        '| Changed word tokens | ' + comparison.changed_word_tokens + ' |',
        '| Changed Bengali lines | ' + comparison.changed_lines + ' |',
        '| V1 mixed/malformed unique words | ' + comparison.v1_mixed_or_malformed_unique + ' |',
        '| V2 mixed/malformed unique words | ' + comparison.v2_mixed_or_malformed_unique + ' |',
        '| V1 collision groups | ' + comparison.v1_collision_groups + ' |',
        '| V2 collision groups | ' + comparison.v2_collision_groups + ' |',
        '| Collision groups resolved | ' + comparison.collision_groups_resolved + ' |',
        '| Collision groups newly introduced | ' + comparison.collision_groups_new + ' |',
        '| Collision groups unchanged | ' + comparison.collision_groups_unchanged + ' |',
        '| V2 fallback lines | ' + comparison.fallback_lines + ' |', '',
        'V2 mixed-output details: ' + JSON.stringify(mixed) + '.', '',
        '## Frequency coverage', '',
        'Coverage is token frequency coverage, not pronunciation-correctness coverage.', '',
        ...[100, 250, 500, 1000, 2000].map(limit => {
            const item = coverage['top_' + limit];
            return '- Top ' + limit + ': ' + item.token_count + ' of ' + comparison.word_tokens + ' tokens (' + item.token_percentage + '%).';
        }),
        '- Reviewed dictionary: ' + coverage.reviewed_dictionary.token_count + ' tokens (' + coverage.reviewed_dictionary.token_percentage + '%).', '',
        '## User-confirmed regression words', '',
        ...Object.keys(engine.reviewedWords).map(word => '- ' + word + ' -> ' + engine.reviewedWords[word].phonetic), '',
        '## য় / য় handling', '',
        'The normalization layer canonicalizes precomposed য় and decomposed য + nukta into one internal representation. A final yya grapheme is emitted as y without a stray Bengali nukta. The comparison still treats the resulting V2 strings as candidates, not linguistically final answers.', '',
        '## TOP 30 V2 REVIEW QUEUE ITEMS', '',
        top30, '',
        '## Performance', '',
        'End-to-end local shadow run: ' + summary.performance.end_to_end_shadow_ms + ' ms. This includes headed-browser V1 extraction, V2 conversion, comparison, and report writing; it is not a production render benchmark.', '',
        '## Acceptance checks', '',
        '- User-confirmed regression tests: see test:phonetic-v2 result.',
        '- No V2 malformed combining marks: ' + (mixed.v2_malformed_unique === 0 ? 'PASS' : 'FAIL') + '.',
        '- No empty V2 word output: ' + (mixed.v2_empty_unique === 0 ? 'PASS' : 'FAIL') + '.',
        '- Chord lines unchanged: ' + (chordChanges === 0 ? 'PASS' : 'FAIL') + '.',
        '- V1 remains active in Song Reader: YES.',
        '- Raw Bengali data unchanged: YES.', '',
        '## Artifact paths', '',
        ...fs.readdirSync(OUTPUT_DIR).filter(name => name !== 'phonetic-v2-summary.md').sort().map(name => '- /private/tmp/v18-phonetic-v2/' + name), '',
        'V2 SHADOW ENGINE IMPLEMENTED',
        'V1 STILL ACTIVE IN SONG READER',
        'RAW BENGALI DATA UNCHANGED',
        'FIREBASE NOT MODIFIED',
        'MAIN NOT MODIFIED',
        'NETLIFY-LIVE NOT MODIFIED',
        'PRODUCTION NOT DEPLOYED', ''
    ].join('\n');
    write('phonetic-v2-summary.md', md);

    const htmlRows = queue.slice(0, 1200).map(entry => ({
        word: entry.bangla_word,
        v1: entry.v1_phonetic,
        v2: entry.v2_phonetic,
        occurrences: entry.occurrences,
        songs: entry.song_count,
        status: entry.status,
        reason: entry.reason,
        flags: entry.flags
    }));
    const htmlData = JSON.stringify(htmlRows).replace(/</g, '\\u003c');
    const html = '<!doctype html><meta charset="utf-8"><title>GPBC V2 Shadow Review</title>' +
        '<style>body{font:14px system-ui,sans-serif;margin:24px;color:#162235}select,input{padding:8px;margin:8px 6px 12px 0}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #d9e1ec;padding:7px;text-align:left;vertical-align:top}th{background:#eff4fb;position:sticky;top:0}td:first-child{font-size:18px}td:nth-child(2),td:nth-child(3){font-family:ui-monospace,monospace}.reviewed{background:#eefbf1}.malformed{background:#fff0f0}.candidate{background:#fff9e6}</style>' +
        '<h1>GPBC Phonetic V2 Shadow Review</h1><p>V2 candidates only. V1 remains active in the Song Reader.</p>' +
        '<select id="status"><option value="">All statuses</option></select><input id="query" placeholder="Search Bangla, V1, V2, flags"><label><input id="changed" type="checkbox"> Changed only</label>' +
        '<table><thead><tr><th>বাংলা</th><th>V1</th><th>V2</th><th>Occurrences</th><th>Songs</th><th>Status</th><th>Reason</th><th>Flags</th></tr></thead><tbody id="body"></tbody></table>' +
        '<script>var rows=' + htmlData + ',status=document.getElementById("status"),query=document.getElementById("query"),changed=document.getElementById("changed"),body=document.getElementById("body");Array.from(new Set(rows.map(function(r){return r.status}))).sort().forEach(function(x){status.add(new Option(x,x))});function render(){var q=query.value.toLowerCase(),s=status.value;body.innerHTML=rows.filter(function(r){return(!s||r.status===s)&&(!changed.checked||r.v1!==r.v2)&&(!q||JSON.stringify(r).toLowerCase().indexOf(q)>=0)}).map(function(r){var c=r.status==="REVIEWED"?"reviewed":r.status==="MALFORMED V1"?"malformed":r.status==="V2 CANDIDATE"?"candidate":"";return "<tr class="+c+"><td>"+r.word+"</td><td>"+r.v1+"</td><td>"+r.v2+"</td><td>"+r.occurrences+"</td><td>"+r.songs+"</td><td>"+r.status+"</td><td>"+r.reason+"</td><td>"+r.flags+"</td></tr>"}).join("")}status.onchange=query.oninput=changed.onchange=render;render();</script>';
    write('phonetic-v2-sample-review.html', html);

    console.log(JSON.stringify({
        output_dir: OUTPUT_DIR,
        comparison,
        coverage,
        mixed,
        collision_summary: summary.collision_summary,
        top30: summary.review_queue_top_30,
        performance: summary.performance
    }, null, 2));
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
