import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

interface InventoryPage {
  htmlPath: string;
  isFullDocument: boolean;
}

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterConfig {
  cta: {
    links: FooterLink[];
  };
  resources: FooterLink[];
  legal: FooterLink[];
  social: FooterLink[];
  visit: {
    directionsUrl: string;
  };
}

const inventoryPath = path.resolve(__dirname, '..', 'data', 'html-pages-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as { pages: InventoryPage[] };

const footerConfigPath = path.resolve(__dirname, '..', '..', 'config', 'site-footer.config.json');
const footerConfig = JSON.parse(fs.readFileSync(footerConfigPath, 'utf8')) as FooterConfig;

const FOOTER_ROUTES = inventory.pages
  .filter((page) => page.isFullDocument)
  .map((page) => page.htmlPath)
  .filter((htmlPath) => !htmlPath.startsWith('admin/'));

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isSpecialHref(href: string): boolean {
  return /^(mailto:|tel:|#)/i.test(href);
}

function internalTargetExists(href: string): boolean {
  const cleanHref = href.split('#')[0].split('?')[0].replace(/^\/+/, '').replace(/^\.\//, '');
  if (!cleanHref) return true;

  const absolute = path.resolve(process.cwd(), cleanHref);
  if (fs.existsSync(absolute)) return true;
  if (fs.existsSync(`${absolute}.html`)) return true;
  if (fs.existsSync(path.join(absolute, 'index.html'))) return true;

  return false;
}

test.describe('Site Footer Rendering', () => {
  for (const route of FOOTER_ROUTES) {
    test(`footer renders via shared component on ${route}`, async ({ page }) => {
      await page.goto(`/${route}`);
      await page.waitForLoadState('domcontentloaded');

      const footer = page.locator('footer[data-site-footer="true"]');
      await expect(footer, `Missing shared footer on ${route}`).toBeVisible();
    });
  }
});

test.describe('Site Footer Config Integrity', () => {
  test('all configured links are valid', async () => {
    const links: FooterLink[] = [
      ...footerConfig.cta.links,
      ...footerConfig.resources,
      ...footerConfig.legal,
      { label: 'Get Directions', href: footerConfig.visit.directionsUrl, external: true },
      ...footerConfig.social
    ];

    for (const link of links) {
      expect(link.label).toBeTruthy();
      expect(link.href).toBeTruthy();

      if (isSpecialHref(link.href)) {
        continue;
      }

      if (isExternalHref(link.href)) {
        expect(link.href.startsWith('https://')).toBeTruthy();
        continue;
      }

      expect(internalTargetExists(link.href), `Missing internal route: ${link.href}`).toBeTruthy();
    }
  });

  test('social icons render with aria-labels', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');

    const socialLinks = page.locator('footer[data-site-footer="true"] .site-footer__social-link');
    await expect(socialLinks).toHaveCount(footerConfig.social.length);

    const socialCount = await socialLinks.count();
    for (let index = 0; index < socialCount; index += 1) {
      const link = socialLinks.nth(index);
      await expect(link).toHaveAttribute('aria-label', /.+/);
    }
  });
});
