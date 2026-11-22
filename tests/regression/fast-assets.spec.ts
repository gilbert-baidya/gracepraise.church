import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('optimized assets use content hashes and immutable cache rules without caching HTML', () => {
  const sources = ['index.html', 'plan-visit.html', 'give.html', 'calendar.html', 'partials/site-footer.html', 'content/settings/logo.json'].map(file => readFileSync(file, 'utf8'));
  for (const directory of ['assets/css', 'js', 'images/logo', 'images/homepage/hero-v2/final', 'images']) {
    const names = readdirSync(directory).filter(name => /^(?:fast-accessible|gpbc-mark|(?:worship|family|community)-480|community-worship-(?:480|800))\.[a-f0-9]{12}\.(?:css|js|webp)$/.test(name));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const path = directory + '/' + name;
      const digest = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
      expect(name).toContain('.' + digest + '.');
      expect(sources.some(source => source.includes(path))).toBe(true);
    }
  }
  const rules = readFileSync('netlify.toml', 'utf8').split('[[headers]]').slice(1);
  for (const path of ['/assets/css/fast-accessible.*.css', '/js/fast-accessible.*.js', '/images/*']) {
    const rule = rules.find(block => block.includes('for = "' + path + '"'));
    expect(rule).toContain('max-age=31536000, immutable');
  }
  expect(rules.find(block => block.includes('for = "/*"'))).toContain('max-age=0, must-revalidate');
});
