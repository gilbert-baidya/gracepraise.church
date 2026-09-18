import { test, expect } from '@playwright/test';

const FOOTER_ROUTES = [
  'index.html', 'about.html', 'beliefs.html', 'bible-reader.html', 'calendar.html',
  'children-devotion.html', 'contact.html', 'core-values.html', 'couples-devotion.html',
  'daily-devotion.html', 'family-devotion.html', 'fasting-21days.html', 'fasting-30days.html',
  'fasting-40days.html', 'gallery.html', 'give.html', 'gratitude-fasting.html', 'history.html',
  'leadership.html', 'lent-fasting.html', 'ministries.html', 'mission.html', 'pastor/index.html',
  'plan-visit.html', 'position-papers.html', 'prayer-request.html', 'privacy-policy.html',
  'sms-opt-in.html', 'songbook.html', 'terms-conditions.html', 'testimonies.html',
  'youth-devotion.html', 'ministries/index.html', 'ministries/bible-study.html',
  'ministries/community-development.html', 'ministries/homeless-ministry.html',
  'ministries/hospital-ministry.html', 'ministries/kids-ministry.html',
  'ministries/men-fellowship.html', 'ministries/mission-outreach.html',
  'ministries/prison-ministry.html', 'ministries/support-missionaries.html',
  'ministries/worship-ministry.html', 'ministries/youth-ministry.html',
  'kids/games/index.html', 'youth/games/index.html'
];

const REPRESENTATIVE_ROUTES = [
  'index.html',
  'about.html',
  'contact.html',
  'testimonies.html',
  'pastor/index.html',
  'ministries/bible-study.html',
  'kids/games/index.html'
];

test.describe('V10 shared footer rendering', () => {
  for (const route of FOOTER_ROUTES) {
    test(`renders one shared footer on ${route}`, async ({ page }) => {
      await page.goto(`/${route}`);
      await page.waitForLoadState('domcontentloaded');

      const footer = page.locator('footer.site-footer');
      await expect(footer, `Missing shared V10 footer on ${route}`).toHaveCount(1);
      await expect(footer).toBeVisible();
      await expect(footer.locator('.sacred-footer__logo')).toHaveJSProperty('complete', true);
      await expect(footer.locator('.sacred-footer__logo')).toHaveJSProperty('naturalWidth', 192);
      await expect(footer.locator('#footer-auto-year')).toHaveText(String(new Date().getFullYear()));
    });
  }
});

test.describe('V10 shared footer behavior', () => {
  for (const route of REPRESENTATIVE_ROUTES) {
    test(`resolves internal links from ${route}`, async ({ page, request }) => {
      await page.goto(`/${route}`);
      await page.waitForLoadState('domcontentloaded');

      const links = await page.locator('footer.site-footer a[href]').evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.href)
          .filter((href) => href.startsWith(location.origin))
      );

      for (const href of [...new Set(links)]) {
        const response = await request.get(href);
        expect(response.ok(), `Broken footer link on ${route}: ${href}`).toBeTruthy();
      }
    });

    test(`has no horizontal overflow at mobile width on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${route}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('footer.site-footer')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    });
  }

  test('renders labelled social and legal links', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');
    const footer = page.locator('footer.site-footer');
    await expect(footer.locator('.footer-social-link')).toHaveCount(3);
    await expect(footer.locator('.footer-legal-link')).toHaveCount(2);

    for (const link of await footer.locator('.footer-social-link').all()) {
      await expect(link).toHaveAttribute('aria-label', /.+/);
    }
  });
});
