import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assembleProduction, isProductionFile, verifyProductionArtifact } from '../scripts/build-production.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t, entries = { 'index.html': '<h1>Home</h1>' }) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gpbc-production-test-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    for (const [relative, content] of Object.entries(entries)) {
        await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
        await fs.writeFile(path.join(root, relative), content);
    }
    return root;
}

test('publication selects web runtime/CMS content, not development or private files', () => {
    for (const file of ['index.html', 'songbook-app.js', 'admin/v21/admin-auth.js', 'admin/config.yml',
        'content/gallery/20251217-dewri-family.md', 'data/bible/index/niv1984.json',
        'services/bible/bible-service.js', 'images/logo-gpbc-test-no-bg.svg', 'manifest.json',
        'share-panel-verification.js']) {
        assert.equal(isProductionFile(file), true, file);
    }
    for (const file of ['worship-studio/index.html', 'bible-slide-builder/index.html',
        'bible-slide-builder/scripture-layout.mjs', 'data/bible/source/en-niv-1984.xml',
        'data/bible/source/bn-bsi-2016-ov.xml', 'tests/example.js', 'node_modules/lib.js',
        '.github/workflows/ci.yml', '.git/config', '.env', '.env.production', 'functions/index.js',
        'scripts/build-production.mjs', 'pages/index.ts', 'docs/guide.md', 'package.json',
        'test-dashboard.html', 'HOME_PAGE_TEST.html', 'js/smart-share-ai-tests.js',
        'audit_screenshots/image.png', 'test-results/trace.zip', 'app.js.map', 'app.js.bak',
        'private-key.pem', 'public-build/index.html', '.copilot/example.json', 'foo/fixtures/song.json',
        'services/ai/openai-provider.js', 'config/ai-providers.config.js',
        'test/example.js', 'src/dev.js', 'tmp/example.json', 'scratch/review.html']) {
        assert.equal(isProductionFile(file), false, file);
    }
});

test('production assembly preserves content bytes and replaces stale generated files', async t => {
    const entries = { 'index.html': '<h1>Home</h1>', 'about.html': 'About',
        'admin/config.yml': 'backend: git-gateway', 'worship-studio/index.html': 'LOCAL STUDIO',
        'bible-slide-builder/index.html': 'LOCAL BIBLE BUILDER',
        'data/bible/source/en-niv-1984.xml': '<XMLBIBLE>PRIVATE AUTHORITATIVE SOURCE</XMLBIBLE>',
        '.env': 'SECRET', 'tests/fixture.json': '{}', 'node_modules/library.js': 'DEV' };
    const root = await fixture(t, entries);
    const first = await assembleProduction({ root, trackedFiles: Object.keys(entries) });
    await fs.writeFile(path.join(first.output, 'stale.html'), 'STALE');
    const second = await assembleProduction({ root, trackedFiles: Object.keys(entries) });
    assert.deepEqual(first.files, second.files);
    for (const file of second.files) assert.equal(await fs.readFile(path.join(second.output, file), 'utf8'), entries[file]);
    await assert.rejects(fs.access(path.join(second.output, 'stale.html')));
    assert.equal(await fs.readFile(path.join(root, 'worship-studio/index.html'), 'utf8'), 'LOCAL STUDIO');
    assert.equal(await fs.readFile(path.join(root, 'bible-slide-builder/index.html'), 'utf8'), 'LOCAL BIBLE BUILDER');
    assert.equal(await fs.readFile(path.join(root, 'data/bible/source/en-niv-1984.xml'), 'utf8'), '<XMLBIBLE>PRIVATE AUTHORITATIVE SOURCE</XMLBIBLE>');
});

test('unsafe inventory paths cannot escape the source or publication directory', async t => {
    const root = await fixture(t);
    for (const unsafe of ['../outside.html', '/tmp/outside.html', 'C:/outside.html',
        'folder/../../index.html', 'folder\\index.html', './index.html', 'a//b.html']) {
        await assert.rejects(assembleProduction({ root, trackedFiles: ['index.html', unsafe] }), /Unsafe publication path/);
    }
});

test('file and parent-directory symlinks cannot include excluded/outside content', async t => {
    const root = await fixture(t, { 'index.html': 'HOME', 'worship-studio/studio-app.mjs': 'STUDIO' });
    await fs.symlink(path.join(root, 'worship-studio/studio-app.mjs'), path.join(root, 'renamed.js'));
    await assert.rejects(assembleProduction({ root, trackedFiles: ['index.html', 'renamed.js'] }), /Symlink/);
    await fs.symlink(path.join(root, 'worship-studio'), path.join(root, 'assets'));
    await assert.rejects(assembleProduction({ root, trackedFiles: ['index.html', 'assets/renamed.js'] }), /Symlink/);
});

test('a symlinked output directory is never replaced', async t => {
    const root = await fixture(t, { 'index.html': 'HOME', 'keep/index.html': 'KEEP' });
    await fs.symlink(path.join(root, 'keep'), path.join(root, 'public-build'));
    await assert.rejects(assembleProduction({ root, trackedFiles: ['index.html'] }), /symlink/);
    assert.equal(await fs.readFile(path.join(root, 'keep/index.html'), 'utf8'), 'KEEP');
});

test('an existing non-directory output is never removed', async t => {
    const root = await fixture(t, { 'index.html': 'HOME', 'public-build': 'KEEP' });
    await assert.rejects(assembleProduction({ root, trackedFiles: ['index.html'] }), /must be a directory/);
    assert.equal(await fs.readFile(path.join(root, 'public-build'), 'utf8'), 'KEEP');
});

test('verification rejects local-tool paths, references, alternate copies and artifact symlinks', async t => {
    const root = await fixture(t, {
        'index.html': 'HOME',
        'worship-studio/studio-app.mjs': 'unique local app bytes',
        'bible-slide-builder/scripture-layout.mjs': 'unique Bible local app bytes'
    });
    const { output } = await assembleProduction({ root, trackedFiles: ['index.html'] });
    await fs.mkdir(path.join(output, 'worship-studio'));
    await fs.writeFile(path.join(output, 'worship-studio/index.html'), 'LEAK');
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /Excluded directory/);
    await fs.rm(path.join(output, 'worship-studio'), { recursive: true });
    await fs.writeFile(path.join(output, 'renamed.js'), 'unique local app bytes');
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /alternate path/);
    await fs.writeFile(path.join(output, 'renamed.js'), 'import("./chord-propagation.mjs")');
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /Local-tool reference/);
    await fs.writeFile(path.join(output, 'renamed.js'), 'unique Bible local app bytes');
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /alternate path/);
    await fs.writeFile(path.join(output, 'renamed.js'), 'import(".\/scripture-layout.mjs")');
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /Local-tool reference/);
    await fs.unlink(path.join(output, 'renamed.js'));
    await fs.symlink(path.join(root, 'index.html'), path.join(output, 'alias.html'));
    await assert.rejects(verifyProductionArtifact(output, { sourceRoot: root }), /Symlink/);
});

test('a future accidental Studio copy fails the build and leaves no deployable artifact', async t => {
    const root = await fixture(t, { 'index.html': 'HOME' });
    await assert.rejects(assembleProduction({
        root, trackedFiles: ['index.html'],
        verify: async (output, options) => {
            await fs.mkdir(path.join(output, 'worship-studio'));
            await fs.writeFile(path.join(output, 'worship-studio/index.html'), 'LEAK');
            return verifyProductionArtifact(output, options);
        }
    }), /Excluded directory/);
    await assert.rejects(fs.access(path.join(root, 'public-build')));
});

test('real production artifact includes major site routes/assets and excludes all Studio/dev paths', async () => {
    execFileSync(process.execPath, ['scripts/build-production.mjs'], { cwd: repository, stdio: 'pipe' });
    const output = path.join(repository, 'public-build');
    const files = await verifyProductionArtifact(output, { sourceRoot: repository });
    for (const required of ['index.html', 'songbook.html', 'admin/index.html', 'admin/config.yml',
        'admin/v21/index.html', 'admin/v21/admin-auth.js', 'about.html', 'ministries.html', 'give.html',
        'prayer-request.html', 'plan-visit.html', 'daily-devotion.html', 'calendar.html',
        'assets/css/homepage-readability-upgrade.css', 'songs-data.js', 'songs-catalog.js',
        'song-chord-alignments.js', 'english-songbook-data.js', 'sw.js', 'robots.txt', 'sitemap.xml',
        'shared/website-control-runtime.js', 'data/bible/index/niv1984.json', 'content/settings/logo.json']) {
        assert.ok(files.includes(required), required);
        assert.deepEqual(await fs.readFile(path.join(output, required)), await fs.readFile(path.join(repository, required)));
    }
    assert.ok(files.every(isProductionFile));
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repository }).toString().split('\0').filter(Boolean);
    assert.deepEqual([...files].sort(), tracked.filter(isProductionFile).sort());
    const published = new Set(files);
    const sourceFiles = new Set(tracked);
    for (const file of files.filter(file => /\.(?:html|css|js|mjs)$/u.test(file))) {
        const text = await fs.readFile(path.join(repository, file), 'utf8');
        const references = /(?:\b(?:src|href)\s*=\s*|\bfrom\s*|\bimport\s*\(\s*|\bfetch\s*\(\s*|\burl\(\s*)["']([^"']+)["']/gu;
        for (const match of text.matchAll(references)) {
            const reference = match[1].split(/[?#]/u)[0];
            if (!reference || /^(?:[a-z]+:|\/\/)/iu.test(reference) || reference.includes('${')) continue;
            const target = reference.startsWith('/') ? reference.slice(1)
                : path.posix.normalize(path.posix.join(path.posix.dirname(file), reference));
            if (sourceFiles.has(target)) assert.ok(published.has(target), `${file} requires excluded asset ${target}`);
        }
    }
    const config = await fs.readFile(path.join(repository, 'netlify.toml'), 'utf8');
    assert.ok(!files.some(file => file.startsWith('worship-studio/')));
    assert.ok(!files.some(file => file.startsWith('bible-slide-builder/')));
    assert.ok(!files.some(file => file.startsWith('data/bible/source/')));
    assert.equal((config.match(/publish = "public-build"/gu) || []).length, 3);
    assert.ok(config.includes('command = "npm run build:production"'));
    assert.ok(!config.includes('publish = "."'));
});
