import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const context = { window: {}, TextEncoder };
runInNewContext(await fs.readFile(new URL('../js/home-activities.js', import.meta.url), 'utf8'), context);
const flyer = context.window.GPBC_HOME_ACTIVITIES[1];

test('ICS escapes text and folds at UTF-8 octet boundaries; UID is stable', () => {
    const title = 'Celebration, together; \\ family\n' + 'বাংলা'.repeat(20);
    const config = { ...flyer, calendarTitle: title };
    const first = context.homeActivityCalendar(config, 'Church, CA; Room \\ 1\nUpstairs', 'https://gracepraise.church/plan-visit.html?lang=bn', new Date('2026-12-01T12:00:00Z'));
    const second = context.homeActivityCalendar(config, 'Elsewhere', 'https://gracepraise.church/plan-visit.html', new Date('2026-12-02T12:00:00Z'));
    assert.equal(first.match(/^UID:.*$/m)[0], second.match(/^UID:.*$/m)[0]);
    assert.ok(first.endsWith('\r\n'));
    assert.ok(!/(?<!\r)\n/.test(first));
    assert.ok(first.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
    const unfolded = first.replace(/\r\n /g, '');
    assert.ok(unfolded.includes('SUMMARY:Celebration\\, together\\; \\\\ family\\n' + 'বাংলা'.repeat(20)));
    assert.ok(unfolded.includes('LOCATION:Church\\, CA\\; Room \\\\ 1\\nUpstairs'));
    assert.ok(unfolded.includes('plan-visit.html?lang=bn'));
});

test('ICS accepts empty optional text without introducing undefined fields', () => {
    const result = context.homeActivityCalendar({ ...flyer, en: '' }, '', '');
    assert.ok(!result.includes('undefined'));
    assert.ok(result.includes('LOCATION:\r\n'));
});

test('ICS rejects missing or invalid scheduling data', () => {
    for (const config of [null, {}, { ...flyer, start: '25:00' }, { ...flyer, end: '16:00' }]) {
        assert.throws(() => context.homeActivityCalendar(config, '', ''), /Activity calendar requires/);
    }
});

test('static holiday JSON-LD agrees with shared config and ICS for all four events', async () => {
    const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
    const records = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .flatMap(match => {
            const value = JSON.parse(match[1]);
            return value['@graph'] || [value];
        }).filter(value => value['@type'] === 'Event');
    for (const config of context.window.GPBC_HOME_ACTIVITIES.filter(value => value.type === 'flyer')) {
        const record = records.find(value => value.startDate.startsWith(config.date));
        assert.equal(record.startDate, config.date + 'T' + config.start + ':00-08:00');
        assert.equal(record.endDate, config.date + 'T' + config.end + ':00-08:00');
        const ics = context.homeActivityCalendar(config, '', '');
        for (const [field, time] of [['DTSTART', config.start], ['DTEND', config.end]]) {
            assert.ok(ics.includes(field + ';TZID=America/Los_Angeles:' + config.date.replaceAll('-', '') + 'T' + time.replace(':', '') + '00'));
        }
    }
});
