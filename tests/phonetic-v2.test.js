const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const engine = require('../phonetic-v2');

function loadSongs() {
    const sourcePath = path.join(__dirname, '..', 'songs-data.js');
    const source = fs.readFileSync(sourcePath, 'utf8') + `
this.__songsDatabase = window.SONGS_DATA || (typeof songsDatabase !== 'undefined' ? songsDatabase : []);`;
    const context = { window: {} };
    vm.runInNewContext(source, context, { filename: sourcePath });
    return context.__songsDatabase;
}

const songs = loadSongs();
const malformedMark = /[\u0981-\u0983\u09BC-\u09CD\u09D7\u09C3-\u09D4]/u;

test('user-confirmed reviewed vocabulary passes exactly', () => {
    const expectations = {
        'নাম': 'naam',
        'সুমধুর': 'sumodhur',
        'যীশুর': 'Jishur',
        'তার': 'taar',
        'পরিধান': 'poridhan',
        'সমাধান': 'somadhan',
        'অবধান': 'obodhan',
        'আর': 'Ar',
        'আত্মার': 'Atmar'
    };

    for (const [bangla, expected] of Object.entries(expectations)) {
        assert.equal(engine.convertWordV2(bangla), expected, bangla);
        assert.equal(engine.analyzeV2(bangla).reviewedWord, true, bangla);
    }
});

test('nukta and য় / য় variants normalize without leaked Bengali marks', () => {
    const forms = [
        'জয়', 'জয়', 'তোমায়', 'তোমায়', 'হৃদয়', 'আমায়', 'যায়', 'হয়',
        'দয়া', 'হয়ে', 'ভয়', 'দিয়ে', 'পায়', 'আয়', 'দয়াময়', 'হৃদয়ে',
        'সময়', 'দয়াল'
    ];

    for (const form of forms) {
        const output = engine.convertWordV2(form);
        assert.notEqual(output, '', form);
        assert.equal(malformedMark.test(output), false, form + ' leaked a mark');
        assert.equal(/[\u0980-\u09FF]/u.test(output), false, form + ' leaked Bengali');
    }

    assert.deepEqual(
        engine.tokenizeBanglaGraphemes('জয়').map(grapheme => grapheme.raw),
        ['জ', 'য়']
    );
});

test('phrase overrides are exact and preserve outer whitespace', () => {
    assert.equal(
        engine.convertToPhoneticV2('  আর কোন নাম নাই, যে নামে জীবন পাই,  '),
        '  Ar kono nam nai, je name jibon pai,  '
    );
    assert.equal(engine.convertToPhoneticV2('নাম নাই'), 'naam nai');
});

test('punctuation, line breaks, Latin text, empty input, and chord-shaped lines are safe', () => {
    assert.equal(engine.convertToPhoneticV2(''), '');
    assert.equal(engine.convertToPhoneticV2('D A D'), 'D A D');
    assert.equal(engine.convertToPhoneticV2('Bm A Bm A D G(D)'), 'Bm A Bm A D G(D)');
    assert.equal(engine.convertToPhoneticV2('D/F#'), 'D/F#');
    assert.equal(engine.convertToPhoneticV2('F#m7'), 'F#m7');
    assert.equal(engine.convertToPhoneticV2('Nam নাম'), 'Nam naam');
    assert.equal(engine.convertToPhoneticV2('নাম\nআর'), 'naam\nAr');
    assert.equal(engine.convertToPhoneticV2('নাম।'), 'naam.');
});

test('at least 100 real songs convert without empty or malformed V2 output', () => {
    assert.equal(songs.length, 1410);
    for (const song of songs.slice(0, 100)) {
        for (const line of [song.title, ...song.lyrics.split('\n')]) {
            if (!/[\u0980-\u09FF]/u.test(line)) continue;
            const result = engine.analyzeV2(line);
            assert.notEqual(result.text, '', 'empty output for song ' + song.id);
            assert.equal(malformedMark.test(result.text), false, 'mark leak for song ' + song.id);
        }
    }
});
