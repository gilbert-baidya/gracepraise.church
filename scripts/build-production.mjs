import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PUBLICATION_DIRECTORY = 'public-build';
const EXCLUDED_DIRECTORIES = new Set([
    'worship-studio', 'test', 'tests', 'node_modules', 'functions', 'scripts', 'tools',
    'pages', 'docs', 'qa', 'audit_screenshots', 'visual-audit-results',
    'test-results', 'playwright-report', 'blob-report', 'coverage',
    'session-state', 'copilot', 'public-build', 'dist', 'src', 'tmp', 'temp',
    'logs', 'cache', 'backups', 'scratch'
]);
const WEB_EXTENSIONS = new Set([
    '.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.png',
    '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.mp4', '.webm',
    '.mp3', '.wav', '.ogg', '.pdf', '.woff', '.woff2', '.ttf', '.otf', '.webmanifest'
]);
const ROOT_DEVELOPMENT_FILES = new Set([
    'package.json', 'package-lock.json', 'firebase.json', 'firestore.indexes.json',
    'tsconfig.json', 'GoogleAppsScript.js', 'GOOGLE_APPS_SCRIPT_SECURITY_TEMPLATE.js',
    'SAMPLE_TELEMETRY_OUTPUT.js', 'check_styles.js', 'dump-footer-styles.js',
    'trace_css.js', 'screenshot.js', 'devotion-screenshot.js',
    'devotion-screenshot-dark.js', 'footer-screenshot.js'
]);
const STUDIO_NAMES = /(?:worship-studio|studio-app\.mjs|studio\.css|chord-propagation\.mjs|presentation-modes\.mjs|slide-export\.mjs)/iu;
const DEVELOPMENT_NAME = /(?:^test[-_.]|[-_.]tests?\.(?:html|js|mjs|json)$|[-_]SAMPLE\.|[-_]TEMPLATE\.|\.backup|\.bak(?:$|[.-])|\.tmp$|\.temp$|\.log$|\.map$)/iu;
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.md', '.yml']);

export function validateRelativePath(relative) {
    if (typeof relative !== 'string' || !relative || relative.includes('\\')
        || /[\u0000-\u001f]/u.test(relative) || path.posix.isAbsolute(relative)
        || /^[a-z]:/iu.test(relative)
        || relative.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new Error(`Unsafe publication path: ${JSON.stringify(relative)}`);
    }
    return relative;
}

export function isProductionFile(relative) {
    validateRelativePath(relative);
    const parts = relative.split('/');
    const lowerParts = parts.map(part => part.toLowerCase());
    const name = parts.at(-1);
    if (lowerParts.some(part => part.startsWith('.') || EXCLUDED_DIRECTORIES.has(part))
        || relative.startsWith('services/ai/')
        || ['config/ai-providers.config.js', 'config/devotion-image-config.json', 'config/seo-pages.json'].includes(relative)
        || lowerParts.some(part => /(?:^|[-_])(?:fixtures?|playwright|test-results|screenshots?)(?:$|[-_])/u.test(part))
        || STUDIO_NAMES.test(relative) || DEVELOPMENT_NAME.test(name)
        || /(?:secret|credential|service[-_]?account|private[-_]?key)/iu.test(name)) return false;
    if (parts.length === 1 && (ROOT_DEVELOPMENT_FILES.has(name)
        || (name.endsWith('.txt') && /^[A-Z_0-9.-]+$/u.test(name)))) return false;
    if (relative === 'admin/config.yml') return true;
    if (path.posix.extname(name).toLowerCase() === '.md') return parts[0] === 'content';
    return WEB_EXTENSIONS.has(path.posix.extname(name).toLowerCase());
}

async function assertRegularFile(root, relative) {
    let current = root;
    for (const part of relative.split('/')) {
        current = path.join(current, part);
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) throw new Error(`Symlink is not allowed in publication: ${relative}`);
    }
    if (!(await fs.lstat(current)).isFile()) throw new Error(`Not a regular publication file: ${relative}`);
    return current;
}

async function listFiles(root, prefix = '', publication = false) {
    const files = [];
    for (const entry of (await fs.readdir(path.join(root, prefix), { withFileTypes: true }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        validateRelativePath(relative);
        if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in publication: ${relative}`);
        if (entry.isDirectory()) {
            if (publication && !isProductionFile(`${relative}/__directory_check__.html`)) {
                throw new Error(`Excluded directory found in publication: ${relative}`);
            }
            files.push(...await listFiles(root, relative, publication));
        }
        else if (entry.isFile()) files.push(relative);
        else throw new Error(`Unsupported publication entry: ${relative}`);
    }
    return files;
}

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function studioAssetHashes(root) {
    const studio = path.join(root, 'worship-studio');
    try {
        if ((await fs.lstat(studio)).isSymbolicLink()) throw new Error('Studio source must not be a symlink.');
    } catch (error) {
        if (error.code === 'ENOENT') return new Set();
        throw error;
    }
    const hashes = new Set();
    for (const relative of await listFiles(studio)) {
        if (/\.(?:html|css|mjs|js)$/iu.test(relative)) {
            hashes.add(digest(await fs.readFile(await assertRegularFile(studio, relative))));
        }
    }
    return hashes;
}

export async function verifyProductionArtifact(output, { sourceRoot, expectedFiles } = {}) {
    if ((await fs.lstat(output)).isSymbolicLink()) throw new Error('Publication directory must not be a symlink.');
    const files = await listFiles(output, '', true);
    const studioHashes = sourceRoot ? await studioAssetHashes(sourceRoot) : new Set();
    for (const relative of files) {
        if (!isProductionFile(relative)) throw new Error(`Excluded file found in publication: ${relative}`);
        const bytes = await fs.readFile(path.join(output, relative));
        if (studioHashes.has(digest(bytes))) throw new Error(`Copied Studio asset found at alternate path: ${relative}`);
        if (TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase()) && STUDIO_NAMES.test(bytes.toString('utf8'))) {
            throw new Error(`Studio reference/content found in publication: ${relative}`);
        }
        if (expectedFiles && !expectedFiles.has(relative)) throw new Error(`Unexpected publication file: ${relative}`);
    }
    if (expectedFiles && (files.length !== expectedFiles.size || files.some(file => !expectedFiles.has(file)))) {
        throw new Error('Publication inventory does not match the selected source files.');
    }
    return files;
}

export async function assembleProduction({ root, trackedFiles, verify = verifyProductionArtifact }) {
    root = await fs.realpath(root);
    const output = path.join(root, PUBLICATION_DIRECTORY);
    const files = [...new Set(trackedFiles.map(validateRelativePath))].filter(isProductionFile).sort();
    if (!files.includes('index.html')) throw new Error('Publication source must contain the homepage.');
    for (const relative of files) await assertRegularFile(root, relative);
    try {
        const stat = await fs.lstat(output);
        if (stat.isSymbolicLink()) throw new Error('Publication directory must not be a symlink.');
        if (!stat.isDirectory()) throw new Error('Publication output must be a directory; existing file was not changed.');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    // Only this fixed generated directory is replaced; source files are never removed.
    await fs.rm(output, { recursive: true, force: true });
    await fs.mkdir(output);
    try {
        for (const relative of files) {
            const source = await assertRegularFile(root, relative);
            const target = path.join(output, relative);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.copyFile(source, target);
        }
        await verify(output, { sourceRoot: root, expectedFiles: new Set(files) });
        return { output, files };
    } catch (error) {
        await fs.rm(output, { recursive: true, force: true });
        throw error;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const trackedFiles = execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: root })
        .toString('utf8').split('\0').filter(Boolean);
    const { files } = await assembleProduction({ root, trackedFiles });
    console.log(`Production artifact: ${PUBLICATION_DIRECTORY}/ (${files.length} files). Studio and development files excluded.`);
}
