#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEVOTIONS_FILE = path.join(ROOT, 'devotions-2026.json');

const TARGET_RANGE = { start: '2026-03-01', end: '2026-04-30', label: 'target_mar_apr' };
const PRE_SAMPLE_RANGE = { start: '2026-02-15', end: '2026-02-28', label: 'sample_feb' };
const POST_SAMPLE_RANGE = { start: '2026-05-01', end: '2026-05-15', label: 'sample_may' };

const THRESHOLDS = {
    reflectionMinChars: 200,
    prayerMinChars: 90
};

function loadDevotions(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
        return parsed;
    }

    if (parsed && Array.isArray(parsed.devotions)) {
        return parsed.devotions;
    }

    throw new Error(`Unsupported devotion data shape in ${filePath}`);
}

function normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function endsWithEllipsis(text) {
    const trimmed = normalizeText(text);
    return trimmed.endsWith('...') || trimmed.endsWith('…');
}

function isLikelyFragment(text) {
    const normalized = normalizeText(text);
    if (!normalized) return true;
    const words = normalized.split(/\s+/).filter(Boolean).length;
    return words < 8;
}

function gradeField(text, minChars) {
    const normalized = normalizeText(text);
    const reasons = [];

    if (!normalized) reasons.push('missing');
    if (normalized.length < minChars) reasons.push(`short(<${minChars})`);
    if (endsWithEllipsis(normalized)) reasons.push('ellipsis_ending');
    if (isLikelyFragment(normalized) && normalized.length < minChars) {
        reasons.push('likely_fragment');
    }

    return {
        ok: reasons.length === 0,
        length: normalized.length,
        reasons
    };
}

function listDatesInclusive(start, end) {
    const dates = [];
    const cursor = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);

    while (cursor <= endDate) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
}

function analyzeRange(devotions, range) {
    const byDate = new Map();
    for (const entry of devotions) {
        if (entry && typeof entry === 'object' && entry.date) {
            byDate.set(entry.date, entry);
        }
    }

    const expectedDates = listDatesInclusive(range.start, range.end);
    const missingDateEntries = [];
    const rows = [];

    for (const date of expectedDates) {
        const entry = byDate.get(date);
        if (!entry) {
            missingDateEntries.push(date);
            continue;
        }

        const reflectionCheck = gradeField(entry.reflection, THRESHOLDS.reflectionMinChars);
        const prayerCheck = gradeField(entry.prayer, THRESHOLDS.prayerMinChars);

        rows.push({
            date,
            reflection: reflectionCheck,
            prayer: prayerCheck,
            reflectionBnLength: normalizeText(entry.reflectionBn).length,
            prayerBnLength: normalizeText(entry.prayerBn).length
        });
    }

    const reflectionFailDates = rows.filter((r) => !r.reflection.ok).map((r) => r.date);
    const prayerFailDates = rows.filter((r) => !r.prayer.ok).map((r) => r.date);
    const anyFailDates = rows.filter((r) => !r.reflection.ok || !r.prayer.ok).map((r) => r.date);

    return {
        range,
        thresholds: THRESHOLDS,
        expectedDates: expectedDates.length,
        foundEntries: rows.length,
        missingDateEntries,
        reflectionFailCount: reflectionFailDates.length,
        prayerFailCount: prayerFailDates.length,
        anyFailCount: anyFailDates.length,
        reflectionFailDates,
        prayerFailDates,
        affectedDates: anyFailDates,
        rows
    };
}

function main() {
    const devotions = loadDevotions(DEVOTIONS_FILE);

    const target = analyzeRange(devotions, TARGET_RANGE);
    const febSample = analyzeRange(devotions, PRE_SAMPLE_RANGE);
    const maySample = analyzeRange(devotions, POST_SAMPLE_RANGE);

    const output = {
        sourceFile: path.relative(ROOT, DEVOTIONS_FILE),
        totalDevotions: devotions.length,
        generatedAt: new Date().toISOString(),
        checks: {
            target,
            febSample,
            maySample
        }
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
