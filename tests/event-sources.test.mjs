import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await fs.readFile(new URL('../events.js', import.meta.url), 'utf8');
const sheets = await fs.readFile(new URL('../googlesheets.js', import.meta.url), 'utf8');
const holiday = { name: 'Pre-Christmas Celebration Service', date: '2026-12-13', category: 'gpbc' };
const custom = { name: 'Cached fellowship', date: '2026-12-15', category: 'gpbc' };

function storage(records = [], failWrites = false) {
    const values = new Map([['gpbcEventsVersion', '3.1'], ['gpbcEvents', JSON.stringify(records)]]);
    return {
        values,
        getItem: key => values.get(key) || null,
        setItem(key, value) {
            if (failWrites) throw new Error('Storage write blocked');
            values.set(key, value);
        },
        removeItem: key => values.delete(key)
    };
}

function load(localStorage = storage(), fetch = async () => ({ ok: false, status: 503 })) {
    const context = {
        localStorage, fetch, AbortController, setTimeout, clearTimeout,
        USE_GOOGLE_SHEETS: true, GOOGLE_SHEETS_URL: 'https://example.test/sheets',
        CODE_OWNER: 'test', console: { error() {}, warn() {} }
    };
    runInNewContext(source + '\n' + sheets, context);
    return context;
}

function records(context) {
    return JSON.parse(runInNewContext("JSON.stringify(events.filter(event => event.category === 'gpbc'))", context));
}

test('invalid saved data warns without exposing its contents', () => {
    const context = load();
    const warnings = [];
    context.console.warn = (...args) => warnings.push(args);
    context.localStorage.values.set('gpbcEvents', '{"private-person-email":');
    context.loadCustomEvents();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0][0], /Unable to load saved church events/);
    assert.ok(!JSON.stringify(warnings).includes('private-person-email'));
});

test('offline defaults remain available with empty or blocked storage', () => {
    const blocked = () => { throw new Error('Storage blocked'); };
    for (const localStorage of [storage(), { getItem: blocked, setItem: blocked, removeItem: blocked }]) {
        const context = load(localStorage);
        assert.ok(records(context).some(event => event.name === holiday.name && event.date === '2026-12-20'));
        assert.doesNotThrow(() => context.saveCustomEvents());
    }
});

test('cached events load and normalize without requiring a storage write', async () => {
    const localStorage = storage([holiday, custom], true);
    const context = load(localStorage);
    assert.equal(await context.loadEventsFromGoogleSheets(), false);
    context.loadCustomEvents();
    const cached = records(context);
    assert.ok(cached.some(event => event.name === custom.name));
    assert.ok(cached.some(event => event.name === holiday.name &&
        event.date === '2026-12-20' && event.sourceDate === '2026-12-13' && event.eventTime === '5:00 PM'));
    assert.deepEqual(JSON.parse(localStorage.getItem('gpbcEvents')), [holiday, custom]);
    assert.deepEqual([...localStorage.values.keys()], ['gpbcEventsVersion', 'gpbcEvents']);
});

test('malformed cached data leaves offline defaults intact', () => {
    for (const value of ['{', 'null', '{}']) {
        const localStorage = storage();
        localStorage.values.set('gpbcEvents', value);
        assert.ok(records(load(localStorage)).some(event => event.name === holiday.name));
    }
});

for (const rows of [[], [custom]]) {
    test('successful Sheets load replaces all GPBC defaults and cached records: ' + rows.length + ' rows', async () => {
        const context = load(storage([holiday]), async () => ({ ok: true, json: async () => ({ events: rows }) }));
        assert.equal(await context.loadEventsFromGoogleSheets(), true);
        assert.deepEqual(records(context).map(({ name, date }) => ({ name, date })),
            rows.map(({ name, date }) => ({ name, date })));
        assert.ok(runInNewContext("events.some(event => event.category === 'christian')", context));
    });
}

test('normalization matches source date and name, leaving other identities unchanged', () => {
    const context = load();
    const unrelated = { ...holiday, date: '2026-12-14', eventTime: '2:00 PM' };
    assert.equal(context.normalizeHolidaySchedule(unrelated), unrelated);
    const display = context.normalizeHolidaySchedule(holiday);
    assert.equal(context.normalizeHolidaySchedule(display).sourceDate, '2026-12-13');
    const differentSource = { ...display, sourceDate: '2026-12-14' };
    assert.equal(context.normalizeHolidaySchedule(differentSource), differentSource);
});

test('delete and save send the retained source date rather than the displayed date', async () => {
    const requests = [];
    const context = load(storage(), async (_url, options) => {
        requests.push(JSON.parse(options.body));
        return { json: async () => ({ success: true }) };
    });
    const display = context.normalizeHolidaySchedule(holiday);
    assert.equal(await context.deleteEventFromGoogleSheets(display), true);
    assert.equal(await context.saveEventToGoogleSheets(display), true);
    assert.deepEqual(requests.map(request => [request.action, request.event.date]),
        [['deleteEvent', '2026-12-13'], ['addEvent', '2026-12-13']]);
});

test('clients with shared stale caches follow remote deletions and recreation without writing local state', async () => {
    let rows = [holiday];
    const localStorage = storage([holiday, custom], true);
    const fetch = async (_url, options) => {
        const request = JSON.parse(options.body);
        if (request.action === 'getEvents') return { ok: true, json: async () => ({ events: rows }) };
        rows = request.action === 'deleteEvent' ? [] : [request.event];
        return { json: async () => ({ success: true }) };
    };
    const clients = [load(localStorage, fetch), load(localStorage, fetch)];
    for (const client of clients) assert.equal(await client.loadEventsFromGoogleSheets(), true);
    await clients[0].deleteEventFromGoogleSheets(records(clients[0])[0]);
    for (const client of clients) {
        assert.equal(await client.loadEventsFromGoogleSheets(), true);
        assert.deepEqual(records(client), []);
    }
    await clients[1].saveEventToGoogleSheets({ ...holiday, date: '2026-12-20' });
    for (const client of clients) {
        assert.equal(await client.loadEventsFromGoogleSheets(), true);
        assert.equal(records(client)[0].name, holiday.name);
    }
    assert.deepEqual(JSON.parse(localStorage.getItem('gpbcEvents')), [holiday, custom]);
});
