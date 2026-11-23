import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const context = { window: {}, TextEncoder };
runInNewContext(await fs.readFile(new URL('../js/home-activities.js', import.meta.url), 'utf8'), context);
const flyer = context.window.GPBC_HOME_ACTIVITIES[1];
const fast = context.window.GPBC_HOME_ACTIVITIES.find(entry => entry.type === 'fast');

test('fast calendar uses inclusive all-day dates and a stable UID with escaped bilingual content', () => {
    const first = context.homeActivityCalendar(fast, '', '');
    const second = context.homeActivityCalendar({ ...fast, calendarTitle: 'Updated title' }, '', '');
    assert.ok(first.includes('DTSTART;VALUE=DATE:20270101\r\n'));
    assert.ok(first.includes('DTEND;VALUE=DATE:20270128\r\n'));
    assert.equal(first.match(/^UID:.*$/m)[0], second.match(/^UID:.*$/m)[0]);
    assert.ok(first.replace(/\r\n /g, '').includes(fast.text.en));
    assert.ok(first.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
    const empty = context.homeActivityCalendar({ ...fast, text: {} }, '', '');
    assert.ok(!empty.includes('undefined'));
    const html = context.renderHomeFast({ ...fast, title: { en: '<script>', bn: '&' } });
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
});

test('all-day calendar rejects missing, reversed and invalid date ranges', () => {
    for (const endDate of [undefined, '', '2026-12-31', '2027-02-30']) {
        assert.throws(() => context.homeActivityCalendar({ ...fast, endDate }, '', ''), /Activity calendar requires/);
    }
});

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
    for (const config of [null, {}, { ...flyer, start: '25:00' }, { ...flyer, start: undefined }]) {
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
        assert.equal(record.endDate, undefined);
        assert.equal(config.end, undefined);
        const ics = context.homeActivityCalendar(config, '', '');
        assert.ok(ics.includes('DTSTART;TZID=America/Los_Angeles:' + config.date.replaceAll('-', '') + 'T' + config.start.replace(':', '') + '00'));
        assert.doesNotMatch(ics, /^(DTEND|DURATION)[;:]/m);
    }
});
