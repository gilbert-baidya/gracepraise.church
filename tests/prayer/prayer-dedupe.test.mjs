import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../GoogleAppsScript.js', import.meta.url), 'utf8');
const headers = ['Timestamp', 'Name', 'Is Anonymous', 'Categories', 'Prayer Details', 'Status'];
const prayer = { name: 'Friend', isAnonymous: true, categories: 'General', details: 'Please pray.', status: 'Active' };

function fixture(initialRows, maxColumns = 26) {
  const rows = initialRows ? initialRows.map(row => [...row]) : [];
  let exists = Boolean(initialRows);
  let held = false;
  const calls = { acquired: 0, released: 0 };
  const styles = [];
  const locked = () => assert.equal(held, true, 'sheet access must hold the script lock');
  const sheet = {
    getLastRow() { locked(); return rows.length; },
    getLastColumn() { locked(); return Math.max(0, ...rows.map(row => row.length)); },
    getMaxColumns() { locked(); return maxColumns; },
    insertColumnAfter(column) { locked(); assert.equal(column, maxColumns); maxColumns++; },
    appendRow(row) { locked(); rows.push(Array.from(row)); },
    getRange(row, column, height = 1, width = 1) {
      locked();
      assert.ok(height > 0 && width > 0);
      assert.ok(column + width - 1 <= maxColumns, 'range must fit the sheet grid');
      const range = {
        getValues() {
          locked();
          assert.equal(row, 1, 'only headers should be downloaded');
          return Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => rows[row - 1 + r]?.[column - 1 + c] ?? ''));
        },
        setValue(value) {
          locked();
          rows[row - 1] ??= [];
          rows[row - 1][column - 1] = value;
          return range;
        },
        setFontWeight(value) { locked(); styles.push([row, column, 'weight', value]); return range; },
        setBackground(value) { locked(); styles.push([row, column, 'background', value]); return range; },
        setFontColor(value) { locked(); styles.push([row, column, 'color', value]); return range; },
        createTextFinder(needle) {
          const finder = {
            useRegularExpression(value) { assert.equal(value, false); return finder; },
            matchCase(value) { assert.equal(value, true); return finder; },
            matchEntireCell(value) { assert.equal(value, true); return finder; },
            findNext() { locked(); return rows.slice(row - 1, row - 1 + height).find(values => values[column - 1] === needle) || null; }
          };
          return finder;
        },
      };
      return range;
    },
  };
  const spreadsheet = {
    getSheetByName(name) { locked(); assert.equal(name, 'Prayer Requests'); return exists ? sheet : null; },
    insertSheet(name) { locked(); assert.equal(name, 'Prayer Requests'); exists = true; return sheet; },
  };
  const lock = {
    waitLock(timeout) { assert.equal(timeout, 30000); assert.equal(held, false); held = true; calls.acquired++; },
    releaseLock() { locked(); held = false; calls.released++; },
  };
  const spreadsheetApp = { flush: () => locked() };
  const context = vm.createContext({ LockService: { getScriptLock: () => lock }, SpreadsheetApp: spreadsheetApp });
  vm.runInContext(source, context);
  context.createJsonResponse = value => JSON.parse(JSON.stringify(value));
  return { rows, sheet, lock, calls, styles, spreadsheetApp, submit: fields => context.addPrayerRequest(spreadsheet, { prayer: { ...prayer, ...fields } }) };
}

test('a lost response retry returns success without appending the prayer twice', () => {
  const f = fixture();
  assert.equal(f.submit({ submissionId: 'request-one' }).success, true);
  assert.deepEqual(f.submit({ submissionId: 'request-one', details: 'Retry text' }), { success: true, duplicate: true });
  assert.equal(f.rows.length, 2);
  assert.deepEqual(f.rows[0], [...headers, 'Submission ID']);
  assert.equal(f.rows[1][4], prayer.details);
  assert.equal(f.rows[1][6], 'request-one');
  assert.deepEqual(f.calls, { acquired: 2, released: 2 });
});

test('distinct IDs append distinct prayers', () => {
  const f = fixture();
  f.submit({ submissionId: 'first' });
  f.submit({ submissionId: 'second' });
  assert.equal(f.rows.length, 3);
  assert.deepEqual(f.rows.slice(1).map(row => row[6]), ['first', 'second']);
});

test('ID lookup is literal, case-sensitive and matches entire cells', () => {
  const f = fixture();
  for (const submissionId of ['a_b', 'axb', 'A_B', 'a_b-more']) f.submit({ submissionId });
  assert.equal(f.rows.length, 5);
  assert.equal(f.submit({ submissionId: 'a_b' }).duplicate, true);
  assert.equal(f.rows.length, 5);
});

test('the migrated ID header uses the existing header styling', () => {
  const f = fixture([headers]);
  f.submit({ submissionId: 'styled-id' });
  assert.deepEqual(f.styles, [[1, 7, 'weight', 'bold'], [1, 7, 'background', '#9b59b6'], [1, 7, 'color', 'white']]);
});

test('migrating an existing sheet preserves custom columns and existing rows', () => {
  const oldRow = ['Yesterday', 'Existing friend', 'No', 'General', 'Existing prayer', 'Active', 'Keep these notes'];
  const f = fixture([[...headers, 'Pastoral Notes'], oldRow]);
  f.submit({ submissionId: 'new-id' });
  f.submit({ submissionId: 'new-id' });
  assert.deepEqual(f.rows[0], [...headers, 'Pastoral Notes', 'Submission ID']);
  assert.deepEqual(f.rows[1], oldRow);
  assert.equal(f.rows.length, 3);
  assert.equal(f.rows[2][6], '');
  assert.equal(f.rows[2][7], 'new-id');
});

test('an existing Submission ID column is reused without shifting later columns', () => {
  const oldRow = ['Yesterday', 'Friend', 'No', 'General', 'Prayer', 'Active', 'old-id', 'Private notes'];
  const f = fixture([[...headers, 'Submission ID', 'Notes'], oldRow]);
  assert.deepEqual(f.submit({ submissionId: 'old-id' }), { success: true, duplicate: true });
  f.submit({ submissionId: 'new-id' });
  assert.deepEqual(f.rows[0], [...headers, 'Submission ID', 'Notes']);
  assert.deepEqual(f.rows[1], oldRow);
  assert.equal(f.rows[2][6], 'new-id');
});

test('a sheet trimmed to six columns is extended before adding the ID header', () => {
  const f = fixture([headers], 6);
  assert.equal(f.submit({ submissionId: 'new-id' }).success, true);
  assert.deepEqual(f.rows[0], [...headers, 'Submission ID']);
  assert.equal(f.rows[1][6], 'new-id');
});

test('legacy requests still append without deduplication after ID-column migration', () => {
  const f = fixture();
  f.submit({ submissionId: 'tracked-id' });
  f.submit({});
  f.submit({});
  assert.deepEqual(f.rows[0], [...headers, 'Submission ID']);
  assert.equal(f.rows.length, 4);
  assert.equal(f.rows[2].length, 6);
  assert.equal(f.rows[3].length, 6);
});

for (const submissionId of [undefined, null, '']) {
  test(`legacy requests with ${JSON.stringify(submissionId)} ID retain six-column append behavior`, () => {
    const f = fixture();
    f.submit({ submissionId });
    f.submit({ submissionId });
    assert.deepEqual(f.rows[0], headers);
    assert.equal(f.rows.length, 3);
    assert.deepEqual(f.rows[1].slice(1), ['Friend', 'Yes', 'General', 'Please pray.', 'Active']);
    assert.deepEqual(f.calls, { acquired: 2, released: 2 });
  });
}

test('append failures release the lock and leave the ID available for retry', () => {
  const f = fixture([headers]);
  const append = f.sheet.appendRow;
  f.sheet.appendRow = () => { throw new Error('Sheet unavailable'); };
  assert.throws(() => f.submit({ submissionId: 'retry-id' }), /Sheet unavailable/);
  assert.deepEqual(f.calls, { acquired: 1, released: 1 });
  assert.equal(f.rows.length, 1);
  f.sheet.appendRow = append;
  assert.equal(f.submit({ submissionId: 'retry-id' }).success, true);
  assert.equal(f.rows.length, 2);
  assert.deepEqual(f.calls, { acquired: 2, released: 2 });
});

test('lock acquisition failure does not modify the sheet', () => {
  const f = fixture([headers]);
  f.lock.waitLock = () => { throw new Error('Lock timeout'); };
  assert.throws(() => f.submit({ submissionId: 'blocked-id' }), /Lock timeout/);
  assert.deepEqual(f.rows, [headers]);
  assert.deepEqual(f.calls, { acquired: 0, released: 0 });
});

test('flush failures release the lock and an already appended ID is deduplicated on retry', () => {
  const f = fixture();
  const flush = f.spreadsheetApp.flush;
  f.spreadsheetApp.flush = () => { flush(); throw new Error('Flush failed'); };
  assert.throws(() => f.submit({ submissionId: 'saved-id' }), /Flush failed/);
  assert.deepEqual(f.calls, { acquired: 1, released: 1 });
  f.spreadsheetApp.flush = flush;
  assert.deepEqual(f.submit({ submissionId: 'saved-id' }), { success: true, duplicate: true });
  assert.equal(f.rows.length, 2);
  assert.deepEqual(f.calls, { acquired: 2, released: 2 });
});
