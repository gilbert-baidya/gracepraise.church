#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const configPath = path.join(rootDir, 'config', 'site-footer.config.json');

function isExternalHref(href) {
  return /^https?:\/\//i.test(href || '');
}

function isSpecialHref(href) {
  return /^(mailto:|tel:|#)/i.test(href || '');
}

function internalTargetExists(href) {
  const cleanHref = String(href || '')
    .split('#')[0]
    .split('?')[0]
    .replace(/^\/+/, '')
    .replace(/^\.\//, '');

  if (!cleanHref) return true;

  const absolute = path.resolve(rootDir, cleanHref);
  if (fs.existsSync(absolute)) return true;
  if (fs.existsSync(`${absolute}.html`)) return true;
  if (fs.existsSync(path.join(absolute, 'index.html'))) return true;

  return false;
}

function collectLinks(config) {
  const ctaLinks = Array.isArray(config?.cta?.links) ? config.cta.links : [];
  const resources = Array.isArray(config?.resources) ? config.resources : [];
  const legal = Array.isArray(config?.legal) ? config.legal : [];
  const social = Array.isArray(config?.social) ? config.social : [];
  const directions = config?.visit?.directionsUrl
    ? [{ label: 'Get Directions', href: config.visit.directionsUrl, external: true }]
    : [];

  return [...ctaLinks, ...resources, ...legal, ...social, ...directions];
}

function main() {
  if (!fs.existsSync(configPath)) {
    console.error(`[footer-link-check] Missing config file: ${configPath}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const links = collectLinks(config);
  const failures = [];

  for (const link of links) {
    const label = link?.label || '(missing label)';
    const href = link?.href || '';

    if (!label || !href) {
      failures.push(`Invalid link entry: label="${label}" href="${href}"`);
      continue;
    }

    if (isSpecialHref(href)) {
      continue;
    }

    if (isExternalHref(href)) {
      if (!href.startsWith('https://')) {
        failures.push(`External link must use https:// -> ${href}`);
      }
      continue;
    }

    if (!internalTargetExists(href)) {
      failures.push(`Missing internal route for footer link "${label}": ${href}`);
    }
  }

  if (failures.length > 0) {
    console.error('[footer-link-check] FAIL');
    failures.forEach((message) => console.error(`  - ${message}`));
    process.exit(1);
  }

  console.log(`[footer-link-check] PASS (${links.length} links validated)`);
}

main();
