import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');

export function collectCases(report) {
  const cases = [];
  function visit(groups, parents = []) {
    for (const group of groups) {
      const titles = [...parents, group.title];
      for (const spec of group.specs ?? []) {
        for (const test of spec.tests) {
          cases.push({
            project: test.projectName,
            file: spec.file,
            title: [...titles.slice(1), spec.title].join(' › '),
            skipped: test.expectedStatus === 'skipped'
          });
        }
      }
      visit(group.suites ?? [], titles);
    }
  }
  visit(report.suites);
  return cases;
}

export function planShards(cases, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error('Shard count must be a positive integer');
  const shards = Array.from({ length: total }, () => ({ weight: 0, cases: [] }));
  const weighted = cases.map((entry, index) => {
    const browser = /Safari|iPad|iPhone/.test(entry.project) ? 3 : /Firefox/.test(entry.project) ? 2 : 1;
    const file = /critical-navigation-and-render/.test(entry.file) ? 5 :
      /device-theme-regression/.test(entry.file) ? 4 : /navigation\//.test(entry.file) ? 3 : 1;
    return { entry, index, weight: entry.skipped ? 0.1 : browser * file };
  }).sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const item of weighted) {
    const shard = shards.reduce((best, candidate) => candidate.weight < best.weight ? candidate : best);
    shard.cases.push(item.entry);
    shard.weight += item.weight;
  }
  return shards;
}

export function testList(cases) {
  return cases.map(entry => `[${entry.project}] › ${entry.file} › ${entry.title}`).join('\n') + '\n';
}

function run() {
  const args = process.argv.slice(2);
  const shardArg = args.find(arg => arg.startsWith('--shard='));
  const match = /^--shard=(\d+)\/(\d+)$/.exec(shardArg ?? '');
  if (!match || +match[1] < 1 || +match[1] > +match[2]) throw new Error('Use --shard=N/TOTAL');
  const current = +match[1];
  const total = +match[2];
  const collection = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], {
    encoding: 'utf8', maxBuffer: 40 * 1024 * 1024
  });
  if (collection.status !== 0) {
    process.stderr.write(collection.stderr || collection.stdout);
    process.exitCode = collection.status || 1;
    return;
  }
  const shards = planShards(collectCases(JSON.parse(collection.stdout)), total);
  const directory = resolve('playwright-report/ci-shards');
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `shard-${current}-of-${total}.txt`);
  writeFileSync(path, testList(shards[current - 1].cases));
  console.log(`Balanced shard ${current}/${total}: ${shards[current - 1].cases.length} tests; weights ${shards.map(s => Math.round(s.weight)).join(', ')}`);
  const result = spawnSync(process.execPath, [cli, 'test', `--test-list=${path}`, ...args.filter(arg => arg !== shardArg)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run();
