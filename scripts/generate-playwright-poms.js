#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'pages');
const GENERATED_DIR = path.join(PAGES_DIR, 'generated');
const REGISTRY_FILE = path.join(PAGES_DIR, 'page-registry.ts');
const INVENTORY_JSON = path.join(ROOT, 'tests', 'data', 'html-pages-inventory.json');
const INVENTORY_MD = path.join(ROOT, 'tests', 'data', 'html-pages-inventory.md');

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.venv',
  'playwright-report',
  'test-results',
  'dist',
  'coverage'
]);

const IMPORTANT_ID_PATTERN = /(hero|title|form|submit|share|calendar|menu|toggle|content|card|btn|button|search|login|signup|donat|prayer|devotion|date|reference|verse|modal)/i;
const SIMPLE_CSS_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const IMPORTANT_CLASSES = [
  'devotion-hero',
  'share-card-trigger',
  'share-card-modal',
  'devotion-container',
  'devotion-share-panel',
  'mobile-menu-btn',
  'nav-links',
  'dropdown-menu',
  'hero',
  'calendar',
  'funnel-card'
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function walkHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.DS_Store')) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walkHtmlFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function toClassName(relativeHtmlPath) {
  const withoutExt = relativeHtmlPath.replace(/\.html$/i, '');
  const segments = withoutExt.split('/').filter(Boolean);

  const pascal = segments
    .map((segment) =>
      segment
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => {
          const normalized = part.toLowerCase();
          return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        })
        .join('')
    )
    .join('');

  return `${pascal || 'Root'}Page`;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return undefined;

  const normalized = match[1].replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function hasFullDocument(html) {
  return /<!doctype\s+html/i.test(html) || /<html[\s>]/i.test(html);
}

function includesTag(html, tagName) {
  return new RegExp(`<${tagName}(\\s|>)`, 'i').test(html);
}

function extractCriticalSelectors(html) {
  const selectors = [];
  const add = (selector) => {
    if (!selector) return;
    if (!selectors.includes(selector)) selectors.push(selector);
  };

  add('body');
  if (includesTag(html, 'header')) add('header');
  if (includesTag(html, 'nav')) add('nav');
  if (includesTag(html, 'main')) add('main');
  if (includesTag(html, 'footer')) add('footer');
  if (includesTag(html, 'form')) add('form');

  const h1WithId = html.match(/<h1[^>]*id=["']([A-Za-z_][A-Za-z0-9_-]*)["'][^>]*>/i);
  if (h1WithId) {
    add(`#${h1WithId[1]}`);
  } else if (/<h1(\s|>)/i.test(html)) {
    add('h1');
  }

  const ids = [...html.matchAll(/id=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((id) => SIMPLE_CSS_ID.test(id) && IMPORTANT_ID_PATTERN.test(id));

  for (const id of ids.slice(0, 4)) {
    add(`#${id}`);
  }

  for (const className of IMPORTANT_CLASSES) {
    const classRegex = new RegExp(`class=["'][^"']*\\b${className}\\b`, 'i');
    if (classRegex.test(html)) {
      add(`.${className}`);
    }
  }

  return selectors.slice(0, 10);
}

function buildClassFile(meta) {
  const classFilePath = path.join(GENERATED_DIR, meta.htmlPath.replace(/\.html$/i, '.page.ts'));
  ensureDir(classFilePath);

  const fromDir = path.dirname(classFilePath);
  let importPath = toPosix(path.relative(fromDir, path.join(PAGES_DIR, 'base-page.ts'))).replace(/\.ts$/i, '');
  if (!importPath.startsWith('.')) {
    importPath = `./${importPath}`;
  }

  const expectedTitleLine = meta.expectedTitle
    ? `  readonly expectedTitle = ${JSON.stringify(meta.expectedTitle)};\n`
    : '';

  const source = `import { BasePage } from '${importPath}';

export class ${meta.className} extends BasePage {
  readonly path = '/${meta.htmlPath}';
  readonly pageName = ${JSON.stringify(meta.htmlPath)};
  readonly isFullDocument = ${meta.isFullDocument};
${expectedTitleLine}  readonly criticalSelectors = ${JSON.stringify(meta.criticalSelectors)};

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
`;

  fs.writeFileSync(classFilePath, source, 'utf8');
}

function buildRegistryFile(metaList) {
  const importLines = metaList
    .map((meta) => {
      const importPath = `./generated/${meta.htmlPath.replace(/\.html$/i, '.page')}`;
      return `import { ${meta.className} } from '${importPath}';`;
    })
    .join('\n');

  const entries = metaList
    .map(
      (meta) => `  {
    htmlPath: ${JSON.stringify(meta.htmlPath)},
    className: ${JSON.stringify(meta.className)},
    isFullDocument: ${meta.isFullDocument},
    expectedTitle: ${meta.expectedTitle ? JSON.stringify(meta.expectedTitle) : 'undefined'},
    create: (page: Page) => new ${meta.className}(page)
  }`
    )
    .join(',\n');

  const source = `import type { Page } from '@playwright/test';
import { BasePage } from './base-page';
${importLines}

export interface PageRegistryEntry {
  htmlPath: string;
  className: string;
  isFullDocument: boolean;
  expectedTitle?: string;
  create: (page: Page) => BasePage;
}

export const pageRegistry: PageRegistryEntry[] = [
${entries}
];

export const htmlPagePaths = pageRegistry.map((entry) => entry.htmlPath);
export const htmlPageCount = pageRegistry.length;

const pageFactoryByPath = new Map(pageRegistry.map((entry) => [entry.htmlPath, entry.create]));

export function createPageByPath(page: Page, htmlPath: string): BasePage {
  const factory = pageFactoryByPath.get(htmlPath);
  if (!factory) {
    throw new Error('No POM registered for path: ' + htmlPath);
  }
  return factory(page);
}
`;

  fs.writeFileSync(REGISTRY_FILE, source, 'utf8');
}

function buildInventoryJson(metaList) {
  ensureDir(INVENTORY_JSON);
  fs.writeFileSync(
    INVENTORY_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalPages: metaList.length,
        pages: metaList
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
}

function buildInventoryMarkdown(metaList) {
  ensureDir(INVENTORY_MD);

  const lines = [
    '# HTML Page Inventory',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total .html files: ${metaList.length}`,
    '',
    '| # | HTML Path | POM Class | Full Document |',
    '|---|---|---|---|'
  ];

  metaList.forEach((meta, index) => {
    lines.push(`| ${index + 1} | \`${meta.htmlPath}\` | \`${meta.className}\` | ${meta.isFullDocument ? 'Yes' : 'No'} |`);
  });

  lines.push('');
  fs.writeFileSync(INVENTORY_MD, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const htmlFiles = walkHtmlFiles(ROOT)
    .map((filePath) => toPosix(path.relative(ROOT, filePath)))
    .sort((a, b) => a.localeCompare(b));

  const metaList = htmlFiles.map((htmlPath) => {
    const abs = path.join(ROOT, htmlPath);
    const html = fs.readFileSync(abs, 'utf8');

    return {
      htmlPath,
      className: toClassName(htmlPath),
      expectedTitle: extractTitle(html),
      isFullDocument: hasFullDocument(html),
      criticalSelectors: extractCriticalSelectors(html)
    };
  });

  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  metaList.forEach(buildClassFile);
  buildRegistryFile(metaList);
  buildInventoryJson(metaList);
  buildInventoryMarkdown(metaList);

  console.log(`Generated ${metaList.length} POM classes and inventory artifacts.`);
}

main();
