import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const manifestPath = path.join(rootDir, 'config', 'seo-pages.json');
const sitemapPath = path.join(rootDir, 'sitemap.xml');

const errors = [];
const warnings = [];
const infos = [];
let siteOrigin = null;
const add = (level, message) => ({ error: errors, warning: warnings, info: infos }[level].push(message));

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2]?.trim() ?? null;
}

function hasAttribute(tag, name) {
  return new RegExp(`\\b${name}\\s*=`, 'i').test(tag);
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim());
}

function walkJsonLd(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walkJsonLd(item, visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) walkJsonLd(child, visit);
}

function typeNames(entity) {
  return new Set(Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']]);
}

function isOrganizationEntity(entity) {
  const types = typeNames(entity);
  return ['Church', 'Organization', 'NGO', 'LocalBusiness'].some((type) => types.has(type));
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasPreviewOrLocalHost(value) {
  return /(?:netlify\.app|localhost|127\.0\.0\.1)/i.test(value);
}

function hasPlaceholderPhone(value) {
  return typeof value === 'string' && /(?:909[-.\s]?555[-.\s]?0100|\b\d{3}[-.\s]?555[-.\s]?\d{4}\b)/i.test(value);
}

function textContent(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function localFileForPath(urlPath, routeToFile) {
  const normalized = stripQueryAndHash(urlPath || '/');
  if (routeToFile.has(normalized)) return routeToFile.get(normalized);

  let relative = normalized.replace(/^\/+/, '');
  if (relative === '') relative = 'index.html';
  if (relative.endsWith('/')) relative += 'index.html';
  if (!path.extname(relative)) relative += '.html';
  return relative;
}

function resolveLocalTarget(rawHref, currentFile, routeToFile) {
  const href = rawHref.trim();
  if (!href || href.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href);
    if (url.origin !== siteOrigin) return null;
    return localFileForPath(url.pathname, routeToFile);
  }
  if (href.startsWith('//')) return null;

  if (href.startsWith('/')) return localFileForPath(href, routeToFile);
  const currentDir = path.posix.dirname(currentFile.replaceAll(path.sep, '/'));
  const target = path.posix.normalize(path.posix.join(currentDir, stripQueryAndHash(href)));
  return localFileForPath(target, routeToFile);
}

function readManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    add('error', `Cannot parse config/seo-pages.json: ${error.message}`);
    return null;
  }
  if (!manifest || typeof manifest.baseUrl !== 'string' || !Array.isArray(manifest.pages)) {
    add('error', 'Manifest must contain baseUrl and pages.');
    return null;
  }
  let parsedBase;
  try {
    parsedBase = new URL(manifest.baseUrl);
  } catch {
    add('error', `Manifest baseUrl is invalid: ${manifest.baseUrl}`);
    return null;
  }
  if (parsedBase.protocol !== 'https:' || parsedBase.pathname !== '/' || parsedBase.search || parsedBase.hash) {
    add('error', 'Manifest baseUrl must be the HTTPS production origin only.');
  }

  const seenUrls = new Set();
  const routeToFile = new Map();
  for (const page of manifest.pages) {
    if (!page || typeof page.file !== 'string' || typeof page.url !== 'string' || typeof page.index !== 'boolean') {
      add('error', 'Every manifest page needs file, url, and boolean index fields.');
      continue;
    }
    if (seenUrls.has(page.url)) add('error', `Duplicate manifest URL: ${page.url}`);
    seenUrls.add(page.url);
    routeToFile.set(page.url, page.file);
    const filePath = path.join(rootDir, page.file);
    if (!fs.existsSync(filePath)) add('error', `Manifest file does not exist: ${page.file}`);
  }
  return { manifest, baseOrigin: parsedBase.origin, routeToFile };
}

function readSitemap() {
  let xml;
  try {
    xml = fs.readFileSync(sitemapPath, 'utf8');
  } catch (error) {
    add('error', `Cannot read sitemap.xml: ${error.message}`);
    return [];
  }
  if (!/^\s*<\?xml[\s\S]*<urlset\b/i.test(xml) || !/<\/urlset>\s*$/i.test(xml)) {
    add('error', 'sitemap.xml is not a recognizable urlset document.');
  }
  const urls = [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
  const unique = new Set();
  for (const url of urls) {
    if (unique.has(url)) add('error', `Duplicate sitemap URL: ${url}`);
    unique.add(url);
    try {
      const parsed = new URL(url);
      if (parsed.origin !== siteOrigin) add('error', `Non-production sitemap URL: ${url}`);
      if (parsed.protocol !== 'https:') add('error', `Non-HTTPS sitemap URL: ${url}`);
      if (/netlify\.app|localhost|127\.0\.0\.1/i.test(url)) add('error', `Preview/local sitemap URL: ${url}`);
    } catch {
      add('error', `Malformed sitemap URL: ${url}`);
    }
  }
  return urls;
}

const context = readManifest();
if (context) {
  const { manifest, baseOrigin, routeToFile } = context;
  siteOrigin = baseOrigin;
  const sitemapUrls = readSitemap();
  const approved = manifest.pages.filter((page) => page.index === true);
  const approvedUrls = approved.map((page) => `${baseOrigin}${page.url}`);
  const sitemapSet = new Set(sitemapUrls);
  const approvedSet = new Set(approvedUrls);

  for (const url of sitemapUrls) {
    if (!approvedSet.has(url)) add('error', `Sitemap URL is not an approved indexable route: ${url}`);
  }
  for (const url of approvedUrls) {
    if (!sitemapSet.has(url)) add('error', `Approved indexable route is missing from sitemap: ${url}`);
  }

  const titleMap = new Map();
  const descriptionMap = new Map();
  const canonicalMap = new Map();
  const organizationEntities = [];
  const expectedChurchId = `${baseOrigin}/#church`;
  const expectedChurchUrl = `${baseOrigin}/`;
  const expectedChurchName = 'Grace and Praise Bangladeshi Church';
  const expectedChurchPhone = '+1-909-763-0454';
  const expectedWebsiteId = baseOrigin + '/#website';
  const jsonLdUrlFields = new Set(['url', '@id', 'image', 'logo', 'sameAs', 'eventStatus', 'eventAttendanceMode', 'availability', 'contentUrl']);
  for (const page of approved) {
    const html = fs.readFileSync(path.join(rootDir, page.file), 'utf8');
    const titleTags = tags(html, 'title');
    const title = titleTags.length === 1 ? textContent(html.slice(html.indexOf(titleTags[0]) + titleTags[0].length, html.indexOf('</title>', html.indexOf(titleTags[0])))) : null;
    const descriptionTags = tags(html, 'meta').filter((tag) => /^description$/i.test(attribute(tag, 'name') || ''));
    const canonicalTags = tags(html, 'link').filter((tag) => /\bcanonical\b/i.test(attribute(tag, 'rel') || ''));
    const robotsTags = tags(html, 'meta').filter((tag) => /^robots$/i.test(attribute(tag, 'name') || ''));
    const ogTags = new Set(tags(html, 'meta').map((tag) => attribute(tag, 'property')).filter((value) => value?.startsWith('og:')));

    if (titleTags.length === 0) add('error', `${page.file}: missing <title>`);
    if (titleTags.length > 1) add('error', `${page.file}: multiple <title> elements`);
    if (descriptionTags.length === 0) add('warning', `${page.file}: missing meta description`);
    if (descriptionTags.length > 1) add('warning', `${page.file}: multiple meta descriptions`);
    if (canonicalTags.length === 0) add('warning', `${page.file}: missing canonical`);
    if (canonicalTags.length > 1) add('error', `${page.file}: multiple canonical links`);
    if (robotsTags.some((tag) => /noindex/i.test(attribute(tag, 'content') || ''))) add('error', `${page.file}: approved page contains noindex`);
    for (const required of ['og:title', 'og:description', 'og:url', 'og:image']) {
      if (!ogTags.has(required)) add('warning', `${page.file}: missing ${required}`);
    }

    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count === 0) add('warning', `${page.file}: missing H1`);
    if (h1Count > 1) add('warning', `${page.file}: multiple H1 elements (${h1Count})`);

    if (title) titleMap.set(title, [...(titleMap.get(title) || []), page.file]);
    const description = descriptionTags[0] ? attribute(descriptionTags[0], 'content') : null;
    if (description) descriptionMap.set(description, [...(descriptionMap.get(description) || []), page.file]);

    if (canonicalTags[0]) {
      const canonical = attribute(canonicalTags[0], 'href');
      try {
        const parsed = new URL(canonical, baseOrigin);
        if (parsed.protocol !== 'https:' || parsed.origin !== baseOrigin) add('error', `${page.file}: canonical is not production HTTPS: ${canonical}`);
        if (/netlify\.app|localhost|127\.0\.0\.1/i.test(canonical)) add('error', `${page.file}: preview/local canonical: ${canonical}`);
        canonicalMap.set(parsed.href, [...(canonicalMap.get(parsed.href) || []), page.file]);
      } catch {
        add('error', `${page.file}: malformed canonical: ${canonical}`);
      }
    }

    for (const tag of tags(html, 'a')) {
      const href = attribute(tag, 'href');
      if (!href) continue;
      const targetFile = resolveLocalTarget(href, page.file, routeToFile);
      if (targetFile && !fs.existsSync(path.join(rootDir, targetFile))) {
        add('error', `${page.file}: broken local link ${href}`);
      }
    }
    for (const tag of tags(html, 'img')) {
      const src = attribute(tag, 'src');
      if (!hasAttribute(tag, 'alt') && !/^(?:https?:|data:|blob:)/i.test(src || '')) add('warning', `${page.file}: image missing alt (${src || 'missing src'})`);
      const targetFile = src && resolveLocalTarget(src, page.file, routeToFile);
      if (targetFile && !fs.existsSync(path.join(rootDir, targetFile))) add('error', `${page.file}: broken local image ${src}`);
    }

    for (const block of jsonLdBlocks(html)) {
      let parsed;
      try {
        parsed = JSON.parse(block);
      } catch (error) {
        add('error', `${page.file}: invalid JSON-LD (${error.message})`);
        continue;
      }

      walkJsonLd(parsed, (entity) => {
        const types = typeNames(entity);
        for (const [field, value] of Object.entries(entity)) {
          if (!jsonLdUrlFields.has(field)) continue;
          const values = Array.isArray(value) ? value : [value];
          for (const urlValue of values) {
            if (typeof urlValue !== 'string') continue;
            if (!isValidHttpUrl(urlValue)) add('error', page.file + ': invalid JSON-LD ' + field + ' URL ' + urlValue);
            if (hasPreviewOrLocalHost(urlValue)) add('error', page.file + ': preview/local JSON-LD ' + field + ' URL ' + urlValue);
          }
        }

        for (const [field, expectedId] of [
          ['organizer', expectedChurchId],
          ['worksFor', expectedChurchId],
          ['publisher', expectedChurchId],
          ['about', expectedChurchId],
          ['isPartOf', expectedWebsiteId]
        ]) {
          if (entity[field]?.['@id'] && entity[field]['@id'] !== expectedId) {
            add('error', page.file + ': inconsistent shared ' + field + ' @id ' + entity[field]['@id']);
          }
        }

        if (types.has('Event')) {
          const eventDate = entity.endDate || entity.startDate;
          if (typeof eventDate === 'string' && !Number.isNaN(Date.parse(eventDate)) && Date.parse(eventDate) < Date.now()) {
            add('error', `${page.file}: stale Event schema date ${eventDate}`);
          }
        }

        if (entity.email !== undefined && !isValidEmail(entity.email)) {
          add('error', `${page.file}: malformed JSON-LD email ${entity.email}`);
        }

        if (!isOrganizationEntity(entity)) return;
        organizationEntities.push({ page: page.file, entity });

        if (entity.name && entity.name === expectedChurchName) {
          if (entity['@id'] && entity['@id'] !== expectedChurchId) {
            add('error', `${page.file}: organization uses wrong @id ${entity['@id']}`);
          }
          if (entity.url && entity.url !== expectedChurchUrl && entity.url !== baseOrigin) {
            add('error', `${page.file}: organization uses wrong URL ${entity.url}`);
          }
          if (entity.telephone && entity.telephone !== expectedChurchPhone) {
            add('error', `${page.file}: organization uses conflicting phone ${entity.telephone}`);
          }
        }

        for (const field of ['url', '@id']) {
          if (typeof entity[field] !== 'string') continue;
          if (hasPreviewOrLocalHost(entity[field])) add('error', `${page.file}: organization has preview/local ${field} ${entity[field]}`);
          if (field === 'url' && !isValidHttpUrl(entity[field])) add('error', `${page.file}: organization has invalid URL ${entity[field]}`);
        }

        if (entity.sameAs !== undefined) {
          const sameAsValues = Array.isArray(entity.sameAs) ? entity.sameAs : [entity.sameAs];
          for (const sameAs of sameAsValues) {
            if (!isValidHttpUrl(sameAs) || hasPreviewOrLocalHost(sameAs)) {
              add('error', `${page.file}: invalid JSON-LD sameAs URL ${sameAs}`);
            }
          }
        }

        if (hasPlaceholderPhone(entity.telephone)) {
          add('error', `${page.file}: placeholder organization phone ${entity.telephone}`);
        }
      });
    }
  }

  for (const [value, files] of titleMap) if (files.length > 1) add('warning', `Duplicate title: "${value}" (${files.join(', ')})`);
  for (const [value, files] of descriptionMap) if (files.length > 1) add('warning', `Duplicate description (${files.join(', ')})`);
  for (const [value, files] of canonicalMap) if (files.length > 1) add('warning', `Duplicate canonical ${value} (${files.join(', ')})`);

  const primaryOrganizationByName = new Map();
  for (const { page, entity } of organizationEntities) {
    const name = entity.name || '(unnamed organization)';
    const fingerprint = JSON.stringify({
      name: entity.name || null,
      url: entity.url || null,
      telephone: entity.telephone || null,
      email: entity.email || null,
      sameAs: entity.sameAs || null
    });
    const existing = primaryOrganizationByName.get(name);
    if (existing && existing.fingerprint !== fingerprint) {
      add('error', `Conflicting primary organization entities for "${name}" (${existing.page}, ${page})`);
    } else if (existing) {
      add('warning', `Duplicate primary organization entity for "${name}" (${existing.page}, ${page})`);
    } else {
      primaryOrganizationByName.set(name, { page, fingerprint });
    }
  }

  infos.push(`Audited ${approved.length} approved indexable routes.`);
  infos.push(`Sitemap contains ${sitemapUrls.length} URLs.`);
}

for (const [label, entries] of [['ERROR', errors], ['WARNING', warnings], ['INFO', infos]]) {
  console.log(`\n${label} (${entries.length})`);
  for (const entry of entries) console.log(`- ${entry}`);
}

if (errors.length > 0) process.exitCode = 1;
