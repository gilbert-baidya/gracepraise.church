import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';

const root = pathToFileURL(resolve('.') + sep);
const config = readFileSync(new URL('netlify.toml', root), 'utf8');
const rules = config.split('[[redirects]]').slice(1).map(block => ({
    from: block.match(/^\s*from\s*=\s*"([^"]+)"/m)?.[1],
    to: block.match(/^\s*to\s*=\s*"([^"]+)"/m)?.[1],
    status: Number(block.match(/^\s*status\s*=\s*(\d+)/m)?.[1]),
    force: /^\s*force\s*=\s*true\s*$/m.test(block)
}));
const host = 'https://admin.gracepraise.church';
const fallback = rules.findIndex(rule => rule.from === host + '/*');

test('admin shared language assets precede the forced application rewrite', async () => {
    assert.ok(fallback >= 0);
    const paths = ['/assets/css/site-language.css', '/js/site-language.js', '/assets/fonts/*'];
    for (const path of paths) {
        const index = rules.findIndex(rule => rule.from === host + path);
        assert.ok(index >= 0 && index < fallback, path);
        assert.deepEqual(rules[index], { from: host + path, to: path.replace('*', ':splat'), status: 200, force: true });
    }
    assert.equal(rules[fallback].to, '/admin/v21/:splat');
    const admin = await fs.readFile(new URL('admin/v21/index.html', root), 'utf8');
    for (const path of paths.slice(0, 2)) {
        assert.ok(admin.includes('"' + path + '"'));
        assert.ok((await fs.stat(new URL(path.slice(1), root))).isFile());
    }
});

test('all shared-language font URLs stay inside the published font exception', async () => {
    const cssUrl = new URL('assets/css/site-language.css', root);
    const css = await fs.readFile(cssUrl, 'utf8');
    const fonts = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map(match => new URL(match[1], cssUrl));
    assert.doesNotMatch(css, /@import\b/);
    assert.deepEqual(fonts.map(font => font.pathname.split('/').pop()).sort(), [
        'inter-400.woff2', 'inter-600.woff2', 'lora-400.woff2',
        'notosansbengali-400.woff2', 'notosansbengali-600.woff2'
    ]);
    for (const font of fonts) {
        assert.ok(font.href.startsWith(new URL('assets/fonts/', root).href));
        assert.ok((await fs.stat(font)).isFile());
    }
});
