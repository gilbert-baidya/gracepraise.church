import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { collectCases, planShards, testList } from '../scripts/run-playwright-ci.mjs';

test('shards preserve every case exactly once and distribute slow browsers', () => {
  const cases = Array.from({ length: 80 }, (_, index) => ({
    project: index < 40 ? 'Desktop Chrome' : 'iPhone 14',
    file: 'regression/device-theme-regression.spec.ts',
    title: `case ${index}`
  }));
  const shards = planShards(cases, 4);
  assert.equal(shards.flatMap(shard => shard.cases).length, cases.length);
  assert.deepEqual(new Set(shards.flatMap(shard => shard.cases)), new Set(cases));
  assert(shards.every(shard => shard.cases.some(entry => entry.project === 'iPhone 14')));
  assert(Math.max(...shards.map(s => s.weight)) - Math.min(...shards.map(s => s.weight)) <= 1);
  assert.deepEqual(planShards(cases, 4), shards);
});

test('empty plans and invalid shard counts are explicit', () => {
  assert.deepEqual(planShards([], 2), [{ weight: 0, cases: [] }, { weight: 0, cases: [] }]);
  for (const count of [0, -1, 1.5, NaN]) assert.throws(() => planShards([], count));
});

test('collection retains project and nested describe titles in test lists', () => {
  const report = { suites: [{ title: 'sample.spec.ts', suites: [{
    title: 'outer', suites: [{ title: 'inner', specs: [{
      file: 'sample.spec.ts', title: 'works', tests: [{ projectName: 'Desktop Chrome', expectedStatus: 'passed' }]
    }] }]
  }] }] };
  assert.equal(testList(collectCases(report)), '[Desktop Chrome] › sample.spec.ts › outer › inner › works\n');
});

test('real PR test lists partition the complete selection without omissions or duplicates', () => {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const env = { ...process.env, CI: 'true', PLAYWRIGHT_SUITE: 'pr', PRODUCTION_BASE_URL: 'http://127.0.0.1:8082' };
  function collect(args = []) {
    return collectCases(JSON.parse(execFileSync(process.execPath, [cli, 'test', '--list', '--reporter=json', ...args], {
      env, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024
    })));
  }
  const cases = collect();
  const shards = planShards(cases, 4);
  mkdirSync('playwright-report/ci-shards', { recursive: true });
  const selected = shards.flatMap((shard, index) => {
    const path = `playwright-report/ci-shards/verify-${index}.txt`;
    writeFileSync(path, testList(shard.cases));
    const actual = collect([`--test-list=${path}`]);
    assert.equal(testList(actual.slice().sort((a, b) => testList([a]).localeCompare(testList([b])))),
      testList(shard.cases.slice().sort((a, b) => testList([a]).localeCompare(testList([b])))));
    return actual;
  });
  assert.equal(selected.length, cases.length);
  assert.equal(new Set(selected.map(entry => testList([entry]))).size, cases.length);
});
