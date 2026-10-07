import { MODES, KEYS as PRESENTATION_KEYS, validChordedLayout } from './presentation-modes.mjs?studio-startup=11';
import { getTheme } from './themes.mjs?studio-startup=11';
import { validPropagation } from './chord-propagation.mjs?studio-startup=11';

export const STORAGE_KEY = 'gpbc.worship-song-studio.sunday-sets.v1';
const MODE_NAMES = Object.keys(MODES);
const KEYS = ['', ...PRESENTATION_KEYS];

function validSlide(slide) {
    return slide && typeof slide.id === 'string' && Number.isInteger(slide.songId)
        && Array.isArray(slide.lines) && slide.lines.every(line => typeof line === 'string')
        && (slide.chordLayout === undefined || validChordedLayout(slide.chordLayout))
        && (slide.lineDetails === undefined || (Array.isArray(slide.lineDetails)
            && slide.lineDetails.length === slide.lines.length && slide.lineDetails.every(detail =>
                detail && Array.isArray(detail.anchors) && detail.anchors.every(anchor =>
                    typeof anchor.chord === 'string' && Number.isInteger(anchor.wordIndex) && anchor.wordIndex >= 0
                    && (anchor.sourceWordIndex === undefined || (Number.isInteger(anchor.sourceWordIndex) && anchor.sourceWordIndex >= 0))
                    && (anchor.relativePosition === undefined || (Number.isFinite(anchor.relativePosition)
                        && anchor.relativePosition >= 0 && anchor.relativePosition <= 1)))
                && Array.isArray(detail.warnings) && detail.warnings.every(note => typeof note === 'string')
                && (detail.sourceWordOffset === undefined || (Number.isInteger(detail.sourceWordOffset) && detail.sourceWordOffset >= 0))
                && typeof detail.progression === 'string' && typeof detail.alignmentValid === 'boolean'
                && (detail.propagation === undefined || (validPropagation(detail.propagation, slide.songId)
                    && (detail.propagation.confidence !== 'low' || detail.anchors.length === 0))))))
        && (slide.reviewNotes === undefined || (Array.isArray(slide.reviewNotes)
            && slide.reviewNotes.every(note => typeof note === 'string')));
}

function readStore(storage) {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid saved-set storage. Existing data was not changed.');
    }
    for (const [id, set] of Object.entries(parsed)) {
        validateSet(set);
        if (id !== set.id) throw new Error('Invalid saved-set ID. Existing data was not changed.');
    }
    return parsed;
}

function validateSet(set) {
    if (!set || typeof set.id !== 'string' || typeof set.date !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/u.test(set.date) || set.id !== createSetId(set.date)
        || !Array.isArray(set.songEntries) || !Array.isArray(set.slides)
        || !set.songEntries.every(entry => entry && Number.isInteger(entry.songId)
            && Array.isArray(entry.sectionOrder) && entry.sectionOrder.every(code => typeof code === 'string'))
        || !set.slides.every(validSlide)) {
        throw new Error('Invalid saved Sunday set. Existing data was not changed.');
    }
    if (set.themeId !== undefined) getTheme(set.themeId);
    if (set.showSectionLabels !== undefined && typeof set.showSectionLabels !== 'boolean') {
        throw new Error('Invalid saved section-label setting. Existing data was not changed.');
    }
    if (set.modeSlides !== undefined && (!set.modeSlides || typeof set.modeSlides !== 'object'
        || Array.isArray(set.modeSlides) || Object.entries(set.modeSlides).some(([mode, slides]) =>
            !MODE_NAMES.includes(mode) || !Array.isArray(slides) || !slides.every(slide => validSlide(slide)
                && set.songEntries.some(entry => entry.songId === slide.songId))))) {
        throw new Error('Invalid saved presentation modes. Existing data was not changed.');
    }
    if (set.activeMode !== undefined && !MODE_NAMES.includes(set.activeMode)) {
        throw new Error('Invalid saved presentation mode. Existing data was not changed.');
    }
    if (set.modeSettings !== undefined && (!set.modeSettings || typeof set.modeSettings !== 'object'
        || Array.isArray(set.modeSettings) || Object.entries(set.modeSettings).some(([mode, settings]) =>
            !MODE_NAMES.includes(mode) || !settings || typeof settings !== 'object' || Array.isArray(settings)
            || Object.entries(settings).some(([songId, value]) =>
                !set.songEntries.some(entry => entry.songId === Number(songId)) || !value
                || !KEYS.includes(value.key) || !Number.isInteger(value.capo) || value.capo < 0 || value.capo > 12)))) {
        throw new Error('Invalid saved key/capo settings. Existing data was not changed.');
    }
}

export function listSavedSets(storage = window.localStorage) {
    return Object.values(readStore(storage))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function saveSet(set, storage = window.localStorage) {
    validateSet(set);
    const store = readStore(storage);
    const snapshot = JSON.parse(JSON.stringify({
        ...set,
        schemaVersion: set.modeSlides ? 2 : 1,
        updatedAt: new Date().toISOString()
    }));
    store[snapshot.id] = snapshot;
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return snapshot;
}

export function loadSet(id, storage = window.localStorage) {
    const store = readStore(storage);
    const value = Object.hasOwn(store, id) ? store[id] : null;
    return value ? JSON.parse(JSON.stringify(value)) : null;
}

export function createSetId(date) {
    return `sunday-${String(date || '').replace(/[^0-9-]/gu, '')}`;
}
