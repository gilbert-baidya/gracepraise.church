import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await fs.readFile(new URL('../events.js', import.meta.url), 'utf8');
const name = 'Pre-Christmas Celebration Service';

function load(storage) {
    const context = { localStorage: storage };
    runInNewContext(source, context);
    return context;
}

test('empty storage retains offline holiday defaults', () => {
    const context = load({ getItem: () => null, setItem() {}, removeItem() {} });
    assert.ok(runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', context));
});

test('source date aliases share a stable deletion identity across reloads', () => {
    const saved = new Map();
    const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
    const context = load(storage);
    context.markEventDeleted({ name, date: '2026-12-20', sourceDate: '2026-12-13' });
    const reloaded = load(storage);
    assert.ok(reloaded.isEventDeleted({ name, date: '2026-12-20' }));
    assert.ok(!runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', reloaded));
    assert.ok(!reloaded.isEventDeleted({ name: 'Unrelated service', date: '2026-12-20' }));
});

test('blocked storage keeps defaults and preserves deletions in memory without throwing', () => {
    const blocked = () => { throw new Error('Storage blocked'); };
    const context = load({ getItem: blocked, setItem: blocked, removeItem: blocked });
    assert.ok(runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', context));
    context.markEventDeleted({ name, date: '2026-12-13' });
    context.loadCustomEvents();
    context.saveCustomEvents();
    assert.ok(!runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', context));
});

test('malformed marker storage does not suppress defaults', () => {
    for (const value of ['{', '{}', 'null']) {
        const context = load({ getItem: key => key === 'gpbcDeletedEvents' ? value : null, setItem() {}, removeItem() {} });
        assert.ok(runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', context));
    }
});

test('explicit recreation clears and persists only the matching marker', () => {
    const saved = new Map();
    const storage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
    const context = load(storage);
    context.markEventDeleted({ name, date: '2026-12-13' });
    context.markEventDeleted({ name: 'Other event', date: '2026-12-20' });
    context.clearEventDeletion({ name, date: '2026-12-20' });
    const reloaded = load(storage);
    assert.ok(!reloaded.isEventDeleted({ name, date: '2026-12-13' }));
    assert.ok(reloaded.isEventDeleted({ name: 'Other event', date: '2026-12-20' }));
    assert.ok(runInNewContext('events.some(event => event.name === ' + JSON.stringify(name) + ')', reloaded));
});

test('explicit recreation clears the in-memory marker when storage is blocked', () => {
    const blocked = () => { throw new Error('Storage blocked'); };
    const context = load({ getItem: blocked, setItem: blocked, removeItem: blocked });
    context.markEventDeleted({ name, date: '2026-12-13' });
    context.clearEventDeletion({ name, date: '2026-12-20' });
    context.loadCustomEvents();
    assert.ok(!context.isEventDeleted({ name, date: '2026-12-13' }));
});
