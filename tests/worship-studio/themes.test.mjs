import assert from 'node:assert/strict';
import test from 'node:test';
import { THEMES, getTheme, recommendTheme } from '../../worship-studio/themes.mjs';
import { exportFilename, EXPORT_RESOLUTION } from '../../worship-studio/slide-export.mjs';
import { saveSet, loadSet } from '../../worship-studio/studio-storage.mjs';

test('thirteen centralized church themes are distinct immutable definitions with safe contrast', () => {
    assert.equal(THEMES.length, 13);
    assert.equal(new Set(THEMES.map(theme => theme.id)).size, 13);
    assert.equal(new Set(THEMES.map(theme => `${theme.base}/${theme.depth}`)).size, 13);
    const luminance = hex => {
        const channels = hex.slice(1).match(/../gu).map(value => parseInt(value, 16) / 255)
            .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    for (const theme of THEMES) {
        assert.ok(Object.isFrozen(theme));
        for (const color of [theme.base, theme.depth]) {
            assert.ok((luminance(theme.lyrics) + 0.05) / (luminance(color) + 0.05) >= 7, theme.id);
            assert.ok((luminance(theme.chord) + 0.05) / (luminance(color) + 0.05) >= 4.5, theme.id);
        }
    }
    assert.throws(() => getTheme('unknown'), /Unknown church theme/);
});

test('event-name recommendations never infer theology from a date or mutate selection', () => {
    assert.equal(recommendTheme('Good Friday service').id, 'good-friday');
    assert.equal(recommendTheme('Holy Communion').id, 'communion');
    assert.equal(recommendTheme('Christmas worship').id, 'christmas');
    assert.equal(recommendTheme('2026-12-25').id, 'sunday');
});

test('legacy sets remain readable and theme/section settings persist independently of slides', () => {
    const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
    const set = {
        id: 'sunday-2026-10-11', date: '2026-10-11', songEntries: [{ songId: 117, sectionOrder: ['V1'] }],
        slides: [{ id: 'manual-1', songId: 117, lines: ['আমার হাতে লেখা'], manual: true }]
    };
    saveSet(set, storage);
    assert.deepEqual(loadSet(set.id, storage).slides, set.slides);
    saveSet({ ...set, themeId: 'communion', showSectionLabels: false }, storage);
    const restored = loadSet(set.id, storage);
    assert.equal(restored.themeId, 'communion');
    assert.equal(restored.showSectionLabels, false);
    assert.deepEqual(restored.slides, set.slides);
    assert.throws(() => saveSet({ ...set, themeId: 'invalid' }, storage), /Unknown church theme/);
    assert.throws(() => saveSet({ ...set, showSectionLabels: 'no' }, storage), /Invalid saved section-label/);
});

test('export names use service date and selected version; PNG is true widescreen presentation resolution', () => {
    assert.equal(exportFilename('2026-10-11', 'phoneticChords', 'pptx'), 'GPBC_2026-10-11_Phonetic-Chords.pptx');
    assert.equal(exportFilename('2026-10-11', 'musician', 'pdf'), 'GPBC_2026-10-11_Musician.pdf');
    assert.equal(EXPORT_RESOLUTION.width / EXPORT_RESOLUTION.height, 16 / 9);
    assert.throws(() => exportFilename('', 'musician', 'pptx'), /valid service date/);
});
