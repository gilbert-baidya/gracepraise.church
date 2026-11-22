import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const references = ['index.html', 'plan-visit.html', 'give.html', 'calendar.html', 'partials/site-footer.html', 'content/settings/logo.json'];
const assets = [
    ['assets/css', 'fast-accessible', 'css'],
    ['js', 'fast-accessible', 'js'],
    ['images/logo', 'gpbc-mark', 'webp'],
    ...['worship', 'family', 'community'].map(name => ['images/homepage/hero-v2/final', name + '-480', 'webp']),
    ...['480', '800'].map(size => ['images', 'community-worship-' + size, 'webp'])
];
const sources = new Map(await Promise.all(references.map(async file => [file, await fs.readFile(path.join(root, file), 'utf8')])));
for (const [directory, base, extension] of assets) {
    const candidates = (await fs.readdir(path.join(root, directory))).filter(name => name.startsWith(base + '.') && name.endsWith('.' + extension));
    if (candidates.length !== 1) throw new Error('Expected one asset for ' + base);
    const oldPath = directory + '/' + candidates[0];
    const bytes = await fs.readFile(path.join(root, oldPath));
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const newPath = directory + '/' + base + '.' + digest + '.' + extension;
    if (oldPath !== newPath) await fs.rename(path.join(root, oldPath), path.join(root, newPath));
    for (const [file, source] of sources) sources.set(file, source.replaceAll(oldPath, newPath));
    console.log(newPath);
}
for (const [file, source] of sources) await fs.writeFile(path.join(root, file), source);
