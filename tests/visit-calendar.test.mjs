import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await fs.readFile(new URL('../plan-visit.js', import.meta.url), 'utf8');
const context = {
    window: {}, TextEncoder,
    document: { readyState: 'loading', addEventListener() {} }
};
runInNewContext(source, context);
const { nextSundayDate, sundayCalendar } = context.window.GPBCVisitCalendar;

test('Sunday selection uses Pacific civil dates through midnight and DST changes', () => {
    for (const [now, expected] of [
        ['2026-11-27T17:29:59-08:00', '20261129'],
        ['2026-11-29T00:00:00-08:00', '20261206'],
        ['2026-11-29T16:59:59-08:00', '20261206'],
        ['2026-11-29T17:00:00-08:00', '20261206'],
        ['2026-03-06T17:00:00-08:00', '20260308'],
        ['2026-10-30T17:00:00-07:00', '20261101']
    ]) assert.equal(nextSundayDate(new Date(now)), expected);
});

test('recurring Sunday ICS stays at 17:00 Pacific with timezone rules, escaping and CRLF', () => {
    for (const date of ['20260301', '20260308', '20261025', '20261101', '20261129']) {
        const ics = sundayCalendar(date, new Date('2026-01-01T00:00:00Z'));
        const unfolded = ics.replace(/\r\n /g, '');
        assert.ok(unfolded.includes('DTSTART;TZID=America/Los_Angeles:' + date + 'T170000\r\n'));
        assert.ok(unfolded.includes('DTEND;TZID=America/Los_Angeles:' + date + 'T183000\r\n'));
        assert.ok(unfolded.includes('BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles\r\n'));
        assert.ok(unfolded.includes('RRULE:FREQ=WEEKLY;BYDAY=SU\r\n'));
        assert.ok(unfolded.includes('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU'));
        assert.ok(unfolded.includes('RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU'));
        assert.ok(unfolded.includes('LOCATION:1325 Richardson Street\\, San Bernardino\\, CA 92408'));
        assert.ok(unfolded.includes('UID:sunday-worship@gracepraise.church'));
        assert.ok(ics.endsWith('\r\n'));
        assert.ok(!/(?<!\r)\n/.test(ics));
        assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
    }
});

test('calendar helpers reject absent, invalid and non-Sunday dates', () => {
    for (const date of [undefined, '', '20260230', '20261128', 'not a date']) {
        assert.throws(() => sundayCalendar(date), /Sunday calendar date/);
    }
    assert.throws(() => nextSundayDate(new Date('invalid')), /Invalid time value/);
});

test('calendar initialization tolerates missing optional page elements', () => {
    assert.doesNotThrow(() => runInNewContext(source, {
        window: {}, TextEncoder, URL: { createObjectURL: () => 'blob:test' }, Blob,
        URLSearchParams, document: { readyState: 'complete', getElementById: () => null }
    }));
});
