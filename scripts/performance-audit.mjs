import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const manifestPath = path.join(rootDir, 'config', 'seo-pages.json');

const LARGE_IMAGE_BYTES = 1_000_000;
const LARGE_SCRIPT_BYTES = 500_000;
const LARGE_STYLESHEET_BYTES = 250_000;
const warnings = [];
const infos = [];

function warn(message) {
  warnings.push(message);
}

function info(message) {
  infos.push(message);
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2]?.trim() ?? null;
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function localPathForReference(rawReference, pageFile) {
  const reference = stripQueryAndHash(rawReference || '').trim();
  if (!reference || /^(?:https?:|\/\/|data:|blob:|mailto:|tel:|javascript:)/i.test(reference)) return null;
  if (reference.startsWith('/')) return path.normalize(path.join(rootDir, reference.replace(/^\/+/, '')));
  const pageDir = path.dirname(pageFile);
  return path.normalize(path.join(rootDir, pageDir, reference));
}

function relativeRootPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function formatBytes(bytes) {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function checkDuplicateAssets(pageFile, html) {
  const scriptSources = new Map();
  for (const tag of tags(html, 'script')) {
    const src = attribute(tag, 'src');
    if (!src || /^(?:https?:|\/\/)/i.test(src)) {
      if (!src) continue;
    }
    const key = stripQueryAndHash(src);
    const count = (scriptSources.get(key) || 0) + 1;
    scriptSources.set(key, count);
    if (count === 2) warn(`${pageFile}: duplicate script include ${key}`);
  }

  const stylesheetSources = new Map();
  for (const tag of tags(html, 'link')) {
    if (!/\bstylesheet\b/i.test(attribute(tag, 'rel') || '')) continue;
    const href = attribute(tag, 'href');
    if (!href) continue;
    const key = stripQueryAndHash(href);
    const count = (stylesheetSources.get(key) || 0) + 1;
    stylesheetSources.set(key, count);
    if (count === 2) warn(`${pageFile}: duplicate stylesheet include ${key}`);
  }
}

function checkImageDimensions(pageFile, html) {
  for (const tag of tags(html, 'img')) {
    const src = attribute(tag, 'src');
    const localPath = src ? localPathForReference(src, pageFile) : null;
    if (!localPath || !fs.existsSync(localPath)) continue;
    if (/\.svg$/i.test(stripQueryAndHash(src))) continue;
    const hasWidth = attribute(tag, 'width');
    const hasHeight = attribute(tag, 'height');
    if (!hasWidth || !hasHeight) {
      warn(`${pageFile}: image is missing intrinsic width/height (${src})`);
    }
  }
}

function checkReferencedAssetSizes(pageFile, html) {
  const references = [
    ...tags(html, 'script').map((tag) => ({ kind: 'JavaScript', raw: attribute(tag, 'src'), limit: LARGE_SCRIPT_BYTES })),
    ...tags(html, 'link')
      .filter((tag) => /\bstylesheet\b/i.test(attribute(tag, 'rel') || ''))
      .map((tag) => ({ kind: 'CSS', raw: attribute(tag, 'href'), limit: LARGE_STYLESHEET_BYTES })),
    ...tags(html, 'img').map((tag) => ({ kind: 'image', raw: attribute(tag, 'src'), limit: LARGE_IMAGE_BYTES }))
  ];

  const seen = new Set();
  for (const reference of references) {
    if (!reference.raw) continue;
    const localPath = localPathForReference(reference.raw, pageFile);
    if (!localPath || seen.has(localPath) || !fs.existsSync(localPath)) continue;
    seen.add(localPath);
    const size = fs.statSync(localPath).size;
    if (size > reference.limit) {
      warn(`${pageFile}: ${reference.kind} asset exceeds ${formatBytes(reference.limit)} (${relativeRootPath(localPath)} is ${formatBytes(size)})`);
    }
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function checkLargeImageInventory() {
  const imageExtensions = /\.(?:avif|bmp|gif|jpe?g|png|webp)$/i;
  for (const filePath of walkFiles(path.join(rootDir, 'images'))) {
    if (!imageExtensions.test(filePath)) continue;
    const size = fs.statSync(filePath).size;
    if (size > LARGE_IMAGE_BYTES) {
      warn(`images inventory: large raster asset ${relativeRootPath(filePath)} is ${formatBytes(size)}`);
    }
  }
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`[performance-audit] Cannot parse ${relativeRootPath(manifestPath)}: ${error.message}`);
  process.exitCode = 1;
}

if (manifest) {
  const approvedPages = Array.isArray(manifest.pages)
    ? manifest.pages.filter((page) => page && page.index === true)
    : [];

  for (const page of approvedPages) {
    const pagePath = path.join(rootDir, page.file);
    if (!fs.existsSync(pagePath)) {
      warn(`${page.file}: approved page file is missing`);
      continue;
    }
    const html = fs.readFileSync(pagePath, 'utf8');
    checkDuplicateAssets(page.file, html);
    checkImageDimensions(page.file, html);
    checkReferencedAssetSizes(page.file, html);
  }

  const homepage = path.join(rootDir, 'index.html');
  if (fs.existsSync(homepage) && /hero-worship-authentic\.png/i.test(fs.readFileSync(homepage, 'utf8'))) {
    warn('index.html: obsolete hero-worship-authentic.png preload/reference remains');
  } else {
    info('index.html: obsolete hero-worship-authentic.png preload is absent');
  }

  checkLargeImageInventory();
  info(`Audited ${approvedPages.length} approved HTML routes with warning-only thresholds.`);
}

for (const message of infos) console.log(`INFO: ${message}`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
console.log(`[performance-audit] ${warnings.length} warning(s), ${infos.length} info item(s); no thresholds are release-blocking.`);
