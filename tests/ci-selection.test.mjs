import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('scheduled coverage has its own concurrency group while push/manual and PR grouping stay shared', () => {
  const document = require('yaml').parseDocument(readFileSync(new URL('../.github/workflows/playwright-ci.yml', import.meta.url), 'utf8'));
  assert.deepEqual(document.errors, []);
  const workflow = document.toJS();
  const evaluate = (template, eventName, ref = 'refs/heads/main', number) => template.replace(/\$\{\{(.*?)\}\}/g, (_, expression) =>
    new Function('github', `return (${expression});`)({ workflow: workflow.name, event_name: eventName, ref, event: { pull_request: { number } } }));
  const group = (eventName, ref, number) => evaluate(workflow.concurrency.group, eventName, ref, number);
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert.equal(group('schedule'), `${workflow.name}-nightly`);
  assert.equal(group('push'), `${workflow.name}-refs/heads/main`);
  assert.equal(group('workflow_dispatch'), group('push'));
  assert.notEqual(group('schedule'), group('push'));
  assert.notEqual(group('schedule'), group('workflow_dispatch'));
  assert.equal(group('pull_request', 'refs/pull/123/merge', 123), `${workflow.name}-123`);
  assert.notEqual(group('pull_request', 'refs/pull/124/merge', 124), group('pull_request', 'refs/pull/123/merge', 123));
  assert.equal(group('workflow_dispatch', 'refs/heads/feature'), group('push', 'refs/heads/feature'));
  assert(workflow.on.schedule.some(entry => entry.cron === '15 3 * * *'));
  assert.equal(evaluate(workflow.jobs.test.env.PLAYWRIGHT_SUITE, 'schedule'), 'nightly');
  assert.equal(evaluate(workflow.jobs.test.env.PLAYWRIGHT_SUITE, 'push'), 'pr');
  assert.equal(workflow.jobs['merge-reports'].if, '${{ !cancelled() }}');
});

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

test('PR gate includes mobile date-chip geometry in WebKit', () => {
  const rail = pr.filter(entry => entry.project === 'Desktop Safari' && entry.file.endsWith('activity-rail.spec.ts'));
  for (const width of [320, 360, 390, 490]) assert(rail.some(entry => entry.title.startsWith(width + 'px')));
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
