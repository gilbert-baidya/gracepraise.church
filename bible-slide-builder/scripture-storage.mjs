import { getScriptureTheme } from './scripture-themes.mjs';
import { LANGUAGE_MODES } from './scripture-layout.mjs';

export const STORAGE_KEY = 'gpbc.bible-slide-builder.sets.v1';
export const STORAGE_SCHEMA_VERSION = 1;

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function slug(value) {
    return String(value || 'scripture-set')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/gu, '')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .slice(0, 64) || 'scripture-set';
}

export function createScriptureSetId(date, name) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(date || ''))) throw new Error('A valid service date is required.');
    return `${date}-${slug(name)}`;
}

function emptyStore() {
    return { schemaVersion: STORAGE_SCHEMA_VERSION, sets: {} };
}

function validateSegment(segment) {
    return segment && Number.isInteger(segment.verseNumber) && segment.verseNumber > 0
        && Number.isInteger(segment.continuationIndex) && segment.continuationIndex >= 0
        && typeof segment.bnText === 'string' && typeof segment.enText === 'string'
        && typeof segment.bnSourceNodeId === 'string' && typeof segment.enSourceNodeId === 'string';
}

function validateSlide(slide) {
    return slide && typeof slide.id === 'string'
        && ['scripture', 'opening', 'closing', 'blank'].includes(slide.kind)
        && typeof slide.passageId === 'string'
        && typeof slide.themeId === 'string'
        && Boolean(getScriptureTheme(slide.themeId))
        && Object.hasOwn(LANGUAGE_MODES, slide.languageMode)
        && Array.isArray(slide.segments) && slide.segments.every(validateSegment);
}

function validatePassageRequest(passage) {
    return passage && typeof passage.id === 'string'
        && Number.isInteger(passage.bookNumber) && passage.bookNumber > 0
        && Number.isInteger(passage.chapter) && passage.chapter > 0
        && Number.isInteger(passage.startVerse) && passage.startVerse > 0
        && Number.isInteger(passage.endVerse) && passage.endVerse >= passage.startVerse
        && (passage.focusVerse === null || passage.focusVerse === undefined
            || (Number.isInteger(passage.focusVerse) && passage.focusVerse >= passage.startVerse && passage.focusVerse <= passage.endVerse));
}

export function validateScriptureSet(set) {
    if (!set || typeof set !== 'object' || Array.isArray(set)
        || set.schemaVersion !== STORAGE_SCHEMA_VERSION
        || typeof set.id !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/u.test(set.date)
        || typeof set.name !== 'string' || !set.name.trim()
        || typeof set.programType !== 'string'
        || !Object.hasOwn(LANGUAGE_MODES, set.languageMode)
        || !getScriptureTheme(set.themeId)
        || !Array.isArray(set.passages) || !set.passages.every(validatePassageRequest)
        || !Array.isArray(set.slides) || !set.slides.every(validateSlide)
        || typeof set.settings !== 'object' || !set.settings
        || typeof set.sourceLock !== 'object' || !set.sourceLock) {
        throw new Error('Invalid Bible Slide Builder set. Existing browser data was not changed.');
    }
    return set;
}

function readStore(storage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== STORAGE_SCHEMA_VERSION || !parsed.sets
        || typeof parsed.sets !== 'object' || Array.isArray(parsed.sets)) {
        throw new Error('Unsupported or corrupt Bible Slide Builder storage. Existing data was not changed.');
    }
    for (const [id, record] of Object.entries(parsed.sets)) {
        if (!record || !Array.isArray(record.revisions) || !record.current) {
            throw new Error('Invalid saved-set history. Existing data was not changed.');
        }
        validateScriptureSet(record.current);
        record.revisions.forEach(validateScriptureSet);
        if (record.current.id !== id) throw new Error('Saved-set identity mismatch. Existing data was not changed.');
    }
    return parsed;
}

export function saveScriptureSet(set, storage = globalThis.localStorage) {
    validateScriptureSet(set);
    const store = readStore(storage);
    const existing = store.sets[set.id];
    const now = new Date().toISOString();
    const revision = (existing?.current?.revision || 0) + 1;
    const snapshot = clone({ ...set, revision, updatedAt: now });
    const revisions = existing ? [...existing.revisions, clone(existing.current)] : [];
    store.sets[set.id] = { current: snapshot, revisions };
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return clone(snapshot);
}

export function loadScriptureSet(id, storage = globalThis.localStorage) {
    const record = readStore(storage).sets[id];
    return record ? clone(record.current) : null;
}

export function listScriptureSets(storage = globalThis.localStorage) {
    return Object.values(readStore(storage).sets)
        .map(record => clone(record.current))
        .sort((left, right) => String(right.date).localeCompare(String(left.date))
            || String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
}

export function listScriptureSetRevisions(id, storage = globalThis.localStorage) {
    const record = readStore(storage).sets[id];
    return record ? clone([...record.revisions, record.current]) : [];
}
