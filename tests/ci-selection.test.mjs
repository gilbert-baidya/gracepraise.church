import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

function collect(suite) {
  const env = { ...process.env, PRODUCTION_BASE_URL: 'http://127.0.0.1:8082' };
  if (suite) env.PLAYWRIGHT_SUITE = suite;
  else delete env.PLAYWRIGHT_SUITE;
  const report = JSON.parse(execFileSync(process.execPath, [
    require.resolve('@playwright/test/cli'), 'test', '--list', '--reporter=json'
  ], { env, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }));
  const cases = [];
  function visit(suites) {
    for (const group of suites) {
      for (const spec of group.specs ?? []) {
        for (const result of spec.tests) {
          cases.push({ file: spec.file, project: result.projectName, title: spec.title, pageTitle: group.title, tags: spec.tags });
        }
      }
      visit(group.suites ?? []);
    }
  }
  visit(report.suites);
  return cases;
}

const pr = collect('pr');
const nightly = collect('nightly');
const full = collect();

test('default profile reserves production publication checks for Production Chrome', () => {
  const publication = full.filter(entry => entry.file.endsWith('production-publication.spec.ts'));
  assert(publication.length > 0);
  assert(publication.every(entry => entry.project === 'Production Chrome'));
});

test('PR gate retains seven-project navigation and real production-artifact coverage', () => {
  const projects = new Set(pr.filter(entry => entry.file.endsWith('navigation-integrity.spec.ts')).map(entry => entry.project));
  assert.equal(projects.size, 7);
  assert(pr.some(entry => entry.project === 'Production Chrome' && entry.file.endsWith('production-publication.spec.ts')));
  assert(pr.some(entry => entry.file.endsWith('auto-generated-page-tests.spec.ts')));
  assert(pr.some(entry => entry.file.endsWith('auto-generated-coverage.spec.ts')));
  assert(!pr.some(entry => /(?:^|\/)(visual|performance)\//.test(entry.file)));
  assert(!pr.some(entry => entry.tags.includes('quarantine')));
});

test('nightly collects every spec file and keeps quarantined assertions executable', () => {
  assert.deepEqual(new Set(nightly.map(entry => entry.file)), new Set(full.map(entry => entry.file)));
  assert(nightly.some(entry => entry.tags.includes('quarantine')));
  assert(nightly.some(entry => entry.project === 'iPhone 14 Quarantine' && entry.title.includes('SMS Opt-In')));
  for (const folder of ['smoke', 'visual', 'performance']) {
    const entries = nightly.filter(entry => entry.file.split('/').includes(folder));
    assert(entries.length > 0);
    assert(entries.every(entry => entry.project === 'Desktop Chrome' || entry.tags.includes('quarantine')));
  }
  const key = entry => `${entry.project}:${entry.file}:${entry.title}`;
  const nightKeys = new Set(nightly.map(key));
  assert(pr.every(entry => nightKeys.has(key(entry))));
});

test('legacy Give Backup live PayPal console and exception checks run nightly without removing other PR coverage', () => {
  const integrationChecks = entry =>
    entry.file.endsWith('auto-generated-page-tests.spec.ts') && entry.title === 'loads successfully without errors' ||
    entry.file.endsWith('auto-generated-coverage.spec.ts') && ['Give Backup - has no console errors', 'Give Backup - has no uncaught JavaScript exceptions'].includes(entry.title);
  const backup = entry => ['Give Backup - has no console errors', 'Give Backup - has no uncaught JavaScript exceptions'].includes(entry.title) ||
    entry.file.endsWith('auto-generated-page-tests.spec.ts') && entry.pageTitle === 'give-backup.html - Auto Generated Suite';
  const checks = nightly.filter(entry => backup(entry) && integrationChecks(entry));
  assert(checks.some(entry => entry.project === 'Desktop Chrome' && entry.file.endsWith('auto-generated-page-tests.spec.ts')));
  assert(checks.some(entry => entry.project === 'Desktop Chrome' && entry.file.endsWith('auto-generated-coverage.spec.ts')));
  assert(checks.every(entry => entry.tags.includes('quarantine')));
  assert(checks.some(entry => entry.project === 'Desktop Chrome' && entry.title === 'Give Backup - has no uncaught JavaScript exceptions'));
  assert(!pr.some(entry => backup(entry) && integrationChecks(entry)));
  assert(pr.some(entry => entry.title === 'Home - has no uncaught JavaScript exceptions'));
  assert(pr.some(entry => entry.title === 'Give Backup - loads successfully with HTTP 200'));
  assert(pr.some(entry => backup(entry) && entry.title === 'displays header and footer correctly'));
});
