import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('monthly giving retains the requested language without changing mail or explicit language links', async () => {
    const html = await read('give-monthly.html');
    const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    for (const [query, saved, expected] of [
        ['?lang=bn', 'en', 'bn'], ['?lang=en', 'bn', 'en'], ['', 'bn', 'bn'],
        ['?lang=invalid', 'bn', 'bn'], ['?lang=bn', null, 'bn']
    ]) {
        const links = ['index.html', 'give.html?frequency=once', 'give.html?frequency=once&lang=bn', 'mailto:info@example.test', '#main-content']
            .map(href => ({ href, getAttribute() { return this.href; } }));
        runInNewContext(source, {
            URL, location: { href: 'https://example.test/give-monthly.html' + query, origin: 'https://example.test' },
            localStorage: { getItem() { if (saved === null) throw new Error('Blocked'); return saved; } },
            document: { querySelectorAll: () => links }
        });
        assert.equal(new URL(links[0].href, 'https://example.test').searchParams.get('lang'), expected);
        assert.equal(new URL(links[1].href, 'https://example.test').searchParams.get('lang'), expected);
        assert.ok(links[1].href.includes('frequency=once'));
        assert.ok(links[2].href.includes('lang=bn'));
        assert.equal(links[3].href, 'mailto:info@example.test');
        assert.equal(links[4].href, '#main-content');
    }
    assert.doesNotThrow(() => runInNewContext(source, {
        URL, location: { href: 'https://example.test/give-monthly.html' },
        localStorage: { getItem() { throw new Error('Blocked'); } },
        document: { querySelectorAll() { throw new Error('Should not rewrite without a language'); } }
    }));
});

test('gratitude language selection tolerates loading and absent devotion data, then renders loaded data', async () => {
    const html = await read('gratitude-fasting.html');
    const source = html.match(/function switchLanguage\(lang\) \{[\s\S]*?\n        \}/)[0];
    const element = { classList: { toggle() {} }, setAttribute() {} };
    const rendered = [];
    const context = {
        devotionalData: null, currentDay: 1, currentLang: 'en', updateContent: devotion => rendered.push(devotion),
        document: { documentElement: element, getElementById: () => element }
    };
    runInNewContext(source, context);
    for (const data of [null, {}, { devotions: [] }]) {
        context.devotionalData = data;
        assert.doesNotThrow(() => context.switchLanguage('bn'));
        assert.equal(context.currentLang, 'bn');
    }
    const devotion = { day: 1 };
    context.devotionalData = { devotions: [devotion] };
    context.switchLanguage('en');
    assert.deepEqual(rendered, [devotion]);
});

test('unused ICS download is removed while reminder calculations remain available', async () => {
    const context = { events: [], document: { addEventListener() {} } };
    runInNewContext(await read('reminders.js'), context);
    assert.equal(context.exportRemindersToICS, undefined);
    assert.equal(typeof context.getReminderStats, 'function');
    assert.equal(context.getUpcomingReminders().length, 0);
    assert.equal(context.getReminderStats().total, 0);
});

test('Habakkuk has the correct names and languages', async () => {
    const context = { localStorage: { getItem: () => null }, document: { addEventListener() {} } };
    runInNewContext(await read('bible-reader.js') + '\nthis.books = app.books;', context);
    const book = context.books.find(book => book.id === 'hab');
    assert.equal(book.en, 'Habakkuk');
    assert.equal(book.bn, 'হবক্‌কূক');
    assert.equal(book.chapters, 3);
});
