import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../GoogleAppsScript.js', import.meta.url), 'utf8');
const cases = [
  { action: 'addEvent', key: 'event', sheet: 'Events', fields: ['date', 'name', 'category', 'description', 'addedBy', 'contact', 'owner', 'timestamp', 'imageUrl'], columns: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { action: 'addPrayerRequest', key: 'prayer', sheet: 'Prayer Requests', fields: ['name', 'email', 'categories', 'details', 'status'], columns: [1, null, 3, 4, 5] },
  { action: 'addSong', key: 'song', sheet: 'Songs', fields: ['title', 'language', 'category', 'key', 'tempo', 'preview', 'lyrics', 'chords', 'submittedBy'], columns: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { action: 'addTestimony', key: 'testimony', sheet: 'Testimonies', fields: ['name', 'memberSince', 'text', 'language'], columns: [1, 2, 3, 4] },
];

function fixture() {
  const sheets = new Map();
  let writes = 0;
  function makeSheet() {
    const rows = [];
    return {
      rows,
      appendRow(values) { writes++; rows.push(Array.from(values)); },
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
      getMaxColumns: () => 26,
      getRange(row, column, height = 1, width = 1) {
        const range = {
          getValues: () => rows.slice(row - 1, row - 1 + height).map(values => Array.from({ length: width }, (_, i) => values[column - 1 + i] ?? '')),
          getValue: () => rows[row - 1]?.[column - 1],
          setValue(value) { writes++; rows[row - 1][column - 1] = value; return range; },
          setFontWeight() { writes++; return range; },
          setBackground() { writes++; return range; },
          setFontColor() { writes++; return range; },
          createTextFinder(needle) {
            const finder = {
              useRegularExpression: () => finder,
              matchCase: () => finder,
              matchEntireCell: () => finder,
              findNext: () => rows.slice(row - 1, row - 1 + height).find(values => values[column - 1] === needle) || null,
            };
            return finder;
          },
        };
        return range;
      },
    };
  }
  sheets.set('Events', makeSheet());
  const ss = {
    getSheetByName: name => sheets.get(name),
    getSheets: () => [...sheets.values()],
    insertSheet(name) { writes++; const sheet = makeSheet(); sheets.set(name, sheet); return sheet; },
  };
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  });
  vm.runInContext(source, context);
  context.createJsonResponse = value => JSON.parse(JSON.stringify(value));
  return { context, sheets, writes: () => writes, post: data => context.doPost({ postData: { contents: JSON.stringify(data) } }) };
}

for (const entry of cases) {
  for (const [index, field] of entry.fields.entries()) {
    test(`${entry.action}: oversized ${field} rejects without any writes`, () => {
      const f = fixture();
      const result = f.post({ action: entry.action, [entry.key]: { [field]: 'x'.repeat(5001) } });
      assert.equal(result.success, false);
      assert.match(result.message, /5000 characters or fewer/);
      assert.match(result.message.toLowerCase().replaceAll(' ', ''), new RegExp(field === 'details' ? 'prayerrequest' : field.toLowerCase()));
      assert.equal(f.writes(), 0);
      assert.equal(f.sheets.size, 1);
    });

    test(`${entry.action}: at-limit ${field} is accepted without truncation`, () => {
      const f = fixture();
      const value = 'x'.repeat(5000);
      const result = f.post({ action: entry.action, [entry.key]: { [field]: value } });
      assert.equal(result.success, true);
      if (entry.columns[index] !== null) {
        assert.equal(f.sheets.get(entry.sheet).rows.at(-1)[entry.columns[index]], value);
      }
    });
  }
}

test('rejected prayer ID is available for a corrected submission and then deduplicates', () => {
  const f = fixture();
  const submit = details => f.post({ action: 'addPrayerRequest', prayer: { submissionId: 'retry-id', details } });
  assert.equal(submit('x'.repeat(5001)).success, false);
  assert.equal(f.writes(), 0);
  assert.equal(submit('x'.repeat(5000)).success, true);
  assert.deepEqual(submit('x'.repeat(5000)), { success: true, duplicate: true });
  assert.equal(f.sheets.get('Prayer Requests').rows.length, 2);
});

test('rejection leaves an existing prayer sheet and its ID header untouched', () => {
  const f = fixture();
  const submit = prayer => f.post({ action: 'addPrayerRequest', prayer });
  assert.equal(submit({ details: 'Initial prayer' }).success, true);
  const writes = f.writes();
  assert.equal(submit({ submissionId: 'unused-id', details: 'x'.repeat(5001) }).success, false);
  assert.equal(f.writes(), writes);
  assert.equal(f.sheets.get('Prayer Requests').rows[0].includes('Submission ID'), false);
  assert.equal(submit({ submissionId: 'unused-id', details: 'Shortened prayer' }).success, true);
});

test('song chords are validated after joining the array', () => {
  const f = fixture();
  const result = f.post({ action: 'addSong', song: { chords: ['x'.repeat(2500), 'x'.repeat(2500)] } });
  assert.equal(result.success, false);
  assert.match(result.message, /Song chords/);
  assert.equal(f.writes(), 0);
});

test('empty optional fields and formula escaping remain lossless', () => {
  const f = fixture();
  assert.equal(f.context.sanitizeCell(null), '');
  assert.equal(f.context.sanitizeCell(undefined), '');
  for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
    const value = prefix + 'x'.repeat(4999);
    assert.equal(f.post({ action: 'addEvent', event: { name: value } }).success, true);
    assert.equal(f.sheets.get('Events').rows.at(-1)[1], "'" + value);
  }
  assert.equal(f.post({ action: 'addEvent', event: { name: 'Normal', description: null } }).success, true);
  assert.equal(f.sheets.get('Events').rows.at(-1)[3], '');
});

test('existing Songbook archives and Apps Script seed lyrics fit the field limit', () => {
  const f = fixture();
  assert.equal(f.post({ action: 'addSong', song: { title: 'New song' } }).success, true);
  const lyrics = f.sheets.get('Songs').rows.slice(1).map(row => row[7] || '');
  for (const file of ['songs-data.js', 'english-songbook-data.js']) {
    const context = vm.createContext({ window: {} });
    vm.runInContext(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), context);
    const songs = context.window.SONGS_DATA || context.window.GPBC_ENGLISH_SONGS;
    assert(songs.length > 0);
    lyrics.push(...songs.map(song => song.lyrics || ''));
  }
  assert(Math.max(...lyrics.map(value => value.length)) <= 5000);
});

for (const submissionId of ['=1+1', '+1', '-1', '-1-1', '-id', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1', '   ', 'has space', 'a.b', ' id', 'id ', 'id\n', 'id\r', 'id\u2028', 'id\u2029', 'x'.repeat(129), 123, false, {}, []]) {
  test(`unsafe submission ID ${JSON.stringify(submissionId)} is rejected without any sheet writes`, () => {
    const f = fixture();
    const result = f.post({ action: 'addPrayerRequest', prayer: { submissionId, details: 'Please pray.' } });
    assert.equal(result.success, false);
    assert.match(result.message, /Submission ID.*1 to 128.*letters, digits, hyphens or underscores/);
    assert.equal(f.writes(), 0);
    assert.equal(f.sheets.size, 1);
    assert.equal(f.post({ action: 'addPrayerRequest', prayer: { submissionId: 'corrected-id', details: 'Please pray.' } }).success, true);
  });
}

for (const submissionId of ['A', '_id', 'a'.repeat(128), 'PRAYER_abc-123', '550e8400-e29b-41d4-a716-446655440000', 'prayer-0123456789abcdef0123456789abcdef', 'prayer-m1abc-0abc-0def']) {
  test(`safe submission ID ${submissionId} is stored literally and deduplicates`, () => {
    const f = fixture();
    const submit = () => f.post({ action: 'addPrayerRequest', prayer: { submissionId, details: 'Please pray.' } });
    assert.equal(submit().success, true);
    assert.equal(f.sheets.get('Prayer Requests').rows[1][6], submissionId);
    assert.deepEqual(submit(), { success: true, duplicate: true });
    assert.equal(f.sheets.get('Prayer Requests').rows.length, 2);
  });
}
