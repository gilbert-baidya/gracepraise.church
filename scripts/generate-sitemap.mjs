import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const manifestPath = path.join(rootDir, 'config', 'seo-pages.json');
const sitemapPath = path.join(rootDir, 'sitemap.xml');

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.pages)) {
    throw new Error('config/seo-pages.json must contain a pages array');
  }

  let baseUrl;
  try {
    baseUrl = new URL(manifest.baseUrl);
  } catch {
    throw new Error('config/seo-pages.json contains an invalid baseUrl');
  }
  if (baseUrl.protocol !== 'https:' || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    throw new Error('baseUrl must be an HTTPS origin without a path, query, or hash');
  }

  const seenUrls = new Set();
  const pages = manifest.pages.filter((page) => page.index === true);
  for (const page of pages) {
    if (!page || typeof page.file !== 'string' || typeof page.url !== 'string') {
      throw new Error('Every indexable manifest page needs file and url strings');
    }
    if (!page.url.startsWith('/') || page.url.includes('?') || page.url.includes('#')) {
      throw new Error(`Invalid route in manifest: ${page.url}`);
    }
    if (seenUrls.has(page.url)) {
      throw new Error(`Duplicate manifest URL: ${page.url}`);
    }
    seenUrls.add(page.url);

    const filePath = path.join(rootDir, page.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Manifest file does not exist: ${page.file}`);
    }
    const html = fs.readFileSync(filePath, 'utf8');
    if (/<meta[^>]+http-equiv=["']?refresh|window\.location\.(?:replace|assign)\s*\(/i.test(html)) {
      throw new Error(`Redirect-only page cannot be indexable: ${page.file}`);
    }
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) {
      throw new Error(`Noindex page cannot be indexable: ${page.file}`);
    }
  }

  return { baseUrl: baseUrl.origin, pages };
}

const { baseUrl, pages } = loadManifest();
const urls = pages.map((page) => `${baseUrl}${page.url}`);
const body = urls
  .map((url) => `  <url>\n    <loc>${xmlEscape(url)}</loc>\n  </url>`)
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
fs.writeFileSync(sitemapPath, sitemap);
console.log(`Generated sitemap.xml with ${pages.length} approved indexable URLs.`);
