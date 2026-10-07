import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = { window: { addEventListener() {} }, document: { addEventListener() {}, getElementById() { return null; } }, Intl };
vm.createContext(context);
for (const file of ['songs-data.js', 'english-songbook-data.js', 'songbook-app.js']) {
    vm.runInContext(fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const runtime = context.window.GPBCSongbookPresentation;
const phonetic = source => runtime.getSongPhoneticLine({ id: 0 }, source);

test('active converter satisfies exact user-confirmed full lyric lines', () => {
    for (const [source, expected] of [
        ['দয়া করো আমার উপর', 'Doya koro amar upor'],
        ['ওহে যীশু দয়াবান', 'ohe Jishu doyaban'],
        ['তুমি নরের নিস্তারের কর্তা', 'Tumi norer nistarer korta']
    ]) assert.equal(phonetic(source), expected);
});

test('general endings and explicit conjunct vowels work beyond the anchor vocabulary', () => {
    assert.equal(phonetic('তোমার জীবন পাপের মোদের নাম মন গান দিন'),
        'Tomar jibon paper moder nam mon gan din');
    assert.equal(phonetic('প্রেম প্রাণ শান্তি শক্তি মুক্তি আত্মার কর্তা'),
        'Prem pran shanti shokti mukti atmar korta');
    assert.equal(phonetic('আমারই তোমারও জয় হয় ভয় তোমায়'),
        'Amari tomaro joy hoy bhoy tomay');
    assert.equal(phonetic('করো এসো ভালো দয়া আনন্দ কর বল যত যেন'),
        'Koro eso bhalo doya anondo koro bolo joto jeno');
    assert.equal(phonetic('আমরা তোমরা ধন্য অন্য সত্য'), 'Amra tomra dhonno onno shotto');
    assert.equal(phonetic('হই লও দেহ চল মত ছিল যাব পাব হব দেব'),
        'Hoi loo deho cholo moto chhilo jabo pabo hobo debo');
    assert.equal(phonetic('করিব পাইব জীবিত অমৃত লহ করিল হইল হাত রাত সব'),
        'Koribo paibo jibito omrito loho korilo hoilo hat rat sob');
    assert.equal(phonetic('নয়ন গায়ক হৃদয় উৎস একই'), 'Noyon gayok hridoy utsho eki');
    assert.equal(phonetic('করতে বলতে দেখতে রাখতে শুনতে করব করবেন করছি করছে বললে রাখলাম'),
        'Korte bolte dekhte rakhte shunte korbo korben korchhi korchhe bolle rakhlam');
});

test('nukta forms, explicit hasanta and punctuation/line structure are stable', () => {
    assert.equal(phonetic('বড় বাড়ি হয়'), phonetic('বড় বাড়ি হয়'));
    assert.equal(phonetic('উৎ ক্ শক্ত্'), 'Ut k shokt');
    const source = '  “দয়া,”  করো! আমার-উপর।\nওহে যীশু দয়াবান॥';
    assert.equal(phonetic(source), '  “Doya,”  koro! amar-upor।\nohe Jishu doyaban॥');
    assert.equal(phonetic('Original English title!\nSing, with joy.'), 'Original English title!\nSing, with joy.');
});

test('entire real catalog retains whitespace tokens and English output; sources remain untouched', () => {
    const songs = [...context.window.SONGS_DATA, ...context.window.GPBC_ENGLISH_SONGS];
    const original = JSON.stringify(songs);
    assert.equal(songs.length, 1492);
    for (const song of songs) {
        for (const source of [song.title, ...song.lyrics.split('\n')]) {
            const output = runtime.getSongPhoneticLine(song, source);
            assert.equal(output.trim().split(/\s+/u).length, source.trim().split(/\s+/u).length, `${song.id}: ${source}`);
            if (runtime.isEnglishSong(song)) assert.equal(output, source);
        }
    }
    assert.equal(JSON.stringify(songs), original);
});

test('approved 117 phrases remain authoritative and natural phonetic search is cached', () => {
    const song = context.window.SONGS_DATA.find(song => song.id === 117);
    assert.equal(runtime.getSongPhoneticLine(song, 'আত্মার দানে হয় ভরপুর।'), 'Atmar dane hoy bhorpur.');
    const real = context.window.SONGS_DATA.find(song => song.id === 696);
    const fields = runtime.getSongSearchFields(real);
    assert.ok(runtime.matchSongSearch(real, 'doya'));
    assert.ok(runtime.matchSongSearch(real, 'amar upor'));
    assert.equal(runtime.getSongSearchFields(real), fields);
});
